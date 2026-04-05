package dev.sogki.rpmanager.server.service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Tracks last /msg sender per player for /r replies. */
public final class DirectMessageService {
  private final Map<UUID, UUID> lastIncoming = new ConcurrentHashMap<>();

  public void onMessage(UUID from, UUID to) {
    if (from == null || to == null || from.equals(to)) return;
    lastIncoming.put(to, from);
  }

  public UUID lastMessengerFor(UUID receiver) {
    if (receiver == null) return null;
    return lastIncoming.get(receiver);
  }
}
