package dev.sogki.rpmanager.server.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;

public final class DiscordStatusService {
  private static final Pattern LEGACY_AMP = Pattern.compile("(?i)&[0-9A-FK-OR]");
  private static final Pattern SECTION_COLORS = Pattern.compile("\u00A7[0-9A-FK-OR]", Pattern.CASE_INSENSITIVE);
  private static final URI BASE = URI.create("https://discord.com/api/v10");

  private final Logger logger;
  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
  private CachedKeys cachedKeys;
  private boolean warnedMissingSupabaseConfig;
  private boolean warnedMissingTableKeys;
  private final AtomicLong gatewaySeq = new AtomicLong(-1L);
  private WebSocket gatewaySocket;
  private ScheduledExecutorService heartbeatExecutor;
  private boolean gatewayDesired;
  private MinecraftServer gatewayServer;
  private ServerFeatureConfig gatewayCfg;
  private long lastHeartbeatAckMs;

  public DiscordStatusService(Logger logger) {
    this.logger = logger;
  }

  public void announceOnline(MinecraftServer server, ServerFeatureConfig cfg) {
    send(server, cfg, cfg.messages.discordOnlineTitle, cfg.messages.discordOnlineDescription, cfg.discord.onlineColor);
  }

  public void announceOffline(MinecraftServer server, ServerFeatureConfig cfg) {
    send(server, cfg, cfg.messages.discordOfflineTitle, cfg.messages.discordOfflineDescription, cfg.discord.offlineColor);
  }

  public boolean sendTest(MinecraftServer server, ServerFeatureConfig cfg) {
    if (cfg == null || cfg.discord == null || cfg.messages == null) return false;
    return send(server, cfg, cfg.messages.discordTestTitle, cfg.messages.discordTestDescription, cfg.discord.onlineColor);
  }

