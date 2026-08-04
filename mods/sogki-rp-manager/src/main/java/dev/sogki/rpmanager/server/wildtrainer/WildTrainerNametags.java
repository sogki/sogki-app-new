package dev.sogki.rpmanager.server.wildtrainer;

import net.minecraft.entity.Entity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

/**
 * Floating nameplate text for {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity} (and legacy Cobblemon NPCs if any).
 */
public final class WildTrainerNametags {
  private WildTrainerNametags() {
  }

  public static Text buildCustomName(WildTrainerEntry t, WildTrainerFileConfig cfg) {
    if (t == null || cfg == null) {
      return Text.literal("");
    }
    String name = t.displayName == null ? "" : t.displayName;
    if (!cfg.nametagAppendInteractHint) {
      return Text.literal(name);
    }
    String hint = cfg.nametagInteractHint == null ? "" : cfg.nametagInteractHint.trim();
    if (hint.isEmpty()) {
      return Text.literal(name);
    }
    return Text.empty()
      .append(Text.literal(name))
      .append(Text.literal("\n"))
      .append(Text.literal(hint).formatted(Formatting.GRAY));
  }

  public static void applyVanillaStyle(Entity entity, WildTrainerEntry t, WildTrainerFileConfig cfg) {
    if (entity == null) {
      return;
    }
    entity.setCustomName(buildCustomName(t, cfg));
    entity.setCustomNameVisible(true);
  }
}
