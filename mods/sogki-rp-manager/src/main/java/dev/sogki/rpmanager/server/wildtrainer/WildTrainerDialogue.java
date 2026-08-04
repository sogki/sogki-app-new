package dev.sogki.rpmanager.server.wildtrainer;

import dev.sogki.rpmanager.server.util.LegacyFormattedText;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.entity.Entity;
import net.minecraft.network.packet.Packet;
import net.minecraft.particle.ParticleTypes;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Chat and audiovisual flow for wild-trainer conversations (battles still use {@link CobblemonWildTrainerBridge}).
 */
final class WildTrainerDialogue {
  WildTrainerDialogue() {
  }

  void pushDialogueLine(
    ServerPlayerEntity player,
    WildTrainerEntry t,
    int index,
    WildTrainerFileConfig cfg,
    Entity trainerEntity
  ) {
    String line = dialogueLine(t, index);
    if (line == null) {
      return;
    }
    WildTrainerDialogueMessages ui = cfg.dialogueUi != null ? cfg.dialogueUi : new WildTrainerDialogueMessages();
    int total = t.dialogue == null ? 1 : Math.max(1, t.dialogue.size());

    if (index == 0 && trainerEntity != null && trainerEntity.getWorld() instanceof ServerWorld sw) {
      onDialogueStartPresentation(player, t, cfg, ui, trainerEntity, sw);
    }

    sendBlankChatLines(player, padBefore(cfg, ui));
    if (line.isBlank()) {
      player.sendMessage(Text.literal(" "), false);
      sendProgressHints(player, index, total, cfg, ui);
      sendBlankChatLines(player, padAfter(cfg, ui));
      return;
    }
    if ((index == 0 || cfg.dialogueShowTitleEveryStep) && !skipCenteredChatTitle(ui, index)) {
      sendCenteredTrainerTitle(player, t);
    }
    String rendered = TemplateEngine.render(line, Map.of());
    if (ui.stripSpeakerPrefixFromDialogueLines) {
      rendered = WildTrainerDialogueFormatting.stripRenderedSpeakerPrefix(rendered, t.displayName);
    }
    List<String> segments = WildTrainerDialogueFormatting.wrapWords(rendered, ui.dialogueWrapWidth);
    if (segments.isEmpty()) {
      segments = List.of(rendered);
    }
    float pitch = WildTrainerDialogueFormatting.voicePitch(t.voiceProfile, ui);
    boolean playVillager = ui.playVillagerAmbientOnDialogueLine;
    int indent = Math.max(0, cfg.dialogueBodyIndentSpaces);
    String prefix = ui.chatLinePrefix == null ? "" : ui.chatLinePrefix;
    for (String segment : segments) {
      String out = TemplateEngine.render(prefix + segment, Map.of());
      player.sendMessage(LegacyFormattedText.parse(" ".repeat(indent) + out), false);
      if (playVillager) {
        if (ui.playTrainerPositionSounds && trainerEntity != null && trainerEntity.getWorld() instanceof ServerWorld tw) {
          tw.playSound(
            null,
            trainerEntity.getX(),
            trainerEntity.getEyeY(),
            trainerEntity.getZ(),
            SoundEvents.ENTITY_VILLAGER_AMBIENT,
            SoundCategory.NEUTRAL,
            ui.trainerPositionSoundVolume * 0.55f,
            pitch
          );
        } else {
          player.playSound(SoundEvents.ENTITY_VILLAGER_AMBIENT, 0.45f, pitch);
        }
      }
    }
    sendProgressHints(player, index, total, cfg, ui);
    sendBlankChatLines(player, padAfter(cfg, ui));
  }

