package dev.sogki.rpmanager.server.util;

import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.registry.RegistryKey;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import net.minecraft.world.Heightmap;
import net.minecraft.world.World;

public final class SafeRandomTeleport {
  private SafeRandomTeleport() {
  }

  /**
   * Picks a random horizontal point between {@code minRadius} and {@code maxRadius} from {@code origin},
   * then searches upward for two clear blocks with a solid, non-hazard floor (not lava/fire).
   */
  public static BlockPos findSafeFeet(ServerWorld world, BlockPos origin, int minRadius, int maxRadius,
                                      int maxAttempts, Random random) {
    if (minRadius < 0) minRadius = 0;
    if (maxRadius < minRadius) maxRadius = minRadius;
    int worldBottom = world.getBottomY();
    int worldTop = world.getLogicalHeight() - 4;

    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      double angle = random.nextDouble() * Math.PI * 2;
      int dist = minRadius + (maxRadius > minRadius ? random.nextInt(maxRadius - minRadius + 1) : 0);
      int x = origin.getX() + (int) (Math.cos(angle) * dist);
      int z = origin.getZ() + (int) (Math.sin(angle) * dist);

      BlockPos topSolid = world.getTopPosition(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, new BlockPos(x, worldBottom, z));
      if (topSolid.getY() >= worldTop || topSolid.getY() <= worldBottom + 2) {
        continue;
      }

      for (int up = 1; up <= 12; up++) {
        BlockPos feet = topSolid.up(up);
        if (feet.getY() >= worldTop) break;
        if (!hasStandingRoom(world, feet)) continue;
        if (!isSafeFloor(world, feet.down())) continue;
        return feet;
      }
    }
    return null;
  }

  private static boolean hasStandingRoom(ServerWorld world, BlockPos feet) {
    return isClearForPlayer(world, feet) && isClearForPlayer(world, feet.up());
  }

  private static boolean isClearForPlayer(ServerWorld world, BlockPos pos) {
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
}
