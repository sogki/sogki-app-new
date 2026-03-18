package dev.sogki.rpmanager.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class RpManagerConfig {
  public static final String DEFAULT_ACTIVE_ENDPOINT = "https://sogki.dev/api/resourcepacks/active";
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path CONFIG_PATH = FabricLoader.getInstance().getConfigDir().resolve("sogki-rp-manager.json");

  public boolean promptOnJoin = true;
  public String activeEndpoint = DEFAULT_ACTIVE_ENDPOINT;

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
  }
}
