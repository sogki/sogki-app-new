package dev.sogki.rpmanager.server.util;

import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.registry.RegistryKey;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.Heightmap;
import net.minecraft.world.World;
import net.minecraft.world.border.WorldBorder;

import java.util.Set;

public final class SafeRandomTeleport {
  /**
   * Wild trainers: only search near the column's outdoor surface so we never pick the top walkable spot in a cave
   * (full-column scan goes from build height downward and happily lands underground).
   */
  private static final int WILD_TRAINER_MAX_BLOCKS_ABOVE_SURFACE = 18;
  private static final int WILD_TRAINER_MAX_BLOCKS_BELOW_SURFACE = 32;

  private SafeRandomTeleport() {
  }

  /**
   * RTP / general constraints on feet Y and floor block type. Use {@link #unrestricted()} for wild trainers etc.
   */
  public static final class FeetSearchOptions {
    private final int minFeetY;
    private final int maxFeetY;
    private final Set<Block> floorWhitelist;

    private FeetSearchOptions(int minFeetY, int maxFeetY, Set<Block> floorWhitelist) {
      this.minFeetY = minFeetY;
      this.maxFeetY = maxFeetY;
      this.floorWhitelist = floorWhitelist == null ? Set.of() : floorWhitelist;
    }

    public static FeetSearchOptions unrestricted() {
      return new FeetSearchOptions(Integer.MIN_VALUE, Integer.MAX_VALUE, Set.of());
    }

    /**
     * @param minFeetY inclusive; use {@code null} for no minimum
     * @param maxFeetY inclusive; use {@code null} for no maximum
     * @param floorWhitelist if empty, any {@link #isSafeFloor safe} block counts
     */
    public static FeetSearchOptions rtp(ServerWorld world, Integer minFeetY, Integer maxFeetY, Set<Block> floorWhitelist) {
      int bottom = world.getBottomY();
      int top = world.getLogicalHeight() - 2;
      int min = minFeetY == null ? Integer.MIN_VALUE : Math.max(bottom + 2, minFeetY);
      int max = maxFeetY == null ? Integer.MAX_VALUE : Math.min(top, maxFeetY);
      if (min > max) {
        return unrestricted();
      }
      Set<Block> wl = floorWhitelist == null ? Set.of() : floorWhitelist;
      return new FeetSearchOptions(min, max, wl);
    }

    boolean allowsFeetY(int y) {
      return y >= minFeetY && y <= maxFeetY;
    }

    boolean acceptsFloor(ServerWorld world, BlockPos floorPos) {
      if (!isSafeFloor(world, floorPos)) {
        return false;
      }
      if (floorWhitelist.isEmpty()) {
        return true;
      }
      return floorWhitelist.contains(world.getBlockState(floorPos).getBlock());
    }
  }

