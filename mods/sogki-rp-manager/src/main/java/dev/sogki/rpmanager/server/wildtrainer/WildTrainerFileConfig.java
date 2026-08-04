package dev.sogki.rpmanager.server.wildtrainer;

import java.util.ArrayList;
import java.util.List;

/**
 * Loaded from {@code config/sogki-cobblemon/trainers.yml} (preferred) or {@code trainers.json}.
 */
public final class WildTrainerFileConfig {
  public boolean enabled = false;
  /** When true (default), trainers are placed randomly using {@link #spawnDimensions} and separation rules. When false, use legacy fixed coords per entry ({@link WildTrainerEntry#spawn} + x/y/z). */
  public boolean randomPlacement = true;
  /**
   * Minimum horizontal distance (blocks) between any two wild trainer spawn points.
   * Large values (e.g. 10k+) keep copies of the “same” character ({@link WildTrainerEntry#displayName}) from ever meeting.
   */
  public int minTrainerSeparationBlocks = 10240;
  /** Attempts per trainer to find a valid spot before giving up (raise if {@link #minTrainerSeparationBlocks} is huge). */
  public int placementMaxAttemptsPerTrainer = 280;
  /** Weight for spawning near a player who is currently in a town/structure area (same logic as area titles). */
  public int townSpawnWeight = 25;
  /** Weight for spawning at a random point in the world border (wilderness). */
  public int wildernessSpawnWeight = 75;
  /** Weight for spawning offset from a random online player. Default 0 so trainers spread world-wide, not around players. */
  public int nearPlayerSpawnWeight = 0;
  /** Min/max horizontal offset from anchor player for {@link #nearPlayerSpawnWeight}. */
  public int nearPlayerMinOffsetBlocks = 40;
  public int nearPlayerMaxOffsetBlocks = 168;
  /** Max horizontal spread from a town anchor when using {@link #townSpawnWeight}. */
  public int townNpcSpreadMaxBlocks = 72;
  /**
   * Max horizontal distance from the world border center for {@link #wildernessSpawnWeight} picks.
   * Keeps NPCs in loaded-ish range; full border size would place them millions of blocks out (unloaded → false "missing" respawn loop).
   */
  public int wildernessSpawnMaxRadiusBlocks = 12000;
  /**
   * When true, every ~6s trainers whose UUID is not in loaded chunks are respawned. Default false: unloaded is not the same as dead.
   * Use {@code /sogkiadmin trainers respawn} if you need a full reset.
   */
  public boolean autoRespawnMissingTrainers = false;
  /** Dimensions trainers may be placed in (identifiers e.g. minecraft:overworld). */
  public List<String> spawnDimensions = new ArrayList<>(List.of("minecraft:overworld"));
  /**
   * When true, Sogki wild trainers take short random walks while idle. They never path toward players.
   * Movement pauses while any player is in dialogue or the duel prompt with that trainer.
   */
  public boolean wanderEnabled = true;
  /** Legacy field; no longer used (idle wander uses AI goals instead of server tick pacing). */
  public int wanderTickInterval = 30;
  /** Movement speed for idle wander paths. */
  public double wanderSpeed = 0.35D;
  /** Legacy fields; ignored (trainers never seek players). */
  public int wanderSeekPlayerBlocks = 88;
  public int wanderStopDistanceBlocks = 7;
  /** If &gt; 0, all wild trainers are re-rolled to new random positions every this many ticks. */
  public int relocateIntervalTicks = 0;
  /**
   * Max horizontal distance (blocks) for legacy auto-start when {@link #requireRightClickToStart} is false.
   */
  public double proximity = 4.5D;
  /**
   * Max distance (blocks) from the trainer <em>entity</em> while dialogue or the duel prompt is active.
   * Defaults larger than typical right-click range so a tight {@link #proximity} value does not cancel the session next tick.
   */
  public double dialogueContinueMaxDistanceBlocks = 16.0D;
  /**
   * When true (default), dialogue starts only after a right-click on the trainer (UseEntity is handled by Sogki).
   * Use {@link #nametagInteractHint} on the nameplate when {@link #nametagAppendInteractHint} is true.
   * When false, the first line plays automatically when the player enters {@link #proximity} (legacy).
   */
  public boolean requireRightClickToStart = true;
  /**
   * When false (default), the floating name is only {@link WildTrainerEntry#displayName} — clean for minimaps (e.g. Xaero)
   * and entity tooltips. When true, {@link #nametagInteractHint} is shown on a second line under the name.
   */
  public boolean nametagAppendInteractHint = false;
  /** Second line under the display name when {@link #nametagAppendInteractHint} is true (empty string to omit). */
  public String nametagInteractHint = "Right-click to interact";
  /** Extra blank chat lines before each dialogue entry (including blank {@link WildTrainerEntry#dialogue} lines). */
  public int dialogueChatPaddingBefore = 3;
  /** Extra blank chat lines after the “Shift to continue” line. */
  public int dialogueChatPaddingAfter = 3;
  /** When true, repeat the centred trainer title before every non-blank dialogue step. */
  public boolean dialogueShowTitleEveryStep = true;
  /** Leading spaces before the dialogue text (chat is monospace-ish; tune for your resource pack). */
  public int dialogueBodyIndentSpaces = 3;
  /** Minimum ticks between right-click attempts on wild trainers (per player). */
  public int interactCooldownTicks = 15;
  /** Minimum ticks between sneak-advance steps. */
  public int sneakAdvanceCooldownTicks = 12;
  /** Ticks after deny / failed battle before the trainer can engage again. */
  public int reEngageCooldownTicks = 100;
  /**
   * When true, removes Cobblemon {@code cobblemon:npc} entities that do <strong>not</strong> have the Sogki
   * {@code sogki_wild_trainer} tag — i.e. default world/structure NPCs (professor, healer skins) that ignore your
   * dialogue. Sogki wild trainers are left alone after a short grace period. Disable if you need vanilla Cobblemon NPCs.
   */
  public boolean removeAmbientCobblemonNpcs = false;
  /**
   * Ticks to wait after an untagged {@code cobblemon:npc} loads before discarding it (so Sogki can attach
   * {@code sogki_wild_trainer} first). Clamped to at least 10.
   */
  public int ambientCobblemonNpcGraceTicks = 25;
  /**
   * Server ticks before discarding the hidden Cobblemon {@code cobblemon:npc} used only as a battle host after you
   * accept a duel (overworld trainers are {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity}).
   */
  public int transientBattleHostLifetimeTicks = 600;

