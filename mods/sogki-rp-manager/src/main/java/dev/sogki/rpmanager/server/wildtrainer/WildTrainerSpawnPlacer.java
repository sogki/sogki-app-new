package dev.sogki.rpmanager.server.wildtrainer;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.service.AreaService;
import dev.sogki.rpmanager.server.util.SafeRandomTeleport;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.Heightmap;
import net.minecraft.world.border.WorldBorder;

import java.util.ArrayList;
import java.util.List;

/**
 * Picks safe surface feet for wild trainers, using the same town/structure/biome notion as {@link AreaService}
 * (via {@link AreaService#resolveAreaSnapshot}) for town-biased spawns.
 */
public final class WildTrainerSpawnPlacer {
  private WildTrainerSpawnPlacer() {
  }

  private static List<String> loreNamespaces(WildTrainerFileConfig wtCfg) {
    List<String> ns = wtCfg.loreStructureNamespaces;
    if (ns == null || ns.isEmpty()) {
      return List.of("cobblemon", "cobbletown", "cobbletowns");
    }
    return ns;
  }

  /**
   * Placement for one trainer: if {@link WildTrainerEntry#preferredHomeStructures} is non-empty, tries to find a safe
   * spot near a matching structure (players standing in one, or random wilderness probes). Otherwise uses weighted
   * town/wilderness/near-player strategies.
   */
  public static BlockPos pickLocationForTrainer(
    MinecraftServer server,
    WildTrainerFileConfig wtCfg,
    ServerFeatureConfig featCfg,
    AreaService areaService,
    ServerWorld world,
    WildTrainerEntry trainer,
    List<BlockPos> occupiedFeet,
    Random random
  ) {
    int minSep = Math.max(64, wtCfg.minTrainerSeparationBlocks);
    int loreAttempts = Math.max(40, wtCfg.lorePlacementMaxAttempts);
    List<String> prefs = trainer.preferredHomeStructures;
    boolean wantLore = prefs != null && !prefs.isEmpty();

    if (wantLore) {
      List<String> ns = loreNamespaces(wtCfg);
      for (int round = 0; round < loreAttempts; round++) {
        BlockPos anchor = pickLoreAnchor(server, world, wtCfg, random, ns, prefs);
        if (anchor == null) {
          continue;
        }
        int spread = Math.max(8, Math.min(200, wtCfg.loreStructureSpreadMaxBlocks));
        BlockPos candidate = SafeRandomTeleport.findSafeSpreadSurface(world, anchor, spread, 52, random);
        if (candidate == null) {
          continue;
        }
        if (wtCfg.enforceSpawnBiomesOnRandomPlacement && !WildTrainerBiomeRules.allows(world, candidate, trainer)) {
          continue;
        }
        if (okSeparation(candidate, occupiedFeet, minSep)) {
          return candidate;
        }
      }
    }

    int attempts = Math.max(20, wtCfg.placementMaxAttemptsPerTrainer);
    Strategy strategy = pickStrategy(wtCfg, random);
    for (int round = 0; round < attempts; round++) {
      BlockPos candidate = switch (strategy) {
        case TOWN -> pickTownBiased(server, world, wtCfg, featCfg, areaService, random);
        case NEAR_PLAYER -> pickNearPlayer(server, world, wtCfg, random);
        case WILDERNESS -> pickWilderness(world, wtCfg, random);
      };
      if (candidate == null) {
        continue;
      }
      if (wtCfg.enforceSpawnBiomesOnRandomPlacement && !WildTrainerBiomeRules.allows(world, candidate, trainer)) {
        continue;
      }
      if (!okSeparation(candidate, occupiedFeet, minSep)) {
        continue;
      }
      return candidate;
    }
    for (Strategy s : shuffledStrategies(random)) {
      if (s == strategy) {
        continue;
      }
      for (int i = 0; i < attempts / 3; i++) {
        BlockPos candidate = switch (s) {
          case TOWN -> pickTownBiased(server, world, wtCfg, featCfg, areaService, random);
          case NEAR_PLAYER -> pickNearPlayer(server, world, wtCfg, random);
          case WILDERNESS -> pickWilderness(world, wtCfg, random);
        };
        if (candidate == null) {
          continue;
        }
        if (wtCfg.enforceSpawnBiomesOnRandomPlacement && !WildTrainerBiomeRules.allows(world, candidate, trainer)) {
          continue;
        }
        if (candidate != null && okSeparation(candidate, occupiedFeet, minSep)) {
          return candidate;
        }
      }
    }
    return null;
  }

