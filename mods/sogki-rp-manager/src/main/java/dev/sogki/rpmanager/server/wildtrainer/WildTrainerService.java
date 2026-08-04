package dev.sogki.rpmanager.server.wildtrainer;

import dev.sogki.rpmanager.entity.SogkiWildTrainerEntity;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.service.AreaService;
import dev.sogki.rpmanager.server.util.SafeRandomTeleport;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.entity.Entity;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import org.slf4j.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

public final class WildTrainerService {
  public static final String WILD_TRAINER_TAG = WildTrainerEntityTags.MARKER_TAG;

  private final Logger logger;
  private final CobblemonWildTrainerBridge cobblemon;
  private final AreaService areaService;
  private final Supplier<WildTrainerFileConfig> configSupplier;
  private final Supplier<ServerFeatureConfig> featureConfigSupplier;
  private final WildTrainerDialogue dialogue = new WildTrainerDialogue();

  private final Map<String, UUID> trainerEntityUuids = new HashMap<>();
  private final Map<String, String> trainerDimensions = new HashMap<>();
  /** Last feet block where each trainer was spawned (for /list when the entity is unloaded). */
  private final Map<String, BlockPos> trainerLastFeet = new HashMap<>();
  private final Map<UUID, Engagement> engagements = new HashMap<>();
  private final Map<UUID, Boolean> lastSneaking = new HashMap<>();
  private final Map<UUID, Map<String, Long>> reengageCooldownUntil = new HashMap<>();
  private final Map<UUID, Long> playerLastTrainerInteractTick = new HashMap<>();
  /** Untagged {@code cobblemon:npc} first seen tick → discard after {@link WildTrainerFileConfig#ambientCobblemonNpcGraceTicks}. */
  private final Map<UUID, Long> ambientUntaggedCobblemonNpcSinceTick = new HashMap<>();
  private final List<PostSpawnTrainerTask> postSpawnTrainerTasks = new ArrayList<>();
  /** Hidden Cobblemon battle hosts — discard after a delay so {@code pvn} can finish wiring. */
  private final Map<UUID, Long> transientBattleNpcDiscardAtTick = new HashMap<>();

  private long serverTick;
  private boolean warnedDisabled;

  public WildTrainerService(
    Logger logger,
    CobblemonWildTrainerBridge cobblemon,
    AreaService areaService,
    Supplier<WildTrainerFileConfig> configSupplier,
    Supplier<ServerFeatureConfig> featureConfigSupplier
  ) {
    this.logger = logger;
    this.cobblemon = cobblemon;
    this.areaService = areaService;
    this.configSupplier = configSupplier == null ? WildTrainerFileConfig::empty : configSupplier;
    this.featureConfigSupplier = featureConfigSupplier == null ? ServerFeatureConfig::new : featureConfigSupplier;
  }

  public void onServerStarted(MinecraftServer server) {
    // Defer past immediate startup so overworld spawn chunks exist; respawnAll avoids blocking chunk gens via
    // TrainerStructureAffinity.chunkReadyForStructureQuery, but this still spreads load across ticks.
    server.execute(() -> respawnAll(server));
  }