  // --- Dynamic encounters (RCT-style: your trainers move toward exploring players) ---

  /**
   * When true with {@link #randomPlacement}, periodically places {@link WildTrainerEntry#dynamicSpawn} trainers
   * near players if there are fewer than {@link #dynamicEncounterMaxNearPlayer} Sogki trainers in range.
   * Still one world instance per trainer id; far-away instances relocate. Uses {@link WildTrainerEntry#spawnBiomes}.
   */
  public boolean dynamicEncountersEnabled = false;
  /**
   * If false while {@link #dynamicEncountersEnabled} is true: on server start, only {@link WildTrainerEntry#useFixedPosition}
   * trainers are spawned from the pool; roaming trainers are added by dynamic ticks instead.
   */
  public boolean spawnStaticPoolOnServerStart = true;
  public int dynamicEncounterIntervalTicks = 900;
  public int dynamicEncounterMaxNearPlayer = 3;
  public int dynamicEncounterCheckRadiusBlocks = 112;
  public int dynamicEncounterMinHorizontalDistance = 22;
  public int dynamicEncounterMaxHorizontalDistance = 76;
  public int dynamicEncounterVerticalSearch = 36;
  public int dynamicEncounterPickAttempts = 48;
  /**
   * When true, {@link #randomPlacement} initial spawn retries until {@link WildTrainerEntry#spawnBiomes} matches
   * (or attempts exhausted).
   */
  public boolean enforceSpawnBiomesOnRandomPlacement = false;

  /**
   * Structure namespaces scanned for {@link WildTrainerEntry#preferredHomeStructures} (Cobblemon towns, CobbleTowns, etc.).
   */
  public List<String> loreStructureNamespaces = new ArrayList<>(List.of("cobblemon", "cobbletown", "cobbletowns"));
  /** Attempts to place a trainer with non-empty {@link WildTrainerEntry#preferredHomeStructures} before falling back. */
  public int lorePlacementMaxAttempts = 220;
  /** Horizontal spread from an anchor block inside a matching structure when using lore placement. */
  public int loreStructureSpreadMaxBlocks = 64;
  /** Random surface probes per lore attempt when no player stands in a matching structure. */
  public int loreWildernessProbeAttemptsPerPass = 48;

  /** Chat line templates, villager sound pitches, wrap width — customise in YAML under {@code dialogueUi}. */
  public WildTrainerDialogueMessages dialogueUi = new WildTrainerDialogueMessages();
  public List<WildTrainerEntry> trainers = new ArrayList<>();