  private static BlockPos pickLoreAnchor(
    MinecraftServer server,
    ServerWorld world,
    WildTrainerFileConfig wtCfg,
    Random random,
    List<String> namespaces,
    List<String> preferredPaths
  ) {
    List<ServerPlayerEntity> inDim = new ArrayList<>();
    for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
      if (p.getWorld().getRegistryKey().equals(world.getRegistryKey())) {
        inDim.add(p);
      }
    }
    int playerTries = Math.min(24, Math.max(8, inDim.size() * 3));
    for (int i = 0; i < playerTries && !inDim.isEmpty(); i++) {
      ServerPlayerEntity p = inDim.get(random.nextInt(inDim.size()));
      BlockPos bp = p.getBlockPos();
      if (TrainerStructureAffinity.matchesPreferred(world, bp, preferredPaths, namespaces)) {
        return bp;
      }
    }
    int probes = Math.max(16, wtCfg.loreWildernessProbeAttemptsPerPass);
    for (int i = 0; i < probes; i++) {
      BlockPos probe = pickWildernessSurface(world, wtCfg, random);
      if (probe != null && TrainerStructureAffinity.matchesPreferred(world, probe, preferredPaths, namespaces)) {
        return probe;
      }
    }
    return null;
  }

  private static BlockPos pickWildernessSurface(ServerWorld world, WildTrainerFileConfig wtCfg, Random random) {
    WorldBorder border = world.getWorldBorder();
    double cx = border.getCenterX();
    double cz = border.getCenterZ();
    double borderHalf = border.getSize() / 2.0 - 48.0D;
    int maxR = Math.max(256, wtCfg.wildernessSpawnMaxRadiusBlocks);
    double half = Math.min(Math.max(64.0D, borderHalf), maxR);
    if (borderHalf < 64.0D) {
      half = Math.min(2000.0D, maxR);
    }
    int bottom = world.getBottomY();
    double rx = cx + (random.nextDouble() * 2.0D - 1.0D) * half;
    double rz = cz + (random.nextDouble() * 2.0D - 1.0D) * half;
    int x = (int) Math.floor(rx);
    int z = (int) Math.floor(rz);
    return world.getTopPosition(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, new BlockPos(x, bottom, z));
  }

  public enum Strategy {
    TOWN,
    WILDERNESS,
    NEAR_PLAYER
  }

  public static Strategy pickStrategy(WildTrainerFileConfig cfg, Random random) {
    int t = Math.max(0, cfg.townSpawnWeight);
    int w = Math.max(0, cfg.wildernessSpawnWeight);
    int n = Math.max(0, cfg.nearPlayerSpawnWeight);
    int sum = t + w + n;
    if (sum <= 0) {
      return Strategy.WILDERNESS;
    }
    int r = random.nextInt(sum);
    if (r < t) {
      return Strategy.TOWN;
    }
    if (r < t + w) {
      return Strategy.WILDERNESS;
    }
    return Strategy.NEAR_PLAYER;
  }

  /**
   * @param occupiedFeet horizontal separation is enforced against these (same world)
   */
  public static BlockPos pickLocation(
    MinecraftServer server,
    WildTrainerFileConfig wtCfg,
    ServerFeatureConfig featCfg,
    AreaService areaService,
    ServerWorld world,
    Strategy strategy,
    List<BlockPos> occupiedFeet,
    Random random
  ) {
    int minSep = Math.max(64, wtCfg.minTrainerSeparationBlocks);
    int attempts = Math.max(20, wtCfg.placementMaxAttemptsPerTrainer);

    for (int round = 0; round < attempts; round++) {
      BlockPos candidate = switch (strategy) {
        case TOWN -> pickTownBiased(server, world, wtCfg, featCfg, areaService, random);
        case NEAR_PLAYER -> pickNearPlayer(server, world, wtCfg, random);
        case WILDERNESS -> pickWilderness(world, wtCfg, random);
      };
      if (candidate == null) {
        continue;
      }
      if (!okSeparation(candidate, occupiedFeet, minSep)) {
        continue;
      }
      return candidate;
    }
    // Fallback: try other strategies
    for (Strategy s : shuffledStrategies(random)) {
      if (s == strategy) continue;
      for (int i = 0; i < attempts / 3; i++) {
        BlockPos candidate = switch (s) {
          case TOWN -> pickTownBiased(server, world, wtCfg, featCfg, areaService, random);
          case NEAR_PLAYER -> pickNearPlayer(server, world, wtCfg, random);
          case WILDERNESS -> pickWilderness(world, wtCfg, random);
        };
        if (candidate != null && okSeparation(candidate, occupiedFeet, minSep)) {
          return candidate;
        }
      }
    }
    return null;
  }

  private static List<Strategy> shuffledStrategies(Random random) {
    List<Strategy> list = new ArrayList<>(List.of(Strategy.values()));
    for (int i = list.size() - 1; i > 0; i--) {
      int j = random.nextInt(i + 1);
      Strategy tmp = list.get(i);
      list.set(i, list.get(j));
      list.set(j, tmp);
    }
    return list;
  }

  private static BlockPos pickTownBiased(
    MinecraftServer server,
    ServerWorld world,
    WildTrainerFileConfig wtCfg,
    ServerFeatureConfig featCfg,
    AreaService areaService,
    Random random
  ) {
    List<ServerPlayerEntity> inTown = new ArrayList<>();
    for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
      if (!p.getWorld().getRegistryKey().equals(world.getRegistryKey())) continue;
      AreaService.AreaSnapshot snap = areaService.resolveAreaSnapshot(p, featCfg);
      if (snap.town()) {
        inTown.add(p);
      }
    }
    if (inTown.isEmpty()) {
      return null;
    }
    ServerPlayerEntity anchor = inTown.get(random.nextInt(inTown.size()));
    int spread = Math.max(8, Math.min(160, wtCfg.townNpcSpreadMaxBlocks));
    return SafeRandomTeleport.findSafeSpreadSurface(world, anchor.getBlockPos(), spread, 45, random);
  }

  private static BlockPos pickNearPlayer(
    MinecraftServer server,
    ServerWorld world,
    WildTrainerFileConfig wtCfg,
    Random random
  ) {
    List<ServerPlayerEntity> sameDim = new ArrayList<>();
    for (ServerPlayerEntity p : server.getPlayerManager().getPlayerList()) {
      if (p.getWorld().getRegistryKey().equals(world.getRegistryKey())) {
        sameDim.add(p);
      }
    }
    if (sameDim.isEmpty()) {
      return null;
    }
    ServerPlayerEntity anchor = sameDim.get(random.nextInt(sameDim.size()));
    int minR = Math.max(32, wtCfg.nearPlayerMinOffsetBlocks);
    int maxR = Math.max(minR + 8, wtCfg.nearPlayerMaxOffsetBlocks);
    return SafeRandomTeleport.findSafeFeetSurface(world, anchor.getBlockPos(), minR, maxR, 55, random);
  }

  private static BlockPos pickWilderness(ServerWorld world, WildTrainerFileConfig wtCfg, Random random) {
    WorldBorder border = world.getWorldBorder();
    double cx = border.getCenterX();
    double cz = border.getCenterZ();
    double borderHalf = border.getSize() / 2.0 - 48.0D;
    int maxR = Math.max(256, wtCfg.wildernessSpawnMaxRadiusBlocks);
    double half = Math.min(Math.max(64.0D, borderHalf), maxR);
    if (borderHalf < 64.0D) {
      half = Math.min(2000.0D, maxR);
    }
    int bottom = world.getBottomY();
    for (int i = 0; i < 50; i++) {
      double rx = cx + (random.nextDouble() * 2.0D - 1.0D) * half;
      double rz = cz + (random.nextDouble() * 2.0D - 1.0D) * half;
      int x = (int) Math.floor(rx);
      int z = (int) Math.floor(rz);
      BlockPos surface = world.getTopPosition(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, new BlockPos(x, bottom, z));
      BlockPos rough = new BlockPos(surface.getX(), Math.min(surface.getY() + 4, world.getLogicalHeight() - 2), surface.getZ());
      BlockPos feet = SafeRandomTeleport.findSafeSpreadSurface(world, rough, 20, 28, random);
      if (feet != null) {
        return feet;
      }
    }
    return null;
  }

  private static boolean okSeparation(BlockPos candidate, List<BlockPos> occupied, int minHorizontal) {
    long minSq = (long) minHorizontal * minHorizontal;
    for (BlockPos o : occupied) {
      long dx = (long) candidate.getX() - o.getX();
      long dz = (long) candidate.getZ() - o.getZ();
      if (dx * dx + dz * dz < minSq) {
        return false;
      }
    }
    return true;
  }

  /**
   * When the trainer has {@link WildTrainerEntry#preferredHomeStructures}, tries to find safe feet near the admin
   * that still lie inside a matching structure (front arc, then square ring search). Otherwise returns null.
   */
  public static BlockPos tryPreferredAdminSummonFeet(
    ServerWorld world,
    ServerPlayerEntity anchor,
    WildTrainerEntry trainer,
    WildTrainerFileConfig cfg
  ) {
    List<String> prefs = trainer.preferredHomeStructures;
    if (prefs == null || prefs.isEmpty()) {
      return null;
    }
    List<String> ns = loreNamespaces(cfg);
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
      if (feet != null && TrainerStructureAffinity.matchesPreferred(world, feet, prefs, ns)) {
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
      if (feet != null && TrainerStructureAffinity.matchesPreferred(world, feet, prefs, ns)) {
        return feet;
      }
    }
    int ax = anchor.getBlockX();
    int az = anchor.getBlockZ();
    for (int radius = 0; radius <= 40; radius++) {
      for (int dx = -radius; dx <= radius; dx++) {
        for (int dz = -radius; dz <= radius; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) != radius) {
            continue;
          }
          int x = ax + dx;
          int z = az + dz;
          BlockPos probe = new BlockPos(x, preferY, z);
          if (!TrainerStructureAffinity.matchesPreferred(world, probe, prefs, ns)) {
            continue;
          }
          BlockPos feet = SafeRandomTeleport.findSafeFeetNearPreferredYSurface(world, x, z, preferY, 28);
          if (feet != null && TrainerStructureAffinity.matchesPreferred(world, feet, prefs, ns)) {
            return feet;
          }
        }
      }
    }
    return null;
  }

  public static ServerWorld pickWorld(MinecraftServer server, WildTrainerFileConfig wtCfg, Random random) {
    List<String> dims = wtCfg.spawnDimensions;
    if (dims == null || dims.isEmpty()) {
      dims = List.of("minecraft:overworld");
    }
    String id = dims.get(random.nextInt(dims.size()));
    if (id == null || id.isBlank()) {
      id = "minecraft:overworld";
    }
    var wid = net.minecraft.util.Identifier.tryParse(id);
    if (wid == null) {
      return server.getOverworld();
    }
    var key = net.minecraft.registry.RegistryKey.of(net.minecraft.registry.RegistryKeys.WORLD, wid);
    ServerWorld w = server.getWorld(key);
    return w != null ? w : server.getOverworld();
  }
}
