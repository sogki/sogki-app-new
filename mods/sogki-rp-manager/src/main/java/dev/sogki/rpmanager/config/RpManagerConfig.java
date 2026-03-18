package dev.sogki.rpmanager.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class RpManagerConfig {
  public static final String DEFAULT_ACTIVE_ENDPOINT = "https://sogki.dev/api/resourcepacks/active";
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path CONFIG_PATH = FabricLoader.getInstance().getConfigDir().resolve("sogki-rp-manager.json");

  public boolean promptOnJoin = true;
  public String activeEndpoint = DEFAULT_ACTIVE_ENDPOINT;
  public List<String> promptSeenServers = new ArrayList<>();

  public static RpManagerConfig load() {
    if (Files.notExists(CONFIG_PATH)) {
      RpManagerConfig config = defaults();
      config.save();
      return config;
    }

    try {
      String raw = Files.readString(CONFIG_PATH, StandardCharsets.UTF_8);
      RpManagerConfig config = GSON.fromJson(raw, RpManagerConfig.class);
      if (config == null) return defaults();
      normalize(config);
      return config;
    } catch (Exception ignored) {
      RpManagerConfig fallback = defaults();
      fallback.save();
      return fallback;
    }
  }

  public void save() {
    normalize(this);
    try {
      Files.createDirectories(CONFIG_PATH.getParent());
      Files.writeString(CONFIG_PATH, GSON.toJson(this), StandardCharsets.UTF_8);
    } catch (IOException ignored) {
    }
  }

  public static RpManagerConfig defaults() {
    RpManagerConfig config = new RpManagerConfig();
    normalize(config);
    return config;
  }

  private static void normalize(RpManagerConfig config) {
    if (config.activeEndpoint == null || config.activeEndpoint.isBlank()) {
      config.activeEndpoint = DEFAULT_ACTIVE_ENDPOINT;
    }
    if (config.promptSeenServers == null) {
      config.promptSeenServers = new ArrayList<>();
      return;
    }
    // Keep a stable, de-duplicated, normalized list to avoid config bloat.
    Set<String> unique = new LinkedHashSet<>();
    for (String entry : config.promptSeenServers) {
      if (entry == null) continue;
      String normalized = entry.trim().toLowerCase(Locale.ROOT);
      if (!normalized.isBlank()) unique.add(normalized);
    }
    config.promptSeenServers = new ArrayList<>(unique);
  }

  public boolean hasSeenPromptForServer(String serverKey) {
    if (serverKey == null || serverKey.isBlank()) return false;
    return promptSeenServers.contains(serverKey.trim().toLowerCase(Locale.ROOT));
  }

  public void markPromptSeenForServer(String serverKey) {
    if (serverKey == null || serverKey.isBlank()) return;
    String normalized = serverKey.trim().toLowerCase(Locale.ROOT);
    if (!promptSeenServers.contains(normalized)) {
      promptSeenServers.add(normalized);
    }
  }
}