  public static WildTrainerFileConfig empty() {
    WildTrainerFileConfig c = new WildTrainerFileConfig();
    c.trainers = new ArrayList<>();
    c.dialogueUi = new WildTrainerDialogueMessages();
    return c;
  }

  public static WildTrainerFileConfig exampleDefaults() {
    WildTrainerFileConfig c = new WildTrainerFileConfig();
    c.enabled = false;
    c.randomPlacement = true;
    c.minTrainerSeparationBlocks = 10240;
    c.placementMaxAttemptsPerTrainer = 280;
    c.townSpawnWeight = 25;
    c.wildernessSpawnWeight = 75;
    c.nearPlayerSpawnWeight = 0;
    c.nearPlayerMinOffsetBlocks = 40;
    c.nearPlayerMaxOffsetBlocks = 168;
    c.townNpcSpreadMaxBlocks = 72;
    c.wildernessSpawnMaxRadiusBlocks = 12000;
    c.autoRespawnMissingTrainers = false;
    c.spawnDimensions = new ArrayList<>(List.of("minecraft:overworld"));
    c.wanderEnabled = true;
    c.wanderTickInterval = 30;
    c.wanderSpeed = 0.35D;
    c.wanderSeekPlayerBlocks = 88;
    c.wanderStopDistanceBlocks = 7;
    c.relocateIntervalTicks = 0;
    c.proximity = 4.5D;
    c.dialogueContinueMaxDistanceBlocks = 16.0D;
    c.requireRightClickToStart = true;
    c.nametagAppendInteractHint = false;
    c.nametagInteractHint = "Right-click to interact";
    c.dialogueChatPaddingBefore = 3;
    c.dialogueChatPaddingAfter = 3;
    c.dialogueShowTitleEveryStep = true;
    c.dialogueUi = new WildTrainerDialogueMessages();
    c.dialogueBodyIndentSpaces = 3;
    c.interactCooldownTicks = 15;
    c.sneakAdvanceCooldownTicks = 12;
    c.reEngageCooldownTicks = 120;
    c.removeAmbientCobblemonNpcs = true;
    c.ambientCobblemonNpcGraceTicks = 25;
    c.transientBattleHostLifetimeTicks = 600;
    c.loreStructureNamespaces = new ArrayList<>(List.of("cobblemon", "cobbletown", "cobbletowns"));
    c.lorePlacementMaxAttempts = 220;
    c.loreStructureSpreadMaxBlocks = 64;
    c.loreWildernessProbeAttemptsPerPass = 48;
    c.trainers = new ArrayList<>(List.of(
      ash(), nTrainer(), leaf(), dawn(), serena(), may()
    ));
    return c;
  }

  private static WildTrainerEntry ash() {
    WildTrainerEntry e = base("ash", "Ash", "HINAGOD", 4);
    e.preferredHomeStructures = new ArrayList<>(List.of("pallet_town"));
    e.dialogue = List.of(
      "&eAsh:&r Hey! You look like a strong Trainer!",
      "&eAsh:&r I've been traveling all over with Pikachu — every battle gets us closer to being Pokémon Masters!",
      "&eAsh:&r So what do you say? Wanna have a real battle right here?",
      "&eAsh:&r I won't hold back — come at me with everything you've got!"
    );
    e.partyLines = List.of(
      "pikachu level=58 moves=thunderbolt,electroweb,quickattack,irontail",
      "lucario level=56 moves=aurasphere,dragonpulse,psychic,earthquake",
      "charizard level=55 moves=airslash,flamethrower,dragonclaw,roost"
    );
    return e;
  }

  private static WildTrainerEntry nTrainer() {
    WildTrainerEntry e = base("n", "N", "z0as", 5);
    e.preferredHomeStructures = new ArrayList<>(List.of("dragonspiral", "n_castle", "castle"));
    e.dialogue = List.of(
      "&bN:&r …You can hear their voices too, can't you? Pokémon speak in ways most Trainers never notice.",
      "&bN:&r I don't see Pokémon as tools — they're partners, equals. If we battle, I want to understand how you treat yours.",
      "&bN:&r Answer honestly with your team, not just your words. Shall we begin?",
      "&bN:&r I will not hold resentment toward the outcome — only learn from it."
    );
    e.partyLines = List.of(
      "zoroark level=54 moves=nightdaze,flamethrower,grassknot,focusblast",
      "carracosta level=52 moves=liquidation,crunch,rockslide,aquajet",
      "klinklang level=53 moves=flashcannon,thunderbolt,shiftgear,hyperbeam"
    );
    return e;
  }