  void sendDuelPrompt(ServerPlayerEntity player, WildTrainerEntry t, WildTrainerFileConfig cfg, Entity trainerEntity) {
    WildTrainerDialogueMessages ui = cfg.dialogueUi != null ? cfg.dialogueUi : new WildTrainerDialogueMessages();
    sendBlankChatLines(player, padBefore(cfg, ui));
    player.sendMessage(LegacyFormattedText.parse(TemplateEngine.render(ui.duelSeparator, Map.of())), false);
    Map<String, String> ph = new HashMap<>();
    ph.put("displayName", t.displayName == null ? "" : t.displayName);
    ph.put("id", t.id == null ? "" : t.id);
    player.sendMessage(LegacyFormattedText.parse(TemplateEngine.render(ui.duelHeaderTemplate, ph)), false);
    player.sendMessage(LegacyFormattedText.parse(TemplateEngine.render(ui.duelWantsBattleTemplate, ph)), false);
    if (ui.duelSublineTemplate != null && !ui.duelSublineTemplate.isBlank()) {
      player.sendMessage(LegacyFormattedText.parse(TemplateEngine.render(ui.duelSublineTemplate, ph)), false);
    }
    MutableText accept = Text.literal(" Accept ")
      .formatted(Formatting.GREEN, Formatting.BOLD)
      .styled(s -> s
        .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/sogki trainer accept " + t.id))
        .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Start the battle"))));
    MutableText deny = Text.literal(" Decline ")
      .formatted(Formatting.RED, Formatting.BOLD)
      .styled(s -> s
        .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/sogki trainer deny " + t.id))
        .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Walk away"))));
    MutableText actions = Text.literal("« ")
      .formatted(Formatting.DARK_GRAY)
      .append(accept)
      .append(Text.literal(" · ").formatted(Formatting.DARK_GRAY))
      .append(deny)
      .append(Text.literal(" »").formatted(Formatting.DARK_GRAY));

    float duelPitch = WildTrainerDialogueFormatting.voicePitch(t.voiceProfile, ui);
    if (ui.playDuelCueAtTrainer && trainerEntity != null && trainerEntity.getWorld() instanceof ServerWorld tw) {
      tw.playSound(
        null,
        trainerEntity.getX(),
        trainerEntity.getEyeY(),
        trainerEntity.getZ(),
        SoundEvents.ENTITY_VILLAGER_YES,
        SoundCategory.NEUTRAL,
        ui.trainerPositionSoundVolume,
        duelPitch
      );
      if (ui.spawnDuelPromptParticles) {
        tw.spawnParticles(
          ParticleTypes.ENCHANT,
          trainerEntity.getX(),
          trainerEntity.getEyeY(),
          trainerEntity.getZ(),
          20,
          0.35,
          0.45,
          0.35,
          0.04
        );
      }
    } else {
      player.playSound(SoundEvents.ENTITY_VILLAGER_YES, 0.5f, duelPitch);
    }

    player.sendMessage(actions, false);
    if (ui.duelShowSlashCommandHint) {
      player.sendMessage(
        LegacyFormattedText.parse(TemplateEngine.render(ui.duelCommandHintTemplate, Map.of("id", t.id))),
        false
      );
    }
    if (ui.useActionBarForProgressHints) {
      String bar = TemplateEngine.render(
        ui.duelActionBarTemplate != null ? ui.duelActionBarTemplate : "&6⚔ &f{displayName}",
        ph
      );
      player.sendMessage(LegacyFormattedText.parse(bar), true);
    }
    sendBlankChatLines(player, padAfter(cfg, ui));
  }

  private static void onDialogueStartPresentation(
    ServerPlayerEntity player,
    WildTrainerEntry t,
    WildTrainerFileConfig cfg,
    WildTrainerDialogueMessages ui,
    Entity trainer,
    ServerWorld world
  ) {
    if (ui.showTitleScreenOnDialogueStart) {
      String plain = t.displayName == null ? "" : t.displayName;
      Text title = Text.literal(plain).formatted(Formatting.GOLD, Formatting.BOLD);
      String subRaw = TemplateEngine.render(
        ui.trainerTitleSubtitleTemplate,
        Map.of("displayName", plain)
      );
      Text subtitle = LegacyFormattedText.parse(subRaw);
      sendTitlePackets(
        player,
        title,
        subtitle,
        Math.max(0, ui.trainerTitleFadeInTicks),
        Math.max(1, ui.trainerTitleStayTicks),
        Math.max(0, ui.trainerTitleFadeOutTicks)
      );
    }
    if (ui.playDialogueOpenSound) {
      world.playSound(
        null,
        trainer.getX(),
        trainer.getEyeY(),
        trainer.getZ(),
        SoundEvents.BLOCK_NOTE_BLOCK_PLING.value(),
        SoundCategory.NEUTRAL,
        1.0f,
        1.15f
      );
    }
    if (ui.spawnDialogueStartParticles) {
      world.spawnParticles(
        ParticleTypes.HAPPY_VILLAGER,
        trainer.getX(),
        trainer.getEyeY(),
        trainer.getZ(),
        14,
        0.35,
        0.4,
        0.35,
        0.02
      );
    }
  }

  private static void sendTitlePackets(
    ServerPlayerEntity player,
    Text title,
    Text subtitle,
    int fadeIn,
    int stay,
    int fadeOut
  ) {
    try {
      Class<?> fadeClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleFadeS2CPacket");
      Object fadePacket = fadeClass.getDeclaredConstructor(int.class, int.class, int.class)
        .newInstance(fadeIn, stay, fadeOut);
      player.networkHandler.sendPacket((Packet<?>) fadePacket);
    } catch (Throwable ignored) {
    }
    try {
      Class<?> titleClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleS2CPacket");
      Object titlePacket = titleClass.getDeclaredConstructor(Text.class).newInstance(title);
      player.networkHandler.sendPacket((Packet<?>) titlePacket);
    } catch (Throwable ignored) {
    }
    try {
      Class<?> subtitleClass = Class.forName("net.minecraft.network.packet.s2c.play.SubtitleS2CPacket");
      Object subtitlePacket = subtitleClass.getDeclaredConstructor(Text.class).newInstance(subtitle);
      player.networkHandler.sendPacket((Packet<?>) subtitlePacket);
    } catch (Throwable ignored) {
    }
  }

  private static String dialogueLine(WildTrainerEntry t, int index) {
    if (t.dialogue == null || index < 0 || index >= t.dialogue.size()) {
      return null;
    }
    String s = t.dialogue.get(index);
    return s == null ? "" : s;
  }

  private static void sendBlankChatLines(ServerPlayerEntity player, int count) {
    for (int i = 0; i < count; i++) {
      player.sendMessage(Text.literal(" "), false);
    }
  }

  private void sendProgressHints(
    ServerPlayerEntity player,
    int index,
    int total,
    WildTrainerFileConfig cfg,
    WildTrainerDialogueMessages ui
  ) {
    if (ui == null) {
      ui = new WildTrainerDialogueMessages();
    }
    int indent = Math.max(0, cfg.dialogueBodyIndentSpaces);
    Map<String, String> ph = Map.of(
      "current", String.valueOf(index + 1),
      "total", String.valueOf(total)
    );
    if (ui.useActionBarForProgressHints) {
      String bar = TemplateEngine.render(ui.actionBarShiftHintTemplate, ph);
      player.sendMessage(LegacyFormattedText.parse(bar), true);
    }
    String shift = TemplateEngine.render(" ".repeat(indent) + ui.shiftHintTemplate, ph);
    player.sendMessage(LegacyFormattedText.parse(shift), false);
  }

  private static void sendCenteredTrainerTitle(ServerPlayerEntity player, WildTrainerEntry t) {
    String plain = t.displayName == null ? "" : t.displayName;
    int pad = Math.max(0, (38 - plain.length()) / 2);
    String row = " ".repeat(pad) + "&6&l" + plain;
    player.sendMessage(LegacyFormattedText.parse(TemplateEngine.render(row, Map.of())), false);
  }

  private static int padBefore(WildTrainerFileConfig cfg, WildTrainerDialogueMessages ui) {
    int n = Math.max(0, cfg.dialogueChatPaddingBefore);
    return ui != null && ui.compactChatLayout ? Math.min(1, n) : n;
  }

  private static int padAfter(WildTrainerFileConfig cfg, WildTrainerDialogueMessages ui) {
    int n = Math.max(0, cfg.dialogueChatPaddingAfter);
    return ui != null && ui.compactChatLayout ? Math.min(1, n) : n;
  }

  private static boolean skipCenteredChatTitle(WildTrainerDialogueMessages ui, int index) {
    return index == 0
      && ui.showTitleScreenOnDialogueStart
      && ui.skipDuplicateChatTitleWhenTitleScreen;
  }
}
