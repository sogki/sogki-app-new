package dev.sogki.rpmanager.server.service;

import java.util.Locale;

public enum TeamId {
  VALOR("valor"),
  MYSTIC("mystic"),
  INSTINCT("instinct");

  private final String id;

  TeamId(String id) {
    this.id = id;
  }

  public String id() {
    return id;
  }

  public static TeamId parse(String raw) {
    if (raw == null || raw.isBlank()) return null;
    String normalized = raw.trim().toLowerCase(Locale.ROOT);
    for (TeamId value : values()) {
      if (value.id.equals(normalized)) return value;
    }
    return null;
  }
}
