package dev.sogki.rpmanager.server.service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Per-player cooldowns for chat commands (wall-clock seconds). */
public final class CommandCooldownService {
  private final Map<UUID, Map<String, Long>> untilMs = new ConcurrentHashMap<>();

  public int remainingSeconds(UUID playerId, String commandKey) {
    if (playerId == null || commandKey == null) return 0;
    long now = System.currentTimeMillis();
    Map<String, Long> map = untilMs.get(playerId);
    if (map == null) return 0;
    Long until = map.get(commandKey);
    if (until == null || now >= until) return 0;
    return (int) Math.ceil((until - now) / 1000.0);
  }

  public void startCooldown(UUID playerId, String commandKey, int cooldownSeconds) {
    if (playerId == null || commandKey == null || cooldownSeconds <= 0) return;
    long until = System.currentTimeMillis() + cooldownSeconds * 1000L;
    untilMs.computeIfAbsent(playerId, u -> new ConcurrentHashMap<>()).put(commandKey, until);
  }
}