  private static WildTrainerEntry leaf() {
    WildTrainerEntry e = base("leaf", "Leaf", "asulauv", 3);
    e.preferredHomeStructures = new ArrayList<>(List.of("pallet_town", "kanto"));
    e.dialogue = List.of(
      "&aLeaf:&r …Oh, hi. I was just mapping this route in my head.",
      "&aLeaf:&r Kanto taught me to stay calm and read the field — every step matters in a battle.",
      "&aLeaf:&r If you're up for it, I'd like to test your team. No hard feelings either way.",
      "&aLeaf:&r Ready when you are."
    );
    e.partyLines = List.of(
      "venusaur level=55 moves=gigadrain,sludgebomb,earthpower,sleeppowder",
      "clefable level=52 moves=moonblast,softboiled,thunderwave,cosmicpower",
      "ninetales level=53 moves=heatwave,willowisp,hex,solarbeam"
    );
    return e;
  }

  private static WildTrainerEntry dawn() {
    WildTrainerEntry e = base("dawn", "Dawn", "lxcia125", 3);
    e.voiceProfile = "female";
    e.preferredHomeStructures = new ArrayList<>(List.of("twinleaf", "jubilife", "sinnoh"));
    e.dialogue = List.of(
      "&dDawn:&r No need to worry — but wow, you surprised me popping up like that!",
      "&dDawn:&r Coordinating contests taught me rhythm and flair, but battling? That's a whole different stage!",
      "&dDawn:&r Let's make this a performance worth remembering — you in?",
      "&dDawn:&r Starlight, spotlight… and go!"
    );
    e.partyLines = List.of(
      "empoleon level=54 moves=flashcannon,icebeam,surf,grassknot",
      "pachirisu level=50 moves=thunderbolt,nuzzle,swagger,irontail",
      "togekiss level=55 moves=airslash,dazzlinggleam,thunderwave,roost"
    );
    return e;
  }

  private static WildTrainerEntry serena() {
    WildTrainerEntry e = base("serena", "Serena", "Fiw444", 3);
    e.preferredHomeStructures = new ArrayList<>(List.of("vaniville", "lumiose", "kalos"));
    e.dialogue = List.of(
      "&cSerena:&r Oh — hello. You carry yourself like someone who's seen quite a few battles.",
      "&cSerena:&r Kalos refined my style: grace under pressure, and trusting your partner completely.",
      "&cSerena:&r I'd love a battle that's sharp but respectful. May I challenge you?",
      "&cSerena:&r Wonderful. Let's both do our best."
    );
    e.partyLines = List.of(
      "delphox level=53 moves=psychic,flamethrower,shadowball,calmmind",
      "pancham level=50 moves=drainpunch,crunch,bulletpunch,rockslide",
      "absol level=52 moves=nightslash,playrough,swordsdance,psychocut"
    );
    return e;
  }

  private static WildTrainerEntry may() {
    WildTrainerEntry e = base("may", "May", "peepeeman6969", 3);
    e.preferredHomeStructures = new ArrayList<>(List.of("littleroot", "hoenn", "petalburg"));
    e.dialogue = List.of(
      "&6May:&r Hey, hey! Perfect timing — I was hoping someone tough would walk by!",
      "&6May:&r Hoenn's huge, and my team's been itching for a serious workout between contests.",
      "&6May:&r How about a fiery, fun battle? Loser buys… well, imaginary berries!",
      "&6May:&r Awesome! Don't go easy on me, okay?"
    );
    e.partyLines = List.of(
      "blaziken level=56 moves=flareblitz,closecombat,thunderpunch,protect",
      "beautifly level=48 moves=bugbuzz,gigadrain,quiverdance,airslash",
      "swampert level=54 moves=earthquake,liquidation,icepunch,hammerarm"
    );
    return e;
  }

  private static WildTrainerEntry base(String id, String displayName, String skin, int skill) {
    WildTrainerEntry e = new WildTrainerEntry();
    e.id = id;
    e.displayName = displayName;
    e.skinUsername = skin;
    e.skill = skill;
    e.dimension = "minecraft:overworld";
    e.x = 0.5D;
    e.y = 64.0D;
    e.z = 0.5D;
    e.yaw = 0.0F;
    e.inPool = true;
    e.useFixedPosition = false;
    e.spawn = false;
    return e;
  }
}
