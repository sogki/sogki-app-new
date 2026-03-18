package dev.sogki.rpmanager.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class PromptPlayerDataStore {
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Type ROOT_TYPE = new TypeToken<Map<String, List<String>>>() { }.getType();
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-rp-manager")
    .resolve("playerdata.json");

  private final Map<String, List<String>> seenByServer;

  private PromptPlayerDataStore(Map<String, List<String>> seenByServer) {
    this.seenByServer = seenByServer;
    normalize();
  }

  public static PromptPlayerDataStore load() {
    try {
      if (Files.notExists(STORE_PATH)) {
        return new PromptPlayerDataStore(new HashMap<>());
      }
      String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
      Map<String, List<String>> parsed = GSON.fromJson(raw, ROOT_TYPE);
      if (parsed == null) parsed = new HashMap<>();
      return new PromptPlayerDataStore(parsed);
    } catch (Exception ignored) {
      return new PromptPlayerDataStore(new HashMap<>());
    }
  }

  public synchronized void save() {
    normalize();
    try {
      Files.createDirectories(STORE_PATH.getParent());
      Files.writeString(STORE_PATH, GSON.toJson(seenByServer, ROOT_TYPE), StandardCharsets.UTF_8);
    } catch (IOException ignored) {
    }
  }

  public synchronized boolean hasSeen(String serverKey, String playerKey) {
    String server = normalizeKey(serverKey);
    String player = normalizeKey(playerKey);
    if (server.isBlank() || player.isBlank()) return false;
    List<String> players = seenByServer.get(server);
    return players != null && players.contains(player);
  }

  public synchronized void markSeen(String serverKey, String playerKey) {
    String server = normalizeKey(serverKey);
    String player = normalizeKey(playerKey);
    if (server.isBlank() || player.isBlank()) return;
    List<String> players = seenByServer.computeIfAbsent(server, key -> new ArrayList<>());
    if (!players.contains(player)) {
      players.add(player);
    }
  }

  private void normalize() {
    Map<String, List<String>> normalized = new HashMap<>();
    for (Map.Entry<String, List<String>> entry : seenByServer.entrySet()) {
      String server = normalizeKey(entry.getKey());
      if (server.isBlank()) continue;
      Set<String> uniquePlayers = new LinkedHashSet<>();
      List<String> players = entry.getValue();
      if (players != null) {
        for (String player : players) {
          String normalizedPlayer = normalizeKey(player);
          if (!normalizedPlayer.isBlank()) uniquePlayers.add(normalizedPlayer);
        }
      }
      normalized.put(server, new ArrayList<>(uniquePlayers));
    }
    seenByServer.clear();
    seenByServer.putAll(normalized);
  }

  private static String normalizeKey(String value) {
    if (value == null) return "";
    return value.trim().toLowerCase(Locale.ROOT);
  }
}