  public boolean sendCustomEmbed(MinecraftServer server,
                                 ServerFeatureConfig cfg,
                                 String titleTemplate,
                                 String descriptionTemplate,
                                 int color,
                                 Map<String, String> extraValues) {
    if (cfg == null || cfg.discord == null || !cfg.discord.enabled) return false;
    try {
      BotKeys keys = resolveBotKeys(cfg);
      if (keys == null || keys.token.isBlank() || keys.channelId.isBlank()) return false;
      String botToken = normalizeBotToken(keys.token);
      if (botToken.isBlank()) return false;

      Map<String, String> values = TemplateEngine.baseMap(server, null, cfg.brand);
      if (extraValues != null && !extraValues.isEmpty()) values.putAll(extraValues);
      String title = stripMinecraftFormatting(TemplateEngine.render(titleTemplate, values));
      String description = stripMinecraftFormatting(TemplateEngine.render(descriptionTemplate, values));
      String footer = cfg.messages == null
        ? ""
        : stripMinecraftFormatting(TemplateEngine.render(cfg.messages.discordEmbedFooter, values));
      if (title.isBlank() && description.isBlank()) return false;

      URI target = BASE.resolve("channels/" + keys.channelId + "/messages");
      String json = buildEmbedJson(title, description, footer, color);
      HttpRequest request = HttpRequest.newBuilder(target)
        .timeout(Duration.ofMillis(Math.max(1000, cfg.discord.timeoutMs)))
        .header("Authorization", "Bot " + botToken)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        logger.warn("[SogkiCobblemon] Discord custom embed failed ({}): {}", response.statusCode(), trim(response.body(), 200));
        return false;
      }
      return true;
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Discord custom embed error: {}", e.getMessage());
      return false;
    }
  }

  public void startBotRuntime(MinecraftServer server, ServerFeatureConfig cfg) {
    gatewayServer = server;
    gatewayCfg = cfg;
    if (cfg == null || cfg.discord == null || !cfg.discord.enabled || !cfg.discord.gatewayEnabled) {
      stopBotRuntime();
      return;
    }
    gatewayDesired = true;
    connectGatewayIfNeeded();
  }

  public void stopBotRuntime() {
    gatewayDesired = false;
    closeGateway();
  }

  public void restartBotRuntime(MinecraftServer server, ServerFeatureConfig cfg) {
    stopBotRuntime();
    startBotRuntime(server, cfg);
  }

  private boolean send(MinecraftServer server, ServerFeatureConfig cfg, String titleTemplate, String descTemplate, int color) {
    if (cfg == null || cfg.discord == null || cfg.messages == null || !cfg.discord.enabled) return false;

    try {
      BotKeys keys = resolveBotKeys(cfg);
      if (keys == null || keys.token.isBlank() || keys.channelId.isBlank()) return false;
      String botToken = normalizeBotToken(keys.token);
      if (botToken.isBlank()) return false;

      Map<String, String> values = TemplateEngine.baseMap(server, null, cfg.brand);
      if (cfg.discord.maxOnlineOverride > 0) {
        values.put("maxOnline", String.valueOf(cfg.discord.maxOnlineOverride));
      }
      String title = stripMinecraftFormatting(TemplateEngine.render(titleTemplate, values));
      String description = stripMinecraftFormatting(TemplateEngine.render(descTemplate, values));
      String footer = stripMinecraftFormatting(TemplateEngine.render(cfg.messages.discordEmbedFooter, values));
      if (title.isBlank() && description.isBlank()) return false;

      URI target = BASE.resolve("channels/" + keys.channelId + "/messages");
      String json = buildEmbedJson(title, description, footer, color);

      HttpRequest request = HttpRequest.newBuilder(target)
        .timeout(Duration.ofMillis(Math.max(1000, cfg.discord.timeoutMs)))
        .header("Authorization", "Bot " + botToken)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
        .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        logger.warn("[SogkiCobblemon] Discord status post failed ({}): {}", response.statusCode(), trim(response.body(), 200));
        return false;
      }
      return true;
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Discord status post error: {}", e.getMessage());
      return false;
    }
  }

  private BotKeys resolveBotKeys(ServerFeatureConfig cfg) {
    long now = System.currentTimeMillis();
    if (cachedKeys != null && now < cachedKeys.expiresAtMs) return cachedKeys.keys;

    String supabaseUrl = firstNonBlank(
      cfg.discord.supabaseUrl,
      System.getenv("COBBLEBOT_SUPABASE_URL"),
      System.getenv("SUPABASE_URL")
    );
    String serviceRole = firstNonBlank(
      cfg.discord.serviceRoleKey,
      System.getenv("COBBLEBOT_SUPABASE_SERVICE_ROLE_KEY"),
      System.getenv("SUPABASE_SERVICE_ROLE_KEY")
    );
    if (supabaseUrl == null || serviceRole == null) {
      if (!warnedMissingSupabaseConfig) {
        warnedMissingSupabaseConfig = true;
        logger.warn(
          "[SogkiCobblemon] Discord status disabled: missing Supabase config. Set discord.supabaseUrl + discord.serviceRoleKey in discord.json or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars."
        );
      }
      return null;
    }

    try {
      String base = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
      URI uri = URI.create(base + "/rest/v1/keys?select=key,value&key=in.(cobblebot_token,cobblebot_channel_id)");
      HttpRequest request = HttpRequest.newBuilder(uri)
        .timeout(Duration.ofMillis(Math.max(1000, cfg.discord.timeoutMs)))
        .header("apikey", serviceRole)
        .header("Authorization", "Bearer " + serviceRole)
        .header("Accept", "application/json")
        .GET()
        .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        logger.warn("[SogkiCobblemon] Failed to fetch cobblebot keys from table ({}).", response.statusCode());
        return null;
      }

      JsonElement root = JsonParser.parseString(response.body());
      if (!(root instanceof JsonArray array)) return null;
      String token = "";
      String channelId = "";
      for (JsonElement element : array) {
        if (!(element instanceof JsonObject obj)) continue;
        String key = optionalString(obj, "key").orElse("");
        String value = optionalString(obj, "value").orElse("");
        if ("cobblebot_token".equals(key)) token = value;
        if ("cobblebot_channel_id".equals(key)) channelId = value;
      }
      if (token.isBlank() || channelId.isBlank()) {
        if (!warnedMissingTableKeys) {
          warnedMissingTableKeys = true;
          logger.warn(
            "[SogkiCobblemon] Discord status disabled: missing keys table values. Ensure 'cobblebot_token' and 'cobblebot_channel_id' exist in public.keys."
          );
        }
        return null;
      }
      warnedMissingTableKeys = false;
      BotKeys keys = new BotKeys(token, channelId);
      long ttl = Math.max(30, cfg.discord.keyCacheSeconds) * 1000L;
      cachedKeys = new CachedKeys(keys, now + ttl);
      warnedMissingSupabaseConfig = false;
      return keys;
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to query cobblebot keys table: {}", e.getMessage());
      return null;
    }
  }

  private Optional<String> optionalString(JsonObject obj, String field) {
    if (obj == null || field == null || !obj.has(field) || obj.get(field).isJsonNull()) return Optional.empty();
    try {
      String value = obj.get(field).getAsString();
      return value == null || value.isBlank() ? Optional.empty() : Optional.of(value);
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  private String stripMinecraftFormatting(String raw) {
    if (raw == null) return "";
    String out = LEGACY_AMP.matcher(raw).replaceAll("");
    return SECTION_COLORS.matcher(out).replaceAll("");
  }

  private String trim(String value, int max) {
    if (value == null) return "";
    return value.length() <= max ? value : value.substring(0, max);
  }

  private String buildEmbedJson(String title, String description, String footer, int color) {
    StringBuilder sb = new StringBuilder(256);
    sb.append("{\"embeds\":[{");
    boolean wrote = false;
    if (title != null && !title.isBlank()) {
      sb.append("\"title\":\"").append(escapeJson(title)).append("\"");
      wrote = true;
    }
    if (description != null && !description.isBlank()) {
      if (wrote) sb.append(',');
      sb.append("\"description\":\"").append(escapeJson(description)).append("\"");
      wrote = true;
    }
    if (wrote) sb.append(',');
    sb.append("\"color\":").append(Math.max(0, color)).append(',');
    sb.append("\"timestamp\":\"").append(Instant.now().toString()).append("\"");
    if (footer != null && !footer.isBlank()) {
      sb.append(",\"footer\":{\"text\":\"").append(escapeJson(footer)).append("\"}");
    }
    sb.append("}]}");
    return sb.toString();
  }

  private String firstNonBlank(String... values) {
    if (values == null) return null;
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return null;
  }

  private String normalizeBotToken(String raw) {
    if (raw == null) return "";
    String token = raw.trim().replace("\r", "").replace("\n", "");
    if (token.regionMatches(true, 0, "Bot ", 0, 4)) {
      token = token.substring(4).trim();
    }
    return token;
  }

  private String escapeJson(String text) {
    StringBuilder sb = new StringBuilder(text.length() + 16);
    for (int i = 0; i < text.length(); i++) {
      char c = text.charAt(i);
      switch (c) {
        case '"' -> sb.append("\\\"");
        case '\\' -> sb.append("\\\\");
        case '\n' -> sb.append("\\n");
        case '\r' -> sb.append("\\r");
        case '\t' -> sb.append("\\t");
        default -> {
          if (c < 0x20) sb.append(' ');
          else sb.append(c);
        }
      }
    }
    return sb.toString();
  }

  private record BotKeys(String token, String channelId) {
  }

  private record CachedKeys(BotKeys keys, long expiresAtMs) {
  }

  private void connectGatewayIfNeeded() {
    if (!gatewayDesired) return;
    if (gatewaySocket != null) return;
    if (gatewayCfg == null) return;

    try {
      BotKeys keys = resolveBotKeys(gatewayCfg);
      if (keys == null || keys.token.isBlank()) return;
      String botToken = normalizeBotToken(keys.token);
      if (botToken.isBlank()) return;
      String gatewayUrl = resolveGatewayUrl(botToken, gatewayCfg);
      if (gatewayUrl == null || gatewayUrl.isBlank()) return;
      URI uri = URI.create(gatewayUrl + (gatewayUrl.contains("?") ? "&" : "?") + "v=10&encoding=json");
      gatewaySocket = httpClient.newWebSocketBuilder()
        .connectTimeout(Duration.ofMillis(Math.max(1000, gatewayCfg.discord.timeoutMs)))
        .buildAsync(uri, new GatewayListener(botToken))
        .join();
      logger.info("[SogkiCobblemon] Discord gateway connected.");
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Discord gateway connect failed: {}", e.getMessage());
      scheduleReconnect();
    }
  }

  private String resolveGatewayUrl(String botToken, ServerFeatureConfig cfg) {
    try {
      HttpRequest request = HttpRequest.newBuilder(BASE.resolve("gateway/bot"))
        .timeout(Duration.ofMillis(Math.max(1000, cfg.discord.timeoutMs)))
        .header("Authorization", "Bot " + botToken.trim())
        .header("Content-Type", "application/json")
        .GET()
        .build();
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        logger.warn("[SogkiCobblemon] Discord gateway URL fetch failed ({}): {}", response.statusCode(), trim(response.body(), 160));
        return null;
      }
      JsonElement root = JsonParser.parseString(response.body());
      if (!(root instanceof JsonObject obj)) return null;
      return optionalString(obj, "url").orElse(null);
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to resolve Discord gateway URL: {}", e.getMessage());
      return null;
    }
  }

  private void handleGatewayPayload(String payload, String token) {
    if (payload == null || payload.isBlank()) return;
    try {
      JsonElement root = JsonParser.parseString(payload);
      if (!(root instanceof JsonObject obj)) return;
      if (obj.has("s") && !obj.get("s").isJsonNull()) {
        try {
          gatewaySeq.set(obj.get("s").getAsLong());
        } catch (Exception ignored) {
        }
      }
      int op = obj.has("op") ? obj.get("op").getAsInt() : -1;
      switch (op) {
        case 10 -> onHello(obj, token);
        case 11 -> lastHeartbeatAckMs = System.currentTimeMillis();
        case 7, 9 -> {
          logger.warn("[SogkiCobblemon] Discord gateway requested reconnect (op={}).", op);
          closeGateway();
          scheduleReconnect();
        }
        default -> {
        }
      }
    } catch (Exception ignored) {
    }
  }

  private void onHello(JsonObject hello, String token) {
    try {
      JsonObject d = hello.getAsJsonObject("d");
      long interval = d != null && d.has("heartbeat_interval") ? d.get("heartbeat_interval").getAsLong() : 45000L;
      if (heartbeatExecutor != null) heartbeatExecutor.shutdownNow();
      heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sogki-discord-heartbeat");
        t.setDaemon(true);
        return t;
      });
      lastHeartbeatAckMs = System.currentTimeMillis();
      heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, 0, Math.max(5000L, interval), TimeUnit.MILLISECONDS);
      sendIdentify(token);
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Discord HELLO handling failed: {}", e.getMessage());
    }
  }

  private void sendIdentify(String token) {
    if (gatewaySocket == null) return;
    String activity = "Sogki Cobblemon";
    if (gatewayCfg != null && gatewayCfg.discord != null && gatewayCfg.discord.activityText != null && !gatewayCfg.discord.activityText.isBlank()) {
      activity = stripMinecraftFormatting(gatewayCfg.discord.activityText);
    }
    String json = "{\"op\":2,\"d\":{\"token\":\"" + escapeJson(token.trim())
      + "\",\"intents\":0,\"properties\":{\"os\":\"linux\",\"browser\":\"sogki-cobblemon\",\"device\":\"sogki-cobblemon\"},"
      + "\"presence\":{\"status\":\"online\",\"afk\":false,\"since\":null,\"activities\":[{\"name\":\"" + escapeJson(activity) + "\",\"type\":0}]}}}";
    gatewaySocket.sendText(json, true);
  }

  private void sendHeartbeat() {
    try {
      WebSocket socket = gatewaySocket;
      if (socket == null) return;
      long seq = gatewaySeq.get();
      String seqJson = seq >= 0 ? String.valueOf(seq) : "null";
      socket.sendText("{\"op\":1,\"d\":" + seqJson + "}", true);
      long now = System.currentTimeMillis();
      if (lastHeartbeatAckMs > 0 && now - lastHeartbeatAckMs > 120000L) {
        logger.warn("[SogkiCobblemon] Discord heartbeat ACK timeout, reconnecting gateway.");
        closeGateway();
        scheduleReconnect();
      }
    } catch (Exception ignored) {
    }
  }

  private void closeGateway() {
    try {
      if (gatewaySocket != null) {
        gatewaySocket.sendClose(WebSocket.NORMAL_CLOSURE, "bye");
      }
    } catch (Exception ignored) {
    } finally {
      gatewaySocket = null;
    }
    if (heartbeatExecutor != null) {
      heartbeatExecutor.shutdownNow();
      heartbeatExecutor = null;
    }
  }

  private void scheduleReconnect() {
    if (!gatewayDesired) return;
    if (heartbeatExecutor != null) {
      heartbeatExecutor.shutdownNow();
    }
    heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
      Thread t = new Thread(r, "sogki-discord-reconnect");
      t.setDaemon(true);
      return t;
    });
    heartbeatExecutor.schedule(this::connectGatewayIfNeeded, 15, TimeUnit.SECONDS);
  }

  private final class GatewayListener implements WebSocket.Listener {
    private final String token;
    private final StringBuilder buffer = new StringBuilder();

    private GatewayListener(String token) {
      this.token = token;
    }

    @Override
    public void onOpen(WebSocket webSocket) {
      WebSocket.Listener.super.onOpen(webSocket);
      webSocket.request(1);
    }

    @Override
    public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
      buffer.append(data);
      if (last) {
        String payload = buffer.toString();
        buffer.setLength(0);
        handleGatewayPayload(payload, token);
      }
      webSocket.request(1);
      return null;
    }

    @Override
    public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
      logger.warn("[SogkiCobblemon] Discord gateway closed ({}): {}", statusCode, reason);
      gatewaySocket = null;
      if (gatewayDesired) scheduleReconnect();
      return null;
    }

    @Override
    public void onError(WebSocket webSocket, Throwable error) {
      logger.warn("[SogkiCobblemon] Discord gateway error: {}", error == null ? "unknown" : error.getMessage());
      gatewaySocket = null;
      if (gatewayDesired) scheduleReconnect();
    }
  }
}
