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
  public static final String DEFAULT_FIRST_JOIN_MESSAGE = "Welcome to Loafey's Cobblepals!";
  public static final String DEFAULT_RETURNING_JOIN_MESSAGE = "Welcome back to Loafey's Cobblepals!";
  public static final String DEFAULT_FIRST_JOIN_SOUND = "minecraft:entity.player.levelup";
  public static final String DEFAULT_RETURNING_JOIN_SOUND = "minecraft:block.note_block.pling";
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path CONFIG_PATH = FabricLoader.getInstance().getConfigDir().resolve("sogki-rp-manager.json");

  public boolean promptOnJoin = true;
  public String activeEndpoint = DEFAULT_ACTIVE_ENDPOINT;
  public boolean welcomeMessageOnJoin = true;
  public boolean welcomeUseActionBar = true;
  public String firstJoinMessage = DEFAULT_FIRST_JOIN_MESSAGE;
  public String returningJoinMessage = DEFAULT_RETURNING_JOIN_MESSAGE;
  public String firstJoinSound = DEFAULT_FIRST_JOIN_SOUND;
  public String returningJoinSound = DEFAULT_RETURNING_JOIN_SOUND;
  public float welcomeSoundVolume = 1.0f;
  public float welcomeSoundPitch = 1.0f;
  // Legacy migration field from older versions.
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
    if (config.firstJoinMessage == null || config.firstJoinMessage.isBlank()) {
      config.firstJoinMessage = DEFAULT_FIRST_JOIN_MESSAGE;
    }
    if (config.returningJoinMessage == null || config.returningJoinMessage.isBlank()) {
      config.returningJoinMessage = DEFAULT_RETURNING_JOIN_MESSAGE;
    }
    if (config.firstJoinSound == null || config.firstJoinSound.isBlank()) {
      config.firstJoinSound = DEFAULT_FIRST_JOIN_SOUND;
    }
    if (config.returningJoinSound == null || config.returningJoinSound.isBlank()) {
      config.returningJoinSound = DEFAULT_RETURNING_JOIN_SOUND;
    }
    config.welcomeSoundVolume = clamp(config.welcomeSoundVolume, 0.0f, 2.0f, 1.0f);
    config.welcomeSoundPitch = clamp(config.welcomeSoundPitch, 0.5f, 2.0f, 1.0f);
    if (config.promptSeenServers == null) {
      config.promptSeenServers = new ArrayList<>();
    } else {
      Set<String> unique = new LinkedHashSet<>();
      for (String entry : config.promptSeenServers) {
        if (entry == null) continue;
        String normalized = entry.trim().toLowerCase(Locale.ROOT);
        if (!normalized.isBlank()) unique.add(normalized);
      }
      config.promptSeenServers = new ArrayList<>(unique);
    }
  }

  public boolean hasLegacySeenServer(String serverKey) {
    if (serverKey == null || serverKey.isBlank()) return false;
    return promptSeenServers.contains(serverKey.trim().toLowerCase(Locale.ROOT));
  }

  private static float clamp(float value, float min, float max, float fallback) {
    if (Float.isNaN(value) || Float.isInfinite(value)) return fallback;
    return Math.max(min, Math.min(max, value));
  }
}
