package dev.sogki.rpmanager.server.wildtrainer;

import net.minecraft.entity.Entity;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Stable identity on wild trainer entities: command tags survive chunk unload. Primary marker is {@value #MARKER_TAG}
 * (used on {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity} and, for legacy saves, Cobblemon NPCs).
 */
public final class WildTrainerEntityTags {
  public static final String MARKER_TAG = "sogki_wild_trainer";
  private static final String ID_PREFIX = "sogki_wtid_";

  private WildTrainerEntityTags() {
  }

  public static boolean hasMarker(Entity entity) {
    return entity != null && entity.getCommandTags().contains(MARKER_TAG);
  }

  /**
   * Lowercase tag segment: letters, digits, underscore only (stable on the entity).
   */
  public static String safeId(String trainerId) {
    if (trainerId == null || trainerId.isBlank()) {
      return null;
    }
    StringBuilder sb = new StringBuilder(trainerId.length());
    for (int i = 0; i < trainerId.length(); i++) {
      char c = trainerId.charAt(i);
      if (c >= 'A' && c <= 'Z') {
        sb.append((char) (c + 32));
      } else if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_') {
        sb.append(c);
      } else {
        sb.append('_');
      }
    }
    String s = sb.toString().replaceAll("_+", "_");
    if (s.startsWith("_")) {
      s = s.substring(1);
    }
    if (s.endsWith("_")) {
      s = s.substring(0, s.length() - 1);
    }
    return s.isEmpty() ? null : s;
  }

  private static String idCommandTag(String safeId) {
    return ID_PREFIX + safeId;
  }

  /**
   * Adds {@value #MARKER_TAG} and {@code sogki_wtid_*} (removes any prior {@code sogki_wtid_} tags first).
   */
  public static void stampWildTrainer(Entity entity, String trainerId) {
    if (entity == null) {
      return;
    }
    stripWildTrainerIdTags(entity);
    entity.addCommandTag(MARKER_TAG);
    String safe = safeId(trainerId);
    if (safe != null) {
      entity.addCommandTag(idCommandTag(safe));
    }
  }

  public static void stripWildTrainerIdTags(Entity entity) {
    if (entity == null) {
      return;
    }
    Set<String> tags = entity.getCommandTags();
    List<String> remove = new ArrayList<>();
    for (String t : tags) {
      if (t != null && t.startsWith(ID_PREFIX)) {
        remove.add(t);
      }
    }
    for (String t : remove) {
      tags.remove(t);
    }
  }

  /** Full command tag for this trainer id (for lookups), or null if id is unusable. */
  public static String fullIdTag(String trainerId) {
    String safe = safeId(trainerId);
    return safe == null ? null : ID_PREFIX + safe;
  }

  /**
   * @return the safe id segment from the entity's tag, or null
   */
  public static String parseTrainerIdTag(Entity entity) {
    if (entity == null) {
      return null;
    }
    for (String t : entity.getCommandTags()) {
      if (t != null && t.startsWith(ID_PREFIX)) {
        return t.substring(ID_PREFIX.length());
      }
    }
    return null;
  }
}