  public void tick(MinecraftServer server, long tick) {
    this.serverTick = tick;
    if (server != null) {
      processPostSpawnTrainerTasks(server, tick);
      if (cobblemon.cobblemonPresent()) {
        tickTransientBattleNpcDiscards(server, tick);
      }
    }
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null) {
      cfg = WildTrainerFileConfig.empty();
    }
    if (cobblemon.cobblemonPresent() && cfg.removeAmbientCobblemonNpcs && server != null) {
      tickRemoveAmbientCobblemonNpcs(server, cfg, tick);
    }
    if (!cfg.enabled || !cobblemon.cobblemonPresent()) {
      if (!warnedDisabled && cfg.enabled && !cobblemon.cobblemonPresent()) {
        warnedDisabled = true;
        logger.info("[SogkiCobblemon] Wild trainers enabled in trainers.yml/json but Cobblemon NPCs are unavailable.");
      }
      return;
    }
    if (server == null || server.getPlayerManager() == null) {
      return;
    }
    if (cfg.relocateIntervalTicks > 0 && tick > 200 && tick % cfg.relocateIntervalTicks == 0) {
      respawnAll(server);
      return;
    }
    if (cfg.autoRespawnMissingTrainers && tick % 120L == 0L) {
      ensureTrainerEntitiesAlive(server, cfg);
    }
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      tickPlayer(server, player, cfg, tick);
    }
  }

  /**
   * Cobblemon {@code cobblemon:npc} without {@value #WILD_TRAINER_TAG} — track for optional removal of world NPCs.
   */
  public void onAmbientCobblemonNpcLoaded(Entity entity, ServerWorld world) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.removeAmbientCobblemonNpcs || !cobblemon.cobblemonPresent()) {
      return;
    }
    if (!cobblemon.isCobblemonNpcEntity(entity) || WildTrainerEntityTags.hasMarker(entity)) {
      return;
    }
    MinecraftServer server = world.getServer();
    ambientUntaggedCobblemonNpcSinceTick.put(entity.getUuid(), (long) server.getTicks());
  }

  public void onAmbientCobblemonNpcUnloaded(Entity entity) {
    ambientUntaggedCobblemonNpcSinceTick.remove(entity.getUuid());
  }

  /**
   * Re-applies nametag / skin / presentation for wild trainers in the player's dimension after join.
   */
  public void onPlayerJoined(ServerPlayerEntity player) {
    if (player == null || player.getServer() == null) {
      return;
    }
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.enabled) {
      return;
    }
    if (!(player.getWorld() instanceof ServerWorld pw)) {
      return;
    }
    String dim = pw.getRegistryKey().getValue().toString();
    for (Map.Entry<String, UUID> en : new HashMap<>(trainerEntityUuids).entrySet()) {
      if (!dim.equals(trainerDimensions.get(en.getKey()))) {
        continue;
      }
      Entity e = pw.getEntity(en.getValue());
      if (e == null || !e.isAlive() || !WildTrainerEntityTags.hasMarker(e)) {
        continue;
      }
      WildTrainerEntry t = findById(cfg, en.getKey());
      if (t == null) {
        continue;
      }
      if (e instanceof SogkiWildTrainerEntity wt) {
        wt.refreshPresentation(t, cfg);
      } else {
        applyWildTrainerNametag(e, t, cfg);
      }
      e.refreshPositionAndAngles(e.getX(), e.getY(), e.getZ(), e.getYaw(), e.getPitch());
    }
  }

  private void tickRemoveAmbientCobblemonNpcs(MinecraftServer server, WildTrainerFileConfig cfg, long tick) {
    int grace = Math.max(10, cfg.ambientCobblemonNpcGraceTicks);
    for (Map.Entry<UUID, Long> en : new ArrayList<>(ambientUntaggedCobblemonNpcSinceTick.entrySet())) {
      UUID uuid = en.getKey();
      long since = en.getValue();
      if (tick - since < grace) {
        continue;
      }
      Entity e = findEntityInAnyWorld(server, uuid);
      if (e == null || !e.isAlive()) {
        ambientUntaggedCobblemonNpcSinceTick.remove(uuid);
        continue;
      }
      if (!cobblemon.isCobblemonNpcEntity(e)) {
        ambientUntaggedCobblemonNpcSinceTick.remove(uuid);
        continue;
      }
      if (WildTrainerEntityTags.hasMarker(e)) {
        ambientUntaggedCobblemonNpcSinceTick.remove(uuid);
        continue;
      }
      e.discard();
      ambientUntaggedCobblemonNpcSinceTick.remove(uuid);
    }
  }

  private void enqueuePostSpawnTrainerSync(ServerWorld world, Entity spawned, String trainerId) {
    MinecraftServer s = world.getServer();
    if (s == null || spawned == null || trainerId == null) {
      return;
    }
    int now = s.getTicks();
    for (int d : new int[]{1, 2, 3, 5, 10, 20, 40, 80, 120, 200}) {
      postSpawnTrainerTasks.add(new PostSpawnTrainerTask(trainerId, spawned.getUuid(), now + d));
    }
  }

  private void processPostSpawnTrainerTasks(MinecraftServer server, long tick) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null) {
      cfg = WildTrainerFileConfig.empty();
    }
    WildTrainerFileConfig cfgFinal = cfg;
    postSpawnTrainerTasks.removeIf(task -> {
      if (tick < task.runAtTick) {
        return false;
      }
      Entity e = findEntityInAnyWorld(server, task.entityUuid);
      if (e == null || !e.isAlive() || !WildTrainerEntityTags.hasMarker(e)) {
        return true;
      }
      WildTrainerEntry t = findById(cfgFinal, task.trainerId);
      if (t == null) {
        return true;
      }
      if (e instanceof SogkiWildTrainerEntity wt) {
        wt.refreshPresentation(t, cfgFinal);
      } else {
        applyWildTrainerNametag(e, t, cfgFinal);
      }
      e.refreshPositionAndAngles(e.getX(), e.getY(), e.getZ(), e.getYaw(), e.getPitch());
      return true;
    });
  }

  private void tickTransientBattleNpcDiscards(MinecraftServer server, long tick) {
    transientBattleNpcDiscardAtTick.entrySet().removeIf(en -> {
      if (tick < en.getValue()) {
        return false;
      }
      Entity e = findEntityInAnyWorld(server, en.getKey());
      if (e != null) {
        e.discard();
      }
      return true;
    });
  }

  private void scheduleTransientBattleNpcDiscard(MinecraftServer server, UUID npcUuid) {
    if (server == null || npcUuid == null) {
      return;
    }
    WildTrainerFileConfig cfg = configSupplier.get();
    long delay = cfg == null ? 600L : Math.max(60L, cfg.transientBattleHostLifetimeTicks);
    transientBattleNpcDiscardAtTick.put(npcUuid, serverTick + delay);
  }

  private static final class PostSpawnTrainerTask {
    final String trainerId;
    final UUID entityUuid;
    final int runAtTick;

    PostSpawnTrainerTask(String trainerId, UUID entityUuid, int runAtTick) {
      this.trainerId = trainerId;
      this.entityUuid = entityUuid;
      this.runAtTick = runAtTick;
    }
  }

  private static Entity findEntityInAnyWorld(MinecraftServer server, UUID uuid) {
    for (ServerWorld w : server.getWorlds()) {
      Entity e = w.getEntity(uuid);
      if (e != null) {
        return e;
      }
    }
    return null;
  }

  private void syncTrainerWanderPauseForEntity(Entity e, boolean engaged) {
    if (e instanceof SogkiWildTrainerEntity ste) {
      ste.setPauseRandomWander(engaged);
    }
  }

  private Entity resolveEngagedEntity(MinecraftServer server, Engagement eng) {
    if (server == null || eng == null) {
      return null;
    }
    if (eng.engagedEntityUuid != null) {
      Entity e = findEntityInAnyWorld(server, eng.engagedEntityUuid);
      if (e != null && e.isAlive() && WildTrainerEntityTags.hasMarker(e)) {
        String id = trainerIdForEntity(e);
        if (id != null && id.equalsIgnoreCase(eng.trainerId)) {
          return e;
        }
      }
      return null;
    }
    return findLiveTrainerEntity(server, eng.trainerId);
  }

  private void tickPlayer(MinecraftServer server, ServerPlayerEntity player, WildTrainerFileConfig cfg, long tick) {
    UUID pUuid = player.getUuid();
    boolean sneaking = player.isSneaking();
    boolean wasSneaking = Boolean.TRUE.equals(lastSneaking.get(pUuid));
    boolean sneakEdge = sneaking && !wasSneaking;
    lastSneaking.put(pUuid, sneaking);

    double continueMax = Math.max(1.0D, cfg.dialogueContinueMaxDistanceBlocks);
    double continueSq = continueMax * continueMax;

    Engagement eng = engagements.get(pUuid);
    if (eng != null) {
      Entity trainerEnt = resolveEngagedEntity(server, eng);
      if (trainerEnt == null || !trainerEnt.isAlive()) {
        syncTrainerWanderPauseForEntity(trainerEnt, false);
        engagements.remove(pUuid);
        return;
      }
      if (player.squaredDistanceTo(trainerEnt) > continueSq) {
        Phase ended = eng.phase;
        String tid = eng.trainerId;
        syncTrainerWanderPauseForEntity(trainerEnt, false);
        engagements.remove(pUuid);
        if (ended == Phase.AWAITING_RESPONSE) {
          noteCooldown(pUuid, tid, cfg.reEngageCooldownTicks);
        }
        return;
      }
      WildTrainerEntry entry = findById(cfg, eng.trainerId);
      if (entry == null) {
        syncTrainerWanderPauseForEntity(trainerEnt, false);
        engagements.remove(pUuid);
        return;
      }
      if (eng.phase == Phase.DIALOGUE && sneakEdge && tick >= eng.nextAdvanceAllowedTick) {
        eng.nextAdvanceAllowedTick = tick + Math.max(4, cfg.sneakAdvanceCooldownTicks);
        int next = eng.lineIndex + 1;
        if (entry.dialogue != null && next < entry.dialogue.size()) {
          eng.lineIndex = next;
          dialogue.pushDialogueLine(player, entry, eng.lineIndex, cfg, trainerEnt);
        } else {
          eng.phase = Phase.AWAITING_RESPONSE;
          dialogue.sendDuelPrompt(player, entry, cfg, trainerEnt);
        }
      }
      return;
    }

    if (cfg.requireRightClickToStart) {
      return;
    }

    WildTrainerEntry nearest = nearestTrainer(player, cfg);
    if (nearest == null) {
      return;
    }
    if (onCooldown(pUuid, nearest.id, tick)) {
      return;
    }
    Entity nearEnt = findLiveTrainerEntity(server, nearest.id);
    eng = new Engagement(nearest.id);
    eng.engagedEntityUuid = nearEnt != null ? nearEnt.getUuid() : null;
    eng.phase = Phase.DIALOGUE;
    eng.lineIndex = 0;
    eng.nextAdvanceAllowedTick = tick;
    engagements.put(pUuid, eng);
    if (nearEnt != null) {
      syncTrainerWanderPauseForEntity(nearEnt, true);
    }
    dialogue.pushDialogueLine(player, nearest, 0, cfg, nearEnt);
  }

  /**
   * Right-click on a {@value #WILD_TRAINER_TAG} entity: start or resume Sogki dialogue (Cobblemon UI stays blocked).
   */
  public void onWildTrainerClicked(ServerPlayerEntity player, MinecraftServer server, Entity entity) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.enabled || !cobblemon.cobblemonPresent()) {
      return;
    }
    if (!WildTrainerEntityTags.hasMarker(entity)) {
      return;
    }
    long tick = server.getTicks();
    int cd = Math.max(0, cfg.interactCooldownTicks);
    Long last = playerLastTrainerInteractTick.get(player.getUuid());
    if (last != null && tick - last < cd) {
      return;
    }
    String trainerId = trainerIdForEntity(entity);
    if (trainerId == null) {
      return;
    }
    WildTrainerEntry def = findById(cfg, trainerId);
    if (def == null) {
      return;
    }
    if (player.squaredDistanceTo(entity) > 5.0 * 5.0) {
      return;
    }
    playerLastTrainerInteractTick.put(player.getUuid(), tick);

    Engagement eng = engagements.get(player.getUuid());
    if (eng != null && eng.trainerId.equalsIgnoreCase(trainerId)) {
      if (eng.phase == Phase.DIALOGUE) {
        player.sendMessage(
          Text.literal(TemplateEngine.render("&7Use &fShift&7 to continue this conversation.&r", Map.of())),
          false
        );
        return;
      }
      if (eng.phase == Phase.AWAITING_RESPONSE) {
        dialogue.sendDuelPrompt(player, def, cfg, entity);
        return;
      }
    }
    if (eng != null && !eng.trainerId.equalsIgnoreCase(trainerId)) {
      Entity oldEnt = resolveEngagedEntity(server, eng);
      syncTrainerWanderPauseForEntity(oldEnt, false);
      engagements.remove(player.getUuid());
    }
    if (onCooldown(player.getUuid(), trainerId, tick)) {
      player.sendMessage(
        Text.literal(TemplateEngine.render("&7This trainer isn't ready to talk again yet.&r", Map.of())),
        false
      );
      return;
    }
    eng = new Engagement(trainerId);
    eng.engagedEntityUuid = entity.getUuid();
    eng.phase = Phase.DIALOGUE;
    eng.lineIndex = 0;
    eng.nextAdvanceAllowedTick = tick;
    engagements.put(player.getUuid(), eng);
    syncTrainerWanderPauseForEntity(entity, true);
    dialogue.pushDialogueLine(player, def, 0, cfg, entity);
  }

  private String trainerIdForEntity(Entity entity) {
    String safe = WildTrainerEntityTags.parseTrainerIdTag(entity);
    if (safe != null) {
      WildTrainerFileConfig cfg = configSupplier.get();
      WildTrainerEntry t = findEntryForTagSafeId(cfg, safe);
      if (t != null) {
        return t.id;
      }
    }
    return trainerIdForEntityUuid(entity.getUuid());
  }

  private WildTrainerEntry findEntryForTagSafeId(WildTrainerFileConfig cfg, String safeFromTag) {
    if (cfg == null || cfg.trainers == null || safeFromTag == null) {
      return null;
    }
    for (WildTrainerEntry t : cfg.trainers) {
      if (t == null || t.id == null) {
        continue;
      }
      if (t.id.equalsIgnoreCase(safeFromTag)) {
        return t;
      }
      String s = WildTrainerEntityTags.safeId(t.id);
      if (s != null && s.equalsIgnoreCase(safeFromTag)) {
        return t;
      }
    }
    return null;
  }

  private Entity findLiveTrainerEntity(MinecraftServer server, String trainerId) {
    if (server == null || trainerId == null) {
      return null;
    }
    UUID mapped = trainerEntityUuids.get(trainerId);
    String dim = trainerDimensions.get(trainerId);
    if (mapped != null && dim != null) {
      ServerWorld w = resolveWorld(server, dim);
      Entity e = w != null ? w.getEntity(mapped) : null;
      if (e != null && e.isAlive() && WildTrainerEntityTags.hasMarker(e)) {
        return e;
      }
    }
    String idTag = WildTrainerEntityTags.fullIdTag(trainerId);
    if (idTag == null) {
      return null;
    }
    for (ServerWorld w : server.getWorlds()) {
      for (Entity e : w.iterateEntities()) {
        if (e.isAlive() && WildTrainerEntityTags.hasMarker(e) && e.getCommandTags().contains(idTag)) {
          return e;
        }
      }
    }
    return null;
  }

  private String trainerIdForEntityUuid(UUID entityUuid) {
    for (Map.Entry<String, UUID> e : trainerEntityUuids.entrySet()) {
      if (entityUuid.equals(e.getValue())) {
        return e.getKey();
      }
    }
    return null;
  }

  private void applyWildTrainerNametag(Entity entity, WildTrainerEntry t, WildTrainerFileConfig cfg) {
    if (entity instanceof SogkiWildTrainerEntity wt) {
      wt.refreshPresentation(t, cfg);
      return;
    }
    if (cobblemon.isCobblemonNpcEntity(entity)) {
      cobblemon.refreshWildTrainerPresentation(entity, t, cfg);
      return;
    }
    WildTrainerNametags.applyVanillaStyle(entity, t, cfg);
  }

  public int acceptDuel(ServerPlayerEntity player, String trainerId) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.enabled) {
      player.sendMessage(Text.literal("Wild trainers are disabled."), false);
      return 0;
    }
    WildTrainerEntry def = findById(cfg, trainerId);
    if (def == null) {
      player.sendMessage(Text.literal("Unknown trainer."), false);
      return 0;
    }
    Engagement eng = engagements.get(player.getUuid());
    if (eng == null || !def.id.equals(eng.trainerId) || eng.phase != Phase.AWAITING_RESPONSE) {
      player.sendMessage(Text.literal("You don't have a pending challenge from that trainer."), false);
      return 0;
    }
    Entity live = resolveEngagedEntity(player.getServer(), eng);
    if (live == null) {
      player.sendMessage(Text.literal("That trainer is not available right now."), false);
      return 0;
    }
    syncTrainerWanderPauseForEntity(live, false);
    engagements.remove(player.getUuid());
    if (cobblemon.isCobblemonNpcEntity(live)) {
      boolean ok = cobblemon.startTrainerBattle(player, live);
      if (!ok) {
        noteCooldown(player.getUuid(), trainerId, cfg.reEngageCooldownTicks);
        return 0;
      }
      return 1;
    }
    Entity battleNpc = cobblemon.createTransientBattleNpc(player.getServerWorld(), player, def);
    if (battleNpc == null) {
      player.sendMessage(Text.literal("Could not prepare that battle."), false);
      noteCooldown(player.getUuid(), trainerId, cfg.reEngageCooldownTicks);
      return 0;
    }
    boolean ok = cobblemon.startTrainerBattle(player, battleNpc);
    if (!ok) {
      battleNpc.discard();
      transientBattleNpcDiscardAtTick.remove(battleNpc.getUuid());
      noteCooldown(player.getUuid(), trainerId, cfg.reEngageCooldownTicks);
      return 0;
    }
    scheduleTransientBattleNpcDiscard(player.getServer(), battleNpc.getUuid());
    return 1;
  }

  public int denyDuel(ServerPlayerEntity player, String trainerId) {
    WildTrainerFileConfig cfg = configSupplier.get();
    Engagement eng = engagements.get(player.getUuid());
    if (eng == null || !trainerId.equalsIgnoreCase(eng.trainerId)) {
      player.sendMessage(Text.literal("Nothing to decline."), false);
      return 0;
    }
    Entity ent = resolveEngagedEntity(player.getServer(), eng);
    syncTrainerWanderPauseForEntity(ent, false);
    engagements.remove(player.getUuid());
    if (cfg != null) {
      noteCooldown(player.getUuid(), trainerId, cfg.reEngageCooldownTicks);
    }
    player.sendMessage(Text.literal("You declined the battle."), false);
    return 1;
  }

  private void noteCooldown(UUID player, String trainerId, int ticks) {
    reengageCooldownUntil
      .computeIfAbsent(player, u -> new HashMap<>())
      .put(trainerId, serverTick + Math.max(20, ticks));
  }

  private boolean onCooldown(UUID player, String trainerId, long tick) {
    Map<String, Long> m = reengageCooldownUntil.get(player);
    if (m == null) return false;
    Long until = m.get(trainerId);
    return until != null && tick < until;
  }

  private WildTrainerEntry nearestTrainer(ServerPlayerEntity player, WildTrainerFileConfig cfg) {
    String dim = player.getWorld().getRegistryKey().getValue().toString();
    double maxSq = cfg.proximity * cfg.proximity;
    WildTrainerEntry best = null;
    double bestD = Double.MAX_VALUE;
    MinecraftServer server = player.getServer();
    if (server == null) return null;
    for (String id : trainerEntityUuids.keySet()) {
      if (!dim.equals(trainerDimensions.get(id))) continue;
      UUID uuid = trainerEntityUuids.get(id);
      if (uuid == null) continue;
      ServerWorld w = resolveWorld(server, dim);
      if (w == null) continue;
      Entity e = w.getEntity(uuid);
      if (e == null || !e.isAlive() || !WildTrainerEntityTags.hasMarker(e)) continue;
      WildTrainerEntry def = findById(cfg, id);
      if (def == null) continue;
      double d = player.squaredDistanceTo(e);
      if (d <= maxSq && d < bestD) {
        bestD = d;
        best = def;
      }
    }
    return best;
  }

  private WildTrainerEntry findById(WildTrainerFileConfig cfg, String id) {
    if (cfg.trainers == null) return null;
    for (WildTrainerEntry t : cfg.trainers) {
      if (t != null && id.equalsIgnoreCase(t.id)) {
        return t;
      }
    }
    return null;
  }

  private Entity findEntity(MinecraftServer server, String trainerId, UUID uuid) {
    String dim = trainerDimensions.get(trainerId);
    ServerWorld world = resolveWorld(server, dim);
    return world == null ? null : world.getEntity(uuid);
  }

  public void respawnAll(MinecraftServer server) {
    WildTrainerFileConfig cfg = configSupplier.get();
    ServerFeatureConfig feat = featureConfigSupplier.get();
    discardAllWildTrainers(server);
    trainerEntityUuids.clear();
    trainerDimensions.clear();
    trainerLastFeet.clear();
    playerLastTrainerInteractTick.clear();
    postSpawnTrainerTasks.clear();
    transientBattleNpcDiscardAtTick.clear();
    engagements.clear();
    if (cfg == null || !cfg.enabled || !cobblemon.cobblemonPresent()) {
      return;
    }

    Random random = random(server);
    if (cfg.randomPlacement) {
      List<WildTrainerEntry> pool = new ArrayList<>();
      for (WildTrainerEntry t : cfg.trainers) {
        if (t != null && t.id != null && !t.id.isBlank() && t.inPool) {
          pool.add(t);
        }
      }
      Collections.shuffle(pool, ThreadLocalRandom.current());
      List<BlockPos> occupied = new ArrayList<>();
      for (WildTrainerEntry t : pool) {
        ServerWorld world;
        BlockPos feet;
        if (t.useFixedPosition) {
          world = resolveWorld(server, t.dimension);
          feet = BlockPos.ofFloored(t.x, t.y, t.z);
          if (world == null || !okSeparation(cfg, feet, occupied)) {
            if (world != null && !okSeparation(cfg, feet, occupied)) {
              logger.warn("[SogkiCobblemon] Wild trainer {} fixed position is too close to another — skipped.", t.id);
            }
            continue;
          }
        } else {
          world = WildTrainerSpawnPlacer.pickWorld(server, cfg, random);
          feet = WildTrainerSpawnPlacer.pickLocationForTrainer(server, cfg, feat, areaService, world, t, occupied, random);
          if (feet == null) {
            logger.warn("[SogkiCobblemon] Could not place wild trainer {} (no valid spot).", t.id);
            continue;
          }
        }
        float yaw = random.nextFloat() * 360.0F;
        if (!spawnPlacedNpc(cfg, world, t, feet, yaw, occupied, true)) {
          logger.warn("[SogkiCobblemon] Could not spawn wild trainer {} after placement.", t.id);
        }
      }
    } else {
      for (WildTrainerEntry t : cfg.trainers) {
        if (t == null || !t.spawn || t.id == null || t.id.isBlank()) continue;
        ServerWorld world = resolveWorld(server, t.dimension);
        if (world == null) {
          logger.warn("[SogkiCobblemon] Wild trainer {}: unknown dimension {}", t.id, t.dimension);
          continue;
        }
        BlockPos feet = BlockPos.ofFloored(t.x, t.y, t.z);
        spawnPlacedNpc(cfg, world, t, feet, t.yaw, new ArrayList<>(), true);
      }
    }
  }

  private boolean spawnPlacedNpc(
    WildTrainerFileConfig cfg,
    ServerWorld world,
    WildTrainerEntry t,
    BlockPos feet,
    float yaw,
    List<BlockPos> occupied
  ) {
    return spawnPlacedNpc(cfg, world, t, feet, yaw, occupied, true);
  }

  /**
   * @param registerAsPrimary when true, this spawn becomes the tracked world trainer for {@code t.id}
   *                          (map, respawn, /locate). When false, spawns an extra copy (e.g. admin summon)
   *                          without relocating or discarding the primary entity.
   */
  private boolean spawnPlacedNpc(
    WildTrainerFileConfig cfg,
    ServerWorld world,
    WildTrainerEntry t,
    BlockPos feet,
    float yaw,
    List<BlockPos> occupied,
    boolean registerAsPrimary
  ) {
    double x = feet.getX() + 0.5D;
    double y = feet.getY();
    double z = feet.getZ() + 0.5D;
    MinecraftServer srv = world.getServer();
    Entity spawned = SogkiWildTrainerNpc.spawn(world, srv, x, y, z, yaw, t, cfg);
    if (spawned != null) {
      if (registerAsPrimary) {
        trainerEntityUuids.put(t.id, spawned.getUuid());
        trainerDimensions.put(t.id, world.getRegistryKey().getValue().toString());
        trainerLastFeet.put(t.id, feet.toImmutable());
        occupied.add(feet.toImmutable());
      }
      enqueuePostSpawnTrainerSync(world, spawned, t.id);
      logger.info("[SogkiCobblemon] Spawned wild trainer {} ({}) at {} [{}, {}, {}]{}",
        t.id, t.displayName, world.getRegistryKey().getValue(), feet.getX(), feet.getY(), feet.getZ(),
        registerAsPrimary ? "" : " (extra copy, primary unchanged)");
      return true;
    }
    logger.warn("[SogkiCobblemon] Failed to spawn wild trainer {}", t.id);
    return false;
  }

  private static boolean okSeparation(WildTrainerFileConfig cfg, BlockPos candidate, List<BlockPos> occupied) {
    int min = Math.max(64, cfg.minTrainerSeparationBlocks);
    long minSq = (long) min * min;
    for (BlockPos o : occupied) {
      long dx = (long) candidate.getX() - o.getX();
      long dz = (long) candidate.getZ() - o.getZ();
      if (dx * dx + dz * dz < minSq) {
        return false;
      }
    }
    return true;
  }

  private void discardAllWildTrainers(MinecraftServer server) {
    if (server == null) return;
    for (ServerWorld w : server.getWorlds()) {
      for (Entity e : w.iterateEntities()) {
        if (WildTrainerEntityTags.hasMarker(e)) {
          e.discard();
        }
      }
    }
  }

  private void removeSpawnedEntities(MinecraftServer server) {
    discardAllWildTrainers(server);
  }

  private void ensureTrainerEntitiesAlive(MinecraftServer server, WildTrainerFileConfig cfg) {
    ServerFeatureConfig feat = featureConfigSupplier.get();
    if (cfg.trainers == null) return;
    for (WildTrainerEntry t : cfg.trainers) {
      if (t == null || t.id == null) continue;
      boolean active = cfg.randomPlacement ? t.inPool : t.spawn;
      if (!active) continue;
      UUID eu = trainerEntityUuids.get(t.id);
      if (eu == null) continue;
      Entity e = findEntity(server, t.id, eu);
      if (e != null && e.isAlive()) continue;
      logger.info("[SogkiCobblemon] Respawning missing wild trainer {}", t.id);
      trainerEntityUuids.remove(t.id);
      trainerDimensions.remove(t.id);
      List<BlockPos> occupied = collectOccupiedFeet(server);
      respawnOneTrainer(server, cfg, feat, t, occupied);
    }
  }

  private List<BlockPos> collectOccupiedFeet(MinecraftServer server) {
    List<BlockPos> out = new ArrayList<>();
    for (Map.Entry<String, UUID> en : trainerEntityUuids.entrySet()) {
      Entity e = findEntity(server, en.getKey(), en.getValue());
      if (e != null && e.isAlive()) {
        out.add(BlockPos.ofFloored(e.getX(), e.getY(), e.getZ()));
      }
    }
    return out;
  }

  private void respawnOneTrainer(
    MinecraftServer server,
    WildTrainerFileConfig cfg,
    ServerFeatureConfig feat,
    WildTrainerEntry t,
    List<BlockPos> occupied
  ) {
    Random random = random(server);
    ServerWorld world;
    BlockPos feet;
    if (cfg.randomPlacement) {
      if (t.useFixedPosition) {
        world = resolveWorld(server, t.dimension);
        feet = BlockPos.ofFloored(t.x, t.y, t.z);
        if (world == null || !okSeparation(cfg, feet, occupied)) {
          return;
        }
      } else {
        world = WildTrainerSpawnPlacer.pickWorld(server, cfg, random);
        feet = WildTrainerSpawnPlacer.pickLocationForTrainer(server, cfg, feat, areaService, world, t, occupied, random);
        if (feet == null) {
          return;
        }
      }
    } else {
      world = resolveWorld(server, t.dimension);
      feet = BlockPos.ofFloored(t.x, t.y, t.z);
    }
    if (world == null) return;
    float yaw = random.nextFloat() * 360.0F;
    if (!spawnPlacedNpc(cfg, world, t, feet, yaw, occupied, true)) {
      logger.warn("[SogkiCobblemon] Respawn failed for wild trainer {}", t.id);
    }
  }

  private static ServerWorld resolveWorld(MinecraftServer server, String dim) {
    if (server == null || dim == null || dim.isBlank()) return null;
    Identifier id = Identifier.tryParse(dim);
    if (id == null) return null;
    RegistryKey<net.minecraft.world.World> key = RegistryKey.of(RegistryKeys.WORLD, id);
    return server.getWorld(key);
  }

  private static Random random(MinecraftServer server) {
    if (server == null || server.getOverworld() == null) {
      return Random.create();
    }
    return server.getOverworld().getRandom();
  }

  public Iterable<String> trainerIds() {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || cfg.trainers == null) return List.of();
    List<String> out = new ArrayList<>();
    for (WildTrainerEntry t : cfg.trainers) {
      if (t != null && t.id != null && !t.id.isBlank()) {
        out.add(t.id);
      }
    }
    return out;
  }

  /**
   * Picks a spot a few blocks in front of the player at roughly the same Y, so admin summons are visible.
   * Avoids {@link SafeRandomTeleport#findSafeFeetInColumn}'s "highest in column" behaviour (roofs / far surfaces).
   */
  private static BlockPos findSummonFeetNearPlayer(ServerWorld world, ServerPlayerEntity anchor) {
    float yaw = anchor.getYaw();
    double rad = Math.toRadians(yaw);
    int preferY = anchor.getBlockY();
    double[] distances = {2.4, 2.0, 2.8, 3.4, 1.6, 3.0};
    for (double dist : distances) {
      double dx = -Math.sin(rad) * dist;
      double dz = Math.cos(rad) * dist;
      int x = (int) Math.floor(anchor.getX() + dx);
      int z = (int) Math.floor(anchor.getZ() + dz);
      BlockPos feet = SafeRandomTeleport.findSafeFeetNearPreferredYSurface(world, x, z, preferY, 24);
      if (feet != null) {
        return feet;
      }
    }
    float side = yaw + 90.0F;
    double sideRad = Math.toRadians(side);
    for (double dist : new double[]{2.2, 2.8}) {
      double dx = -Math.sin(sideRad) * dist;
      double dz = Math.cos(sideRad) * dist;
      int x = (int) Math.floor(anchor.getX() + dx);
      int z = (int) Math.floor(anchor.getZ() + dz);
      BlockPos feet = SafeRandomTeleport.findSafeFeetNearPreferredYSurface(world, x, z, preferY, 24);
      if (feet != null) {
        return feet;
      }
    }
    return null;
  }

  /**
   * Spawns an additional trainer NPC near {@code anchor} without discarding or retargeting the tracked
   * world spawn for that id (see {@link #spawnPlacedNpc} {@code registerAsPrimary=false}).
   *
   * @return 0 success, 1 disabled in config, 2 Cobblemon unavailable, 3 unknown id, 4 no safe spot, 5 spawn failed
   */
  public int adminSummonTrainerNear(MinecraftServer server, ServerPlayerEntity anchor, String trainerId) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.enabled) {
      return 1;
    }
    if (!cobblemon.cobblemonPresent()) {
      return 2;
    }
    WildTrainerEntry t = findById(cfg, trainerId);
    if (t == null) {
      return 3;
    }
    ServerWorld world = anchor.getServerWorld();
    Random r = random(server);
    BlockPos feet = WildTrainerSpawnPlacer.tryPreferredAdminSummonFeet(world, anchor, t, cfg);
    if (feet == null) {
      feet = findSummonFeetNearPlayer(world, anchor);
    }
    if (feet == null) {
      feet = SafeRandomTeleport.findSafeFeetSurface(world, anchor.getBlockPos(), 0, 12, 48, r);
    }
    if (feet == null) {
      feet = SafeRandomTeleport.findSafeSpreadSurface(world, anchor.getBlockPos(), 8, 64, r);
    }
    if (feet == null) {
      feet = SafeRandomTeleport.findSafeFeetInSurfaceColumn(
        world,
        anchor.getBlockPos().getX(),
        anchor.getBlockPos().getZ(),
        SafeRandomTeleport.FeetSearchOptions.unrestricted()
      );
    }
    if (feet == null) {
      return 4;
    }
    float yaw = r.nextFloat() * 360.0F;
    if (!spawnPlacedNpc(cfg, world, t, feet, yaw, new ArrayList<>(), false)) {
      return 5;
    }
    return 0;
  }

  public void adminListSpawnedTrainers(ServerCommandSource source, MinecraftServer server) {
    WildTrainerFileConfig cfg = configSupplier.get();
    if (cfg == null || !cfg.enabled) {
      source.sendError(Text.literal("Wild trainers are disabled (trainers.yml / trainers.json)."));
      return;
    }
    if (trainerEntityUuids.isEmpty()) {
      source.sendFeedback(() -> Text.literal("No wild trainer NPCs are currently tracked (respawn with /sogkiadmin trainers respawn)."), false);
      return;
    }
    for (String id : trainerEntityUuids.keySet()) {
      UUID u = trainerEntityUuids.get(id);
      String dim = trainerDimensions.get(id);
      if (u == null || dim == null) {
        continue;
      }
      ServerWorld w = resolveWorld(server, dim);
      if (w == null) {
        continue;
      }
      Entity e = w.getEntity(u);
      if (e == null || !e.isAlive()) {
        BlockPos last = trainerLastFeet.get(id);
        String tail = last == null
          ? " — try /sogkiadmin trainers respawn"
          : " — last spawn ~" + last.getX() + " ~" + last.getY() + " ~" + last.getZ()
            + " (chunk may be unloaded; /sogkiadmin trainers summon " + id + " spawns a test copy near you)";
        source.sendFeedback(() -> Text.literal(id + ": entity not loaded" + tail), false);
        continue;
      }
      BlockPos p = BlockPos.ofFloored(e.getX(), e.getY(), e.getZ());
      source.sendFeedback(() -> Text.literal(
        id + " @ " + dim + " ~" + p.getX() + " ~" + p.getY() + " ~" + p.getZ()
      ), false);
    }
  }

  /**
   * @return false if {@code trainerId} is not defined in trainers.yml / trainers.json
   */
  public boolean adminLocateTrainer(ServerCommandSource source, MinecraftServer server, String trainerId) {
    WildTrainerFileConfig cfg = configSupplier.get();
    WildTrainerEntry t = findById(cfg, trainerId);
    if (t == null) {
      return false;
    }
    UUID u = trainerEntityUuids.get(trainerId);
    String dim = trainerDimensions.get(trainerId);
    if (u == null || dim == null) {
      source.sendError(Text.literal("Trainer \"" + trainerId + "\" is not spawned. Try /sogkiadmin trainers respawn."));
      return true;
    }
    ServerWorld w = resolveWorld(server, dim);
    Entity e = w == null ? null : w.getEntity(u);
    if (e == null || !e.isAlive()) {
      source.sendError(Text.literal("Trainer \"" + trainerId + "\" is not spawned. Try /sogkiadmin trainers respawn."));
      return true;
    }
    BlockPos p = BlockPos.ofFloored(e.getX(), e.getY(), e.getZ());
    source.sendFeedback(() -> Text.literal(
      t.displayName + " (" + trainerId + ") at " + dim + " ~" + p.getX() + " ~" + p.getY() + " ~" + p.getZ()
        + " — /sogkiadmin trainers summon " + trainerId + " spawns an extra copy near you (does not move this one)."
    ), false);
    return true;
  }

  private enum Phase {
    DIALOGUE,
    AWAITING_RESPONSE
  }

  private static final class Engagement {
    final String trainerId;
    /** When non-null, dialogue and duels use this entity (e.g. admin summon clone). */
    UUID engagedEntityUuid;
    Phase phase = Phase.DIALOGUE;
    int lineIndex;
    long nextAdvanceAllowedTick;

    Engagement(String trainerId) {
      this.trainerId = trainerId;
    }
  }
}
