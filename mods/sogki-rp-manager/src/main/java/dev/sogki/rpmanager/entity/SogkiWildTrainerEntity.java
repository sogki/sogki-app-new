package dev.sogki.rpmanager.entity;

import dev.sogki.rpmanager.entity.ai.SogkiTrainerIdleWanderGoal;
import dev.sogki.rpmanager.server.wildtrainer.WildTrainerEntry;
import dev.sogki.rpmanager.server.wildtrainer.WildTrainerFileConfig;
import dev.sogki.rpmanager.server.wildtrainer.WildTrainerNametags;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.ai.goal.LookAroundGoal;
import net.minecraft.entity.ai.goal.LookAtEntityGoal;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.data.DataTracker;
import net.minecraft.entity.data.TrackedData;
import net.minecraft.entity.data.TrackedDataHandlerRegistry;
import net.minecraft.entity.mob.MobEntity;
import net.minecraft.entity.mob.PathAwareEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.nbt.NbtCompound;
import net.minecraft.world.World;

/**
 * Sogki-owned overworld trainer NPC (not Cobblemon {@code cobblemon:npc}, not an armor stand).
 * Battles still use a hidden Cobblemon NPC via {@link dev.sogki.rpmanager.server.wildtrainer.CobblemonWildTrainerBridge}.
 */
public class SogkiWildTrainerEntity extends PathAwareEntity {
  private static final TrackedData<String> SKIN_USERNAME = DataTracker.registerData(
    SogkiWildTrainerEntity.class,
    TrackedDataHandlerRegistry.STRING
  );

  /** From trainers.yml: random stroll when no player is in dialogue with this NPC. */
  private boolean randomWanderFromConfig;
  private double wanderMoveSpeed = 0.28D;
  /** While true, idle wander goals do not start (player is talking / duel prompt). */
  private boolean pauseRandomWander;

  public SogkiWildTrainerEntity(EntityType<? extends SogkiWildTrainerEntity> type, World world) {
    super(type, world);
    this.disableExperienceDropping();
  }

  public static DefaultAttributeContainer.Builder createAttributes() {
    return MobEntity.createMobAttributes()
      .add(EntityAttributes.GENERIC_MAX_HEALTH, 20.0D)
      .add(EntityAttributes.GENERIC_MOVEMENT_SPEED, 0.28D)
      .add(EntityAttributes.GENERIC_FOLLOW_RANGE, 16.0D);
  }

  @Override
  protected void initGoals() {
    this.goalSelector.add(3, new SogkiTrainerIdleWanderGoal(this));
    this.goalSelector.add(6, new LookAtEntityGoal(this, PlayerEntity.class, 8.0F));
    this.goalSelector.add(7, new LookAroundGoal(this));
  }

  public void configureRandomWander(boolean enabled, double moveSpeed) {
    this.randomWanderFromConfig = enabled;
    this.wanderMoveSpeed = Math.max(0.12D, moveSpeed);
  }

  public double getWanderMoveSpeed() {
    return wanderMoveSpeed;
  }

  public boolean allowsRandomWanderNow() {
    return randomWanderFromConfig && !pauseRandomWander;
  }

  public void setPauseRandomWander(boolean pause) {
    this.pauseRandomWander = pause;
    if (pause) {
      this.getNavigation().stop();
    }
  }

  @Override
  protected void initDataTracker(DataTracker.Builder builder) {
    super.initDataTracker(builder);
    builder.add(SKIN_USERNAME, "");
  }

  public String getSkinUsername() {
    return this.dataTracker.get(SKIN_USERNAME);
  }

  public void setSkinUsername(String name) {
    String v = name == null ? "" : name.trim();
    if (v.length() > 64) {
      v = v.substring(0, 64);
    }
    this.dataTracker.set(SKIN_USERNAME, v);
  }

  /**
   * Re-sync presentation after join / config reload (nametag + skin string for client).
   */
  public void refreshPresentation(WildTrainerEntry trainer, WildTrainerFileConfig cfg) {
    if (trainer == null || cfg == null || this.getWorld().isClient()) {
      return;
    }
    setSkinUsername(trainer.skinUsername);
    configureRandomWander(cfg.wanderEnabled, cfg.wanderSpeed);
    WildTrainerNametags.applyVanillaStyle(this, trainer, cfg);
  }

  @Override
  public void writeCustomDataToNbt(NbtCompound nbt) {
    super.writeCustomDataToNbt(nbt);
    nbt.putString("SogkiSkinUsername", getSkinUsername());
  }

  @Override
  public void readCustomDataFromNbt(NbtCompound nbt) {
    super.readCustomDataFromNbt(nbt);
    if (nbt.contains("SogkiSkinUsername")) {
      setSkinUsername(nbt.getString("SogkiSkinUsername"));
    }
  }

  @Override
  public boolean isPushable() {
    return false;
  }

  @Override
  public boolean canPickUpLoot() {
    return false;
  }

  @Override
  public boolean cannotDespawn() {
    return true;
  }

}
