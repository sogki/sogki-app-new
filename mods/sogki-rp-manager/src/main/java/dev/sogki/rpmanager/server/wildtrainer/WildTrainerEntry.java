package dev.sogki.rpmanager.server.wildtrainer;

import java.util.ArrayList;
import java.util.List;

public final class WildTrainerEntry {
  /**
   * Unique config id (used for commands, tags, and “one live instance per id”). Multiple entries may share the same
   * {@link #displayName} (e.g. two {@code serena_route_a} / {@code serena_route_b} both named “Serena”) if
   * {@link WildTrainerFileConfig#minTrainerSeparationBlocks} keeps them far apart.
   */
  public String id = "";
  public String displayName = "";
  /**
   * Valid Java Edition player name (premium account) whose skin Cobblemon will mirror.
   * Wrong or non-existent names fall back to a default skin; pick any account whose skin matches the character.
   */
  public String skinUsername = "";
  public String dimension = "minecraft:overworld";
  public double x;
  public double y;
  public double z;
  public float yaw;
  /**
   * When {@link WildTrainerFileConfig#randomPlacement} is true: include this trainer in the random pool.
   * When random placement is off: ignored; use {@link #spawn} instead.
   */
  public boolean inPool = true;
  /**
   * When true with random placement on, this trainer uses {@link #x}/{@link #y}/{@link #z}/{@link #dimension} instead of a random spot.
   */
  public boolean useFixedPosition = false;
  /** Legacy: when {@link WildTrainerFileConfig#randomPlacement} is false, spawn only if true. */
  public boolean spawn;
  /** Cobblemon NPC battle skill 0–5 (higher = tougher AI). */
  public int skill = 3;
  /** World level passed to NPC initialize (affects scaling in some setups). */
  public int npcLevel = 50;
  /**
   * Lines shown in order; sneak advances. Use {@code ""} for a blank chat line. Color codes: {@code &a} etc.
   */
  public List<String> dialogue = new ArrayList<>();
  /** Cobblemon {@code PokemonProperties.parse} lines, e.g. {@code pikachu level=50 moves=a,b}. */
  public List<String> partyLines = new ArrayList<>();
  /**
   * Villager ambient pitch when speaking: {@code male} / {@code female} / {@code neutral} (see {@link WildTrainerDialogueMessages}).
   */
  public String voiceProfile = "neutral";

  /**
   * Biome rules for placement. Empty = any biome. Use ids ({@code minecraft:plains}) or tags ({@code #minecraft:is_forest}).
   * Used by {@link WildTrainerFileConfig#dynamicEncountersEnabled} and can filter {@link WildTrainerFileConfig#randomPlacement} picks.
   */
  public List<String> spawnBiomes = new ArrayList<>();
  /**
   * When {@link WildTrainerFileConfig#dynamicEncountersEnabled} is true, this trainer may be pulled toward players.
   * Fixed-position trainers should set {@link #useFixedPosition} true (they never use the dynamic pool).
   */
  public boolean dynamicSpawn = true;
  /** Weight in the dynamic encounter weighted random (minimum 1 at runtime). */
  public int dynamicSpawnWeight = 10;

  /**
   * Lore placement: structure id path fragments (e.g. {@code pallet_town}, {@code pokecenter}) matched against worlds
   * that use {@link WildTrainerFileConfig#loreStructureNamespaces}. Empty = only weighted town/wilderness placement.
   */
  public List<String> preferredHomeStructures = new ArrayList<>();
}
