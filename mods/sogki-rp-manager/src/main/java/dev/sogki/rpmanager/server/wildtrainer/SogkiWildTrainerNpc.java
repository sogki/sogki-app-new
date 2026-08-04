package dev.sogki.rpmanager.server.wildtrainer;

import dev.sogki.rpmanager.entity.SogkiWildTrainerEntity;
import dev.sogki.rpmanager.registry.SogkiEntities;
import net.minecraft.entity.Entity;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.world.ServerWorld;

/**
 * Spawns the mod-owned {@link SogkiWildTrainerEntity} (custom NPC, not Cobblemon / armor stand).
 */
public final class SogkiWildTrainerNpc {
  private SogkiWildTrainerNpc() {
  }

  public static Entity spawn(
    ServerWorld world,
    MinecraftServer server,
    double x,
    double y,
    double z,
    float yaw,
    WildTrainerEntry trainer,
    WildTrainerFileConfig cfg
  ) {
    if (world == null || trainer == null || trainer.id == null) {
      return null;
    }
    SogkiWildTrainerEntity npc = SogkiEntities.WILD_TRAINER.create(world);
    if (npc == null) {
      return null;
    }
    npc.refreshPositionAndAngles(x, y, z, yaw, 0.0F);
    npc.setHeadYaw(yaw);
    npc.setBodyYaw(yaw);
    npc.setInvulnerable(true);
    npc.setPersistent();
    npc.setSkinUsername(trainer.skinUsername);
    npc.configureRandomWander(cfg.wanderEnabled, cfg.wanderSpeed);
    WildTrainerNametags.applyVanillaStyle(npc, trainer, cfg);
    WildTrainerEntityTags.stampWildTrainer(npc, trainer.id);
    if (!world.spawnEntity(npc)) {
      return null;
    }
    return npc;
  }

  public static boolean isSogkiWildTrainer(Entity entity) {
    return entity instanceof SogkiWildTrainerEntity;
  }
}
