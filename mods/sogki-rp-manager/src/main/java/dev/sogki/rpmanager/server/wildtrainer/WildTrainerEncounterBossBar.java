package dev.sogki.rpmanager.server.wildtrainer;

import dev.sogki.rpmanager.server.util.LegacyFormattedText;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.entity.boss.BossBar;
import net.minecraft.entity.boss.CommandBossBar;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Wynncraft-style encounter HUD: a slim boss bar for dialogue progress (not a combat bar).
 */
public final class WildTrainerEncounterBossBar {
  private final Map<UUID, CommandBossBar> active = new HashMap<>();

  public void sync(
    ServerPlayerEntity player,
    WildTrainerEntry trainer,
    WildTrainerFileConfig cfg,
    int lineIndex,
    int totalLines,
    boolean duelPhase
  ) {
    WildTrainerDialogueMessages ui = cfg != null && cfg.dialogueUi != null ? cfg.dialogueUi : new WildTrainerDialogueMessages();
    if (!ui.useBossBarDuringDialogue) {
      clear(player);
      return;
    }
    MinecraftServer server = player.getServer();
    if (server == null || trainer == null) {
      return;
    }
    Identifier id = barId(player.getUuid());
    CommandBossBar bar = server.getBossBarManager().get(id);
    if (bar == null) {
      bar = server.getBossBarManager().add(id, Text.literal(""));
      bar.setColor(BossBar.Color.YELLOW);
      bar.setStyle(BossBar.Style.PROGRESS);
      bar.setDarkenSky(false);
      bar.setDragonMusic(false);
      bar.setThickenFog(false);
      active.put(player.getUuid(), bar);
    }
    String nameTpl = duelPhase ? ui.bossBarDuelPhaseTemplate : ui.bossBarDialogueTemplate;
    Map<String, String> ph = new HashMap<>();
    ph.put("displayName", trainer.displayName == null ? "" : trainer.displayName);
    ph.put("id", trainer.id == null ? "" : trainer.id);
    ph.put("current", String.valueOf(lineIndex + 1));
    ph.put("total", String.valueOf(Math.max(1, totalLines)));
    ph.put("serverTag", ui.serverBrandSubtitle == null ? "" : ui.serverBrandSubtitle);
    String rendered = TemplateEngine.render(nameTpl, ph);
    bar.setName(LegacyFormattedText.parse(rendered));
    float pct;
    if (duelPhase) {
      pct = 1.0f;
    } else {
      pct = totalLines <= 0 ? 1.0f : (float) (lineIndex + 1) / (float) totalLines;
    }
    bar.setPercent(Math.max(0.02f, Math.min(1.0f, pct)));
    bar.addPlayer(player);
  }

  public void clear(ServerPlayerEntity player) {
    if (player == null) {
      return;
    }
    MinecraftServer server = player.getServer();
    if (server == null) {
      return;
    }
    UUID pu = player.getUuid();
    CommandBossBar bar = active.remove(pu);
    if (bar == null) {
      bar = server.getBossBarManager().get(barId(pu));
    }
    if (bar != null) {
      bar.removePlayer(player);
      server.getBossBarManager().remove(bar);
    }
  }

  public void clearAll(MinecraftServer server) {
    if (server == null) {
      return;
    }
    for (CommandBossBar bar : active.values()) {
      bar.clearPlayers();
      server.getBossBarManager().remove(bar);
    }
    active.clear();
  }

  private static Identifier barId(UUID playerUuid) {
    String s = playerUuid.toString().replace('-', '_');
    return Identifier.of("sogki", "wild_trainer_dialogue_" + s);
  }
}
