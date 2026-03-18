package dev.sogki.rpmanager.server.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class ServerConfigManager {
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path JSON_PATH = BASE_DIR.resolve("features.json");
  private static final Path CHAT_YML_PATH = BASE_DIR.resolve("chat.yml");
  private static final Path TABLIST_YML_PATH = BASE_DIR.resolve("tablist.yml");
  private static final Path SIDEBAR_YML_PATH = BASE_DIR.resolve("sidebar.yml");
  private static final Path ANNOUNCEMENTS_JSON_PATH = BASE_DIR.resolve("announcements.json");
  private static final Path AREA_JSON_PATH = BASE_DIR.resolve("area.json");
  private static final Path STREAK_JSON_PATH = BASE_DIR.resolve("streak.json");
  private static final Path REGIONS_JSON_PATH = BASE_DIR.resolve("regions.json");
  private static final Path COBBLETOWN_JSON_PATH = BASE_DIR.resolve("cobbletown.json");
  private static final Path MESSAGES_JSON_PATH = BASE_DIR.resolve("messages.json");

  private ServerFeatureConfig config;

  public ServerConfigManager() {
    this.config = new ServerFeatureConfig();
  }

  public synchronized ServerFeatureConfig get() {
    return config;
  }

  public synchronized ServerFeatureConfig reload() {
    ServerFeatureConfig loaded = loadJson();
    applyFeatureSections(loaded);
    TemplateConfig templates = loadTemplates();
    applyTemplates(loaded, templates);
    loaded = applyRemoteOverrides(loaded);
    ensureDefaults(loaded);
    this.config = loaded;
    return loaded;
  }

  private ServerFeatureConfig loadJson() {
    try {
      Files.createDirectories(BASE_DIR);
      if (Files.notExists(JSON_PATH)) {
        ServerFeatureConfig defaults = defaultsWithRewards();
        Files.writeString(
          JSON_PATH,
          GSON.toJson(Map.of("remoteConfig", defaults.remoteConfig), Map.class),
          StandardCharsets.UTF_8
        );
        return defaults;
      }
      String raw = Files.readString(JSON_PATH, StandardCharsets.UTF_8);
      ServerFeatureConfig parsed = GSON.fromJson(raw, ServerFeatureConfig.class);
      return parsed == null ? defaultsWithRewards() : parsed;
    } catch (Exception ignored) {
      return defaultsWithRewards();
    }
  }

  private void applyFeatureSections(ServerFeatureConfig cfg) {
    ServerFeatureConfig defaults = defaultsWithRewards();
    cfg.announcements = loadJsonSection(ANNOUNCEMENTS_JSON_PATH, defaults.announcements, ServerFeatureConfig.AnnouncementConfig.class);
    cfg.area = loadJsonSection(AREA_JSON_PATH, defaults.area, ServerFeatureConfig.AreaConfig.class);
    cfg.streak = loadJsonSection(STREAK_JSON_PATH, defaults.streak, ServerFeatureConfig.StreakConfig.class);
    cfg.regions = loadJsonSection(REGIONS_JSON_PATH, defaults.regions, ServerFeatureConfig.RegionConfig.class);
    cfg.cobbletown = loadJsonSection(COBBLETOWN_JSON_PATH, defaults.cobbletown, ServerFeatureConfig.CobbletownConfig.class);
    cfg.messages = loadJsonSection(MESSAGES_JSON_PATH, defaults.messages, ServerFeatureConfig.MessagesConfig.class);
  }

  private <T> T loadJsonSection(Path path, T defaults, Class<T> type) {
    try {
      createJsonIfMissing(path, defaults);
      String raw = Files.readString(path, StandardCharsets.UTF_8);
      T parsed = GSON.fromJson(raw, type);
      return parsed == null ? defaults : parsed;
    } catch (Exception ignored) {
      return defaults;
    }
  }

  private void createJsonIfMissing(Path path, Object defaults) throws IOException {
    if (Files.exists(path)) return;
    Files.writeString(path, GSON.toJson(defaults), StandardCharsets.UTF_8);
  }

  private TemplateConfig loadTemplates() {
    TemplateConfig templates = new TemplateConfig();
    try {
      Files.createDirectories(BASE_DIR);
      createYamlIfMissing(
        CHAT_YML_PATH,
        "chat:\n  includePlayerInFormat: " + templates.chat.includePlayerInFormat + "\n  format: \"" + escapeYaml(templates.chat.format) + "\"\n"
      );
      createYamlIfMissing(
        TABLIST_YML_PATH,
        "tablist:\n  realtimeCoordinates: " + templates.tablist.realtimeCoordinates + "\n  header:\n"
          + yamlLines(templates.tablist.header) + "  footer:\n" + yamlLines(templates.tablist.footer)
      );
      createYamlIfMissing(
        SIDEBAR_YML_PATH,
        "sidebar:\n  realtimeCoordinates: " + templates.sidebar.realtimeCoordinates + "\n  title: \""
          + escapeYaml(templates.sidebar.title) + "\"\n  lines:\n" + yamlLines(templates.sidebar.lines)
      );

      String chatRaw = Files.readString(CHAT_YML_PATH, StandardCharsets.UTF_8);
      String tabRaw = Files.readString(TABLIST_YML_PATH, StandardCharsets.UTF_8);
      String sideRaw = Files.readString(SIDEBAR_YML_PATH, StandardCharsets.UTF_8);

      String chatFmt = valueForKey(chatRaw, "format");
      if (chatFmt != null && !chatFmt.isBlank()) templates.chat.format = chatFmt;
      String includePlayer = valueForKey(chatRaw, "includePlayerInFormat");
      if (includePlayer != null) templates.chat.includePlayerInFormat = Boolean.parseBoolean(includePlayer.trim());

      List<String> headerList = listForKey(tabRaw, "header");
      if (!headerList.isEmpty()) {
        templates.tablist.header = headerList;
      } else {
        String header = valueForKey(tabRaw, "header");
        if (header != null) templates.tablist.header = List.of(header);
      }

      List<String> footerList = listForKey(tabRaw, "footer");
      if (!footerList.isEmpty()) {
        templates.tablist.footer = footerList;
      } else {
        String footer = valueForKey(tabRaw, "footer");
        if (footer != null) templates.tablist.footer = List.of(footer);
      }
      String tabRealtime = valueForKey(tabRaw, "realtimeCoordinates");
      if (tabRealtime != null) templates.tablist.realtimeCoordinates = Boolean.parseBoolean(tabRealtime);

      String title = valueForKey(sideRaw, "title");
      if (title != null && !title.isBlank()) templates.sidebar.title = title;
      String sidebarRealtime = valueForKey(sideRaw, "realtimeCoordinates");
      if (sidebarRealtime != null) templates.sidebar.realtimeCoordinates = Boolean.parseBoolean(sidebarRealtime);
      List<String> parsedLines = listForKey(sideRaw, "lines");
      if (!parsedLines.isEmpty()) templates.sidebar.lines = parsedLines;
    } catch (Exception ignored) {
    }
    return templates;
  }

  private void createYamlIfMissing(Path path, String defaults) throws IOException {
    if (Files.exists(path)) return;
    Files.writeString(path, defaults, StandardCharsets.UTF_8);
  }

  private String yamlLines(List<String> lines) {
    StringBuilder builder = new StringBuilder();
    for (String line : lines) {
      builder.append("    - \"").append(escapeYaml(line)).append("\"\n");
    }
    return builder.toString();
  }

  private String escapeYaml(String value) {
    if (value == null) return "";
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n");
  }

  private String valueForKey(String raw, String key) {
    String[] lines = raw.split("\\r?\\n");
    String prefix = key + ":";
    for (String line : lines) {
      String trimmed = line.trim();
      if (!trimmed.startsWith(prefix)) continue;
      String value = trimmed.substring(prefix.length()).trim();
      return cleanYamlScalar(value);
    }
    return null;
  }

  private List<String> listForKey(String raw, String key) {
    List<String> out = new ArrayList<>();
    String[] lines = raw.split("\\r?\\n");
    boolean inList = false;
    int listIndent = -1;
    for (String line : lines) {
      String trimmed = line.trim();
      if (!inList) {
        if (trimmed.equals(key + ":")) {
          inList = true;
          listIndent = indentCount(line);
        }
        continue;
      }
      if (trimmed.isEmpty()) continue;
      int indent = indentCount(line);
      if (indent <= listIndent) break;
      if (!trimmed.startsWith("-")) continue;
      String value = trimmed.substring(1).trim();
      String clean = cleanYamlScalar(value);
      out.add(clean);
    }
    return out;
  }

  private int indentCount(String line) {
    int i = 0;
    while (i < line.length() && Character.isWhitespace(line.charAt(i))) i++;
    return i;
  }

  private String cleanYamlScalar(String value) {
    if (value == null) return "";
    String out = value.trim();
    if ((out.startsWith("\"") && out.endsWith("\"")) || (out.startsWith("'") && out.endsWith("'"))) {
      out = out.substring(1, out.length() - 1);
    }
    return out
      .replace("\\n", "\n")
      .replace("\\\"", "\"")
      .replace("\\\\", "\\");
  }

  private void applyTemplates(ServerFeatureConfig cfg, TemplateConfig templates) {
    cfg.chat.format = templates.chat.format;
    cfg.chat.includePlayerInFormat = templates.chat.includePlayerInFormat;
    cfg.tablist.header = templates.tablist.header;
    cfg.tablist.footer = templates.tablist.footer;
    cfg.tablist.realtimeCoordinates = templates.tablist.realtimeCoordinates;
    cfg.sidebar.title = templates.sidebar.title;
    cfg.sidebar.lines = templates.sidebar.lines;
    cfg.sidebar.realtimeCoordinates = templates.sidebar.realtimeCoordinates;
  }

  private ServerFeatureConfig applyRemoteOverrides(ServerFeatureConfig cfg) {
    if (cfg.remoteConfig == null || !cfg.remoteConfig.enabled) return cfg;
    if (cfg.remoteConfig.url == null || cfg.remoteConfig.url.isBlank()) return cfg;

    try {
      HttpURLConnection conn = (HttpURLConnection) URI.create(cfg.remoteConfig.url).toURL().openConnection();
      conn.setRequestMethod("GET");
      conn.setConnectTimeout(Math.max(500, cfg.remoteConfig.timeoutMs));
      conn.setReadTimeout(Math.max(1000, cfg.remoteConfig.timeoutMs * 2));
      conn.setRequestProperty("Accept", "application/json");
      int code = conn.getResponseCode();
      InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
      if (stream == null || code < 200 || code >= 300) {
        return cfg.remoteConfig.failOpen ? cfg : defaultsWithRewards();
      }
      String body = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      ServerFeatureConfig remote = GSON.fromJson(body, ServerFeatureConfig.class);
      if (remote == null) return cfg;
      return merge(cfg, remote);
    } catch (Exception ignored) {
      return cfg.remoteConfig.failOpen ? cfg : defaultsWithRewards();
    }
  }

  private ServerFeatureConfig merge(ServerFeatureConfig base, ServerFeatureConfig remote) {
    // Merge via map patching to avoid writing boilerplate for every field.
    Map<String, Object> baseMap = GSON.fromJson(GSON.toJson(base), LinkedHashMap.class);
    Map<String, Object> remoteMap = GSON.fromJson(GSON.toJson(remote), LinkedHashMap.class);
    patch(baseMap, remoteMap);
    return GSON.fromJson(GSON.toJson(baseMap), ServerFeatureConfig.class);
  }

  @SuppressWarnings("unchecked")
  private void patch(Map<String, Object> target, Map<String, Object> src) {
    for (Map.Entry<String, Object> entry : src.entrySet()) {
      String key = entry.getKey();
      Object value = entry.getValue();
      if (value == null) continue;
      Object old = target.get(key);
      if (value instanceof Map<?, ?> vm && old instanceof Map<?, ?> om) {
        patch((Map<String, Object>) om, (Map<String, Object>) vm);
      } else {
        target.put(key, value);
      }
    }
  }

  private ServerFeatureConfig defaultsWithRewards() {
    ServerFeatureConfig cfg = new ServerFeatureConfig();
    cfg.streak.rewards.add(reward(1, "minecraft:experience_bottle", 8, "EXP Bottles"));
    cfg.streak.rewards.add(reward(2, "minecraft:experience_bottle", 12, "EXP Bottles"));
    cfg.streak.rewards.add(reward(3, "minecraft:sugar", 16, "Rare Candy (themed)"));
    cfg.streak.rewards.add(reward(4, "minecraft:amethyst_shard", 6, "Evolution Shards"));
    cfg.streak.rewards.add(reward(5, "minecraft:glowstone_dust", 12, "Training Dust"));
    cfg.streak.rewards.add(reward(6, "minecraft:lapis_lazuli", 20, "Move Tutor Dust"));
    cfg.streak.rewards.add(reward(7, "minecraft:diamond", 2, "Weekly Bonus"));
    return cfg;
  }

  private ServerFeatureConfig.RewardRule reward(int day, String itemId, int count, String label) {
    ServerFeatureConfig.RewardRule rule = new ServerFeatureConfig.RewardRule();
    rule.day = day;
    rule.itemId = itemId;
    rule.count = count;
    rule.label = label;
    ServerFeatureConfig.RewardItem single = new ServerFeatureConfig.RewardItem();
    single.itemId = itemId;
    single.count = count;
    single.label = label;
    rule.items = new java.util.ArrayList<>(java.util.List.of(single));
    return rule;
  }

  private void ensureDefaults(ServerFeatureConfig cfg) {
    if (cfg.brand == null) cfg.brand = "";
    if (cfg.announcements == null) cfg.announcements = new ServerFeatureConfig.AnnouncementConfig();
    if (cfg.area == null) cfg.area = new ServerFeatureConfig.AreaConfig();
    if (cfg.streak == null) cfg.streak = new ServerFeatureConfig.StreakConfig();
    if (cfg.regions == null) cfg.regions = new ServerFeatureConfig.RegionConfig();
    if (cfg.cobbletown == null) cfg.cobbletown = new ServerFeatureConfig.CobbletownConfig();
    if (cfg.chat == null) cfg.chat = new ServerFeatureConfig.ChatConfig();
    if (cfg.tablist == null) cfg.tablist = new ServerFeatureConfig.TablistConfig();
    if (cfg.sidebar == null) cfg.sidebar = new ServerFeatureConfig.SidebarConfig();
    if (cfg.messages == null) cfg.messages = new ServerFeatureConfig.MessagesConfig();
    if (cfg.remoteConfig == null) cfg.remoteConfig = new ServerFeatureConfig.RemoteConfig();
    if (cfg.streak.rewards == null) cfg.streak.rewards = new java.util.ArrayList<>();
    if (cfg.streak.rewards.isEmpty()) cfg.streak.rewards = defaultsWithRewards().streak.rewards;
    for (ServerFeatureConfig.RewardRule reward : cfg.streak.rewards) {
      if (reward == null) continue;
      if (reward.items == null) reward.items = new java.util.ArrayList<>();
    }
    if (cfg.area.towns == null) cfg.area.towns = new java.util.ArrayList<>();
    if (cfg.area.enterDisplay == null) cfg.area.enterDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.area.leaveDisplay == null) cfg.area.leaveDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.area.townDisplay == null) cfg.area.townDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.regions.list == null) cfg.regions.list = new java.util.ArrayList<>();
    if (cfg.cobbletown.towns == null) cfg.cobbletown.towns = new java.util.ArrayList<>();
    if (cfg.tablist.header == null || cfg.tablist.header.isEmpty()) {
      cfg.tablist.header = new java.util.ArrayList<>(java.util.List.of("Online: {online}"));
    }
    if (cfg.tablist.footer == null || cfg.tablist.footer.isEmpty()) {
      cfg.tablist.footer = new java.util.ArrayList<>(java.util.List.of("Have fun in Loafey's Cobblepals"));
    }
    if (cfg.sidebar.lines == null || cfg.sidebar.lines.isEmpty()) {
      cfg.sidebar.lines = new java.util.ArrayList<>(java.util.List.of("Online: {online}", "Dimension: {world}", "Use /claim"));
    }
  }
}
