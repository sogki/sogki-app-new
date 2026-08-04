package dev.sogki.rpmanager.server.wildtrainer;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

final class WildTrainerDialogueFormatting {
  private WildTrainerDialogueFormatting() {
  }

  /**
   * After {@link dev.sogki.rpmanager.server.util.TemplateEngine#render}, strips a leading coloured
   * {@code Name:} prefix (case-insensitive) so the title line is the only name.
   */
  static String stripRenderedSpeakerPrefix(String rendered, String displayName) {
    if (rendered == null || displayName == null || displayName.isBlank()) {
      return rendered == null ? "" : rendered;
    }
    String esc = Pattern.quote(displayName.strip());
    Pattern p = Pattern.compile("^(?:§[0-9a-fk-or])*\\s*" + esc + "\\s*:\\s*", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    return p.matcher(rendered).replaceFirst("");
  }

  /**
   * Word-wrap on spaces for chat; preserves whole words. Width counts raw characters (approximate for MC font).
   */
  static List<String> wrapWords(String line, int maxWidth) {
    List<String> out = new ArrayList<>();
    if (line == null || line.isEmpty()) {
      return out;
    }
    if (maxWidth <= 0 || line.length() <= maxWidth) {
      out.add(line);
      return out;
    }
    String remaining = line;
    while (!remaining.isEmpty()) {
      remaining = remaining.stripLeading();
      if (remaining.isEmpty()) {
        break;
      }
      if (remaining.length() <= maxWidth) {
        out.add(remaining);
        break;
      }
      int breakAt = remaining.lastIndexOf(' ', maxWidth);
      if (breakAt <= 0) {
        int firstSpace = remaining.indexOf(' ');
        if (firstSpace < 0) {
          out.add(remaining);
          break;
        }
        if (firstSpace > maxWidth) {
          breakAt = firstSpace;
        } else {
          breakAt = maxWidth;
        }
      }
      String part = remaining.substring(0, breakAt).stripTrailing();
      if (!part.isEmpty()) {
        out.add(part);
      }
      remaining = remaining.substring(breakAt);
    }
    return out;
  }

  static float voicePitch(String voiceProfile, WildTrainerDialogueMessages ui) {
    if (ui == null) {
      return 1.0f;
    }
    String v = voiceProfile == null ? "neutral" : voiceProfile.trim().toLowerCase(Locale.ROOT);
    return switch (v) {
      case "male", "m", "deep" -> ui.villagerPitchMale;
      case "female", "f", "high" -> ui.villagerPitchFemale;
      default -> ui.villagerPitchNeutral;
    };
  }
}
