package dev.sogki.rpmanager.server.util;

import net.minecraft.text.MutableText;
import net.minecraft.text.Style;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

/**
 * Builds {@link Text} from strings that use legacy {@code §} colour / style codes (as produced by
 * {@link TemplateEngine#render} after {@code &} conversion).
 */
public final class LegacyFormattedText {
  private LegacyFormattedText() {
  }

  public static Text parse(String text) {
    if (text == null || text.isEmpty()) {
      return Text.empty();
    }
    MutableText out = Text.empty();
    StringBuilder segment = new StringBuilder();
    Style current = Style.EMPTY;
    int i = 0;
    while (i < text.length()) {
      char c = text.charAt(i);
      if (c == '\u00A7' && i + 1 < text.length()) {
        if (segment.length() > 0) {
          out.append(Text.literal(segment.toString()).setStyle(current));
          segment.setLength(0);
        }
        char codeChar = Character.toLowerCase(text.charAt(i + 1));
        i += 2;
        Formatting fmt = Formatting.byCode(codeChar);
        if (fmt != null) {
          current = fmt == Formatting.RESET ? Style.EMPTY : current.withFormatting(fmt);
        }
        continue;
      }
      segment.append(c);
      i++;
    }
    if (segment.length() > 0) {
      out.append(Text.literal(segment.toString()).setStyle(current));
    }
    return out;
  }
}