  /**
   * Picks a random horizontal point between {@code minRadius} and {@code maxRadius} from {@code origin},
   * then scans the column top-down for two clear blocks with a solid, non-hazard floor (not lava/fire),
   * not standing in fluids. Uses the world border and falls back to random in-border columns if the ring fails.
   */
  public static BlockPos findSafeFeet(
    ServerWorld world,
    BlockPos origin,
    int minRadius,
    int maxRadius,
    int maxAttempts,
    Random random,
    FeetSearchOptions options
  ) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    if (minRadius < 0) minRadius = 0;
    if (maxRadius < minRadius) maxRadius = minRadius;
    int worldBottom = world.getBottomY();
    int worldTop = world.getLogicalHeight() - 2;
    WorldBorder border = world.getWorldBorder();

    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      double angle = random.nextDouble() * Math.PI * 2;
      int dist = minRadius + (maxRadius > minRadius ? random.nextInt(maxRadius - minRadius + 1) : 0);
      int x = origin.getX() + (int) (Math.cos(angle) * dist);
      int z = origin.getZ() + (int) (Math.sin(angle) * dist);
      BlockPos probe = new BlockPos(x, worldBottom, z);
      if (!border.contains(probe)) {
        continue;
      }
      BlockPos feet = findSafeFeetInColumn(world, x, z, worldBottom, worldTop, options);
      if (feet != null) {
        return feet;
      }
    }
    int fallback = Math.max(24, maxAttempts / 2);
    return findSafeFeetAnywhereInBorder(world, worldBottom, worldTop, border, fallback, random, options);
  }

  public static BlockPos findSafeFeet(
    ServerWorld world,
    BlockPos origin,
    int minRadius,
    int maxRadius,
    int maxAttempts,
    Random random
  ) {
    return findSafeFeet(world, origin, minRadius, maxRadius, maxAttempts, random, FeetSearchOptions.unrestricted());
  }

  /**
   * Full column search from build height downward — finds the highest valid standing spot in that column.
   */
  public static BlockPos findSafeFeetInColumn(ServerWorld world, int x, int z, int worldBottom, int worldTop) {
    return findSafeFeetInColumn(world, x, z, worldBottom, worldTop, FeetSearchOptions.unrestricted());
  }

  /**
   * Valid standing spot in column ({@code x},{@code z}) whose feet Y is closest to {@code preferY}
   * (tries {@code preferY}, then {@code preferY±1}, {@code preferY±2}, … up to {@code verticalRadius}).
   * Use this for admin summons so NPCs land next to the player instead of the column's highest surface.
   */
  public static BlockPos findSafeFeetNearPreferredY(
    ServerWorld world,
    int x,
    int z,
    int preferY,
    int verticalRadius
  ) {
    return findSafeFeetNearPreferredY(world, x, z, preferY, verticalRadius, FeetSearchOptions.unrestricted());
  }

  /**
   * Like {@link #findSafeFeetNearPreferredY} but only considers Y near the column's motion-blocking surface
   * (overworld-style dimensions). Nether-like ceilings use the unconstrained search.
   */
  public static BlockPos findSafeFeetNearPreferredYSurface(
    ServerWorld world,
    int x,
    int z,
    int preferY,
    int verticalRadius
  ) {
    return findSafeFeetNearPreferredYSurface(world, x, z, preferY, verticalRadius, FeetSearchOptions.unrestricted());
  }

  private static BlockPos findSafeFeetNearPreferredYSurface(
    ServerWorld world,
    int x,
    int z,
    int preferY,
    int verticalRadius,
    FeetSearchOptions options
  ) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    if (world.getDimension().hasCeiling()) {
      return findSafeFeetNearPreferredY(world, x, z, preferY, verticalRadius, options);
    }
    int[] band = surfaceFeetBand(world, x, z);
    int low = band[0];
    int high = band[1];
    if (low >= high) {
      return null;
    }
    int center = Math.max(low, Math.min(high, preferY));
    int vr = Math.max(0, verticalRadius);
    for (int r = 0; r <= vr; r++) {
      if (r == 0) {
        BlockPos feet = tryFeetY(world, x, z, center, low, high, options);
        if (feet != null) {
          return feet;
        }
        continue;
      }
      int yLow = center - r;
      if (yLow >= low && yLow <= high) {
        BlockPos below = tryFeetY(world, x, z, yLow, low, high, options);
        if (below != null) {
          return below;
        }
      }
      int yHigh = center + r;
      if (yHigh >= low && yHigh <= high && yHigh != yLow) {
        BlockPos above = tryFeetY(world, x, z, yHigh, low, high, options);
        if (above != null) {
          return above;
        }
      }
    }
    return null;
  }

  /** Inclusive low/high feet Y for standing on the outdoor surface at (x,z). */
  private static int[] surfaceFeetBand(ServerWorld world, int x, int z) {
    int bottom = world.getBottomY();
    int top = world.getLogicalHeight() - 2;
    int surfaceY = world.getTopPosition(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, new BlockPos(x, bottom, z)).getY();
    int low = Math.max(bottom + 1, surfaceY - WILD_TRAINER_MAX_BLOCKS_BELOW_SURFACE);
    int high = Math.min(top, surfaceY + WILD_TRAINER_MAX_BLOCKS_ABOVE_SURFACE);
    return new int[] {low, high};
  }

  /**
   * Valid feet in column (x,z) limited to the outdoor surface band — avoids caves and deep void under the same XZ.
   */
  public static BlockPos findSafeFeetInSurfaceColumn(ServerWorld world, int x, int z, FeetSearchOptions options) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    if (world.getDimension().hasCeiling()) {
      return findSafeFeetInColumn(world, x, z, world.getBottomY(), world.getLogicalHeight() - 2, options);
    }
    int[] band = surfaceFeetBand(world, x, z);
    int low = band[0];
    int high = band[1];
    if (low >= high) {
      return null;
    }
    for (int y = high; y > low; y--) {
      if (!options.allowsFeetY(y)) {
        continue;
      }
      BlockPos feet = new BlockPos(x, y, z);
      if (!hasStandingRoom(world, feet)) {
        continue;
      }
      if (!options.acceptsFloor(world, feet.down())) {
        continue;
      }
      return feet;
    }
    return null;
  }

  public static BlockPos findSafeFeetSurface(
    ServerWorld world,
    BlockPos origin,
    int minRadius,
    int maxRadius,
    int maxAttempts,
    Random random,
    FeetSearchOptions options
  ) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    if (minRadius < 0) minRadius = 0;
    if (maxRadius < minRadius) maxRadius = minRadius;
    int worldBottom = world.getBottomY();
    int worldTop = world.getLogicalHeight() - 2;
    WorldBorder border = world.getWorldBorder();

    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      double angle = random.nextDouble() * Math.PI * 2;
      int dist = minRadius + (maxRadius > minRadius ? random.nextInt(maxRadius - minRadius + 1) : 0);
      int x = origin.getX() + (int) (Math.cos(angle) * dist);
      int z = origin.getZ() + (int) (Math.sin(angle) * dist);
      BlockPos probe = new BlockPos(x, worldBottom, z);
      if (!border.contains(probe)) {
        continue;
      }
      BlockPos feet = findSafeFeetInSurfaceColumn(world, x, z, options);
      if (feet != null) {
        return feet;
      }
    }
    int fallback = Math.max(24, maxAttempts / 2);
    return findSafeFeetAnywhereInBorderSurface(world, worldBottom, worldTop, border, fallback, random, options);
  }

  public static BlockPos findSafeFeetSurface(
    ServerWorld world,
    BlockPos origin,
    int minRadius,
    int maxRadius,
    int maxAttempts,
    Random random
  ) {
    return findSafeFeetSurface(world, origin, minRadius, maxRadius, maxAttempts, random, FeetSearchOptions.unrestricted());
  }

  public static BlockPos findSafeSpreadSurface(ServerWorld world, BlockPos center, int maxSpread, int maxAttempts, Random random) {
    int spread = Math.max(0, maxSpread);
    return findSafeFeetSurface(world, center, 0, spread, maxAttempts, random, FeetSearchOptions.unrestricted());
  }

  private static BlockPos findSafeFeetAnywhereInBorderSurface(
    ServerWorld world,
    int worldBottom,
    int worldTop,
    WorldBorder border,
    int attempts,
    Random random,
    FeetSearchOptions options
  ) {
    double cx = border.getCenterX();
    double cz = border.getCenterZ();
    double half = border.getSize() / 2.0 - 8.0;
    if (half < 32.0) {
      half = 2000.0;
    }
    for (int i = 0; i < attempts; i++) {
      int x = (int) Math.floor(cx + (random.nextDouble() * 2.0 - 1.0) * half);
      int z = (int) Math.floor(cz + (random.nextDouble() * 2.0 - 1.0) * half);
      if (!border.contains(new BlockPos(x, worldBottom, z))) {
        continue;
      }
      BlockPos feet = findSafeFeetInSurfaceColumn(world, x, z, options);
      if (feet != null) {
        return feet;
      }
    }
    return null;
  }

  private static BlockPos findSafeFeetNearPreferredY(
    ServerWorld world,
    int x,
    int z,
    int preferY,
    int verticalRadius,
    FeetSearchOptions options
  ) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    int wb = world.getBottomY() + 1;
    int wt = world.getLogicalHeight() - 2;
    int vr = Math.max(0, verticalRadius);
    for (int r = 0; r <= vr; r++) {
      if (r == 0) {
        BlockPos feet = tryFeetY(world, x, z, preferY, wb, wt, options);
        if (feet != null) {
          return feet;
        }
        continue;
      }
      BlockPos below = tryFeetY(world, x, z, preferY - r, wb, wt, options);
      if (below != null) {
        return below;
      }
      BlockPos above = tryFeetY(world, x, z, preferY + r, wb, wt, options);
      if (above != null) {
        return above;
      }
    }
    return null;
  }

  private static BlockPos tryFeetY(
    ServerWorld world,
    int x,
    int z,
    int y,
    int worldBottom,
    int worldTop,
    FeetSearchOptions options
  ) {
    if (y < worldBottom || y > worldTop || !options.allowsFeetY(y)) {
      return null;
    }
    BlockPos feet = new BlockPos(x, y, z);
    if (!hasStandingRoom(world, feet)) {
      return null;
    }
    if (!options.acceptsFloor(world, feet.down())) {
      return null;
    }
    return feet;
  }

  public static BlockPos findSafeFeetInColumn(
    ServerWorld world,
    int x,
    int z,
    int worldBottom,
    int worldTop,
    FeetSearchOptions options
  ) {
    if (options == null) {
      options = FeetSearchOptions.unrestricted();
    }
    for (int y = worldTop; y > worldBottom + 1; y--) {
      if (!options.allowsFeetY(y)) {
        continue;
      }
      BlockPos feet = new BlockPos(x, y, z);
      if (!hasStandingRoom(world, feet)) {
        continue;
      }
      if (!options.acceptsFloor(world, feet.down())) {
        continue;
      }
      return feet;
    }
    return null;
  }

  private static BlockPos findSafeFeetAnywhereInBorder(
    ServerWorld world,
    int worldBottom,
    int worldTop,
    WorldBorder border,
    int attempts,
    Random random,
    FeetSearchOptions options
  ) {
    double cx = border.getCenterX();
    double cz = border.getCenterZ();
    double half = border.getSize() / 2.0 - 8.0;
    if (half < 32.0) {
      half = 2000.0;
    }
    for (int i = 0; i < attempts; i++) {
      int x = (int) Math.floor(cx + (random.nextDouble() * 2.0 - 1.0) * half);
      int z = (int) Math.floor(cz + (random.nextDouble() * 2.0 - 1.0) * half);
      if (!border.contains(new BlockPos(x, worldBottom, z))) {
        continue;
      }
      BlockPos feet = findSafeFeetInColumn(world, x, z, worldBottom, worldTop, options);
      if (feet != null) {
        return feet;
      }
    }
    return null;
  }

  private static boolean hasStandingRoom(ServerWorld world, BlockPos feet) {
    return isClearForPlayer(world, feet) && isClearForPlayer(world, feet.up());
  }

  private static boolean isClearForPlayer(ServerWorld world, BlockPos pos) {
    if (!world.getFluidState(pos).isEmpty()) {
      return false;
    }
    BlockState s = world.getBlockState(pos);
    if (s.isOf(Blocks.LAVA) || s.isOf(Blocks.FIRE) || s.isOf(Blocks.CACTUS)
      || s.isOf(Blocks.SWEET_BERRY_BUSH) || s.isOf(Blocks.POWDER_SNOW)) {
      return false;
    }
    return s.getCollisionShape(world, pos).isEmpty();
  }

  private static boolean isSafeFloor(ServerWorld world, BlockPos floorPos) {
    BlockState s = world.getBlockState(floorPos);
    if (s.isAir() || s.getCollisionShape(world, floorPos).isEmpty()) {
      return false;
    }
    return !s.isOf(Blocks.LAVA) && !s.isOf(Blocks.FIRE) && !s.isOf(Blocks.MAGMA_BLOCK)
      && !s.isOf(Blocks.CACTUS);
  }

  public static boolean isOverworld(ServerWorld world) {
    RegistryKey<World> key = world.getRegistryKey();
    return World.OVERWORLD.equals(key);
  }

  /**
   * Random horizontal offset up to {@code maxSpread} blocks from {@code center}, then same safety search as {@link #findSafeFeet}.
   */
  public static BlockPos findSafeSpread(ServerWorld world, BlockPos center, int maxSpread, int maxAttempts, Random random) {
    int spread = Math.max(0, maxSpread);
    return findSafeFeet(world, center, 0, spread, maxAttempts, random, FeetSearchOptions.unrestricted());
  }
}
