package dev.sogki.rpmanager.server.wildtrainer;

/**
 * Customisable chat / sound strings for wild trainer dialogue (trainers.yml / trainers.json under {@code dialogueUi}).
 */
public final class WildTrainerDialogueMessages {
  /** Placeholders: {@code {current}}, {@code {total}} */
  public String shiftHintTemplate = "&8⌛ &7Hold &fSneak &7to advance &8· &8({current}/{total})&r";
  /** Prefixed to each dialogue body line in chat; empty to disable. */
  public String chatLinePrefix = "&6❖ &r";
  /** Top rule in chat before the duel block. */
  public String duelSeparator = "&8▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬";
  /** Line after the separator; placeholders: {@code {displayName}} */
  public String duelHeaderTemplate = "&6&l⚔ Battle challenge&r";
  /** Main challenge line; placeholders: {@code {displayName}} */
  public String duelWantsBattleTemplate = "&7Trainer &e&l{displayName}&r &7would like to battle!";
  /** Hint under the main line (empty to skip). */
  public String duelSublineTemplate = "&8» &7Click &aAccept &7or &cDecline &7in chat below.";
  /**
   * When false (default), slash commands are omitted so the UI stays clean (buttons still work).
   * Set true to show {@link #duelCommandHintTemplate} for servers that disable chat clicks.
   */
  public boolean duelShowSlashCommandHint = false;
  /** Placeholder: {@code {id}} — only sent when {@link #duelShowSlashCommandHint} is true. */
  public String duelCommandHintTemplate = "&8⌨ &7/sogki trainer &aaccept {id} &8| &cdeny {id}";
  /** Action bar while the duel prompt is open; placeholders: {@code {displayName}}, {@code {id}} */
  public String duelActionBarTemplate = "&6⚔ &f{displayName}&8 — &aAccept &7or &cDecline";
  public boolean playVillagerAmbientOnDialogueLine = true;
  public float villagerPitchMale = 0.72f;
  public float villagerPitchFemale = 1.28f;
  public float villagerPitchNeutral = 1.0f;
  /** Approximate max characters per chat line before word-wrapping (0 = no wrap). */
  public int dialogueWrapWidth = 44;
  /**
   * When true, strips a leading {@code DisplayName:} (case-insensitive) from each line after {@link dev.sogki.rpmanager.server.util.TemplateEngine#render},
   * so the gold title line is the only name.
   */
  public boolean stripSpeakerPrefixFromDialogueLines = true;

  // --- Encounter presentation (right-click / first dialogue line) ---

  /** Large center-screen title when dialogue starts (first line). */
  public boolean showTitleScreenOnDialogueStart = true;
  public int trainerTitleFadeInTicks = 6;
  public int trainerTitleStayTicks = 45;
  public int trainerTitleFadeOutTicks = 14;
  /** Placeholder: {@code {displayName}} */
  public String trainerTitleSubtitleTemplate = "&7Wild Trainer encounter";

  /** Note block–style cue at the trainer when dialogue opens. */
  public boolean playDialogueOpenSound = true;
  /** Villager-style line sound at the trainer’s position (other players nearby hear it). */
  public boolean playTrainerPositionSounds = true;
  public float trainerPositionSoundVolume = 0.92f;

  public boolean spawnDialogueStartParticles = true;

  /** Hotbar hint for shift-to-continue; placeholders {@code {current}}, {@code {total}} */
  public boolean useActionBarForProgressHints = true;
  public String actionBarShiftHintTemplate = "&6Trainer &8» &eShift &7to continue &8({current}/{total})";

  /** Duel phase: sound at trainer + optional particles when the challenge appears. */
  public boolean playDuelCueAtTrainer = true;
  public boolean spawnDuelPromptParticles = true;

  // --- Boss bar + compact chat (Wynncraft-style HUD) ---

  /** Slim boss bar showing trainer name and dialogue / challenge progress. */
  public boolean useBossBarDuringDialogue = true;
  /** Placeholders: {@code {displayName}}, {@code {current}}, {@code {total}}, {@code {serverTag}} */
  public String bossBarDialogueTemplate = "&6&l{displayName} &8» &7Story &8({current}/{total}) &8| {serverTag}";
  /** Placeholders: {@code {displayName}}, {@code {id}}, {@code {serverTag}} */
  public String bossBarDuelPhaseTemplate = "&c&lChallenge &8» &f{displayName} &7— &eAccept &7or &cDecline &8| {serverTag}";
  /** Shown inside boss bar templates as {@code {serverTag}}; empty to hide trailing separator. */
  public String serverBrandSubtitle = "&7Cobblepals";

  /** Fewer blank chat lines; slightly tighter flow. */
  public boolean compactChatLayout = false;
  /**
   * When {@link #showTitleScreenOnDialogueStart} is true, skip the gold chat name line on the first step
   * to avoid duplicating the big title.
   */
  public boolean skipDuplicateChatTitleWhenTitleScreen = true;
}
