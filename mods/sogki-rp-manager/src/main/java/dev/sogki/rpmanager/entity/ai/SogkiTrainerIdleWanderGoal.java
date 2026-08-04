package dev.sogki.rpmanager.entity.ai;

import dev.sogki.rpmanager.entity.SogkiWildTrainerEntity;
import net.minecraft.entity.ai.FuzzyTargeting;
import net.minecraft.entity.ai.goal.Goal;
import net.minecraft.util.math.Vec3d;

/**
 * Short random walks while idle — never targets players. Paused during dialogue ({@link SogkiWildTrainerEntity#allowsRandomWanderNow()}).
 */
public final class SogkiTrainerIdleWanderGoal extends Goal {
  private final SogkiWildTrainerEntity mob;

  public SogkiTrainerIdleWanderGoal(SogkiWildTrainerEntity mob) {
    this.mob = mob;
  }

  @Override
  public boolean canStart() {
    if (!mob.allowsRandomWanderNow()) {
      return false;
    }
    return mob.getRandom().nextInt(90) == 0;
  }

  @Override
  public boolean shouldContinue() {
    return mob.allowsRandomWanderNow() && !mob.getNavigation().isIdle();
  }

  @Override
  public void start() {
    Vec3d dest = FuzzyTargeting.find(mob, 14, 10);
    if (dest != null) {
      mob.getNavigation().startMovingTo(dest.x, dest.y, dest.z, mob.getWanderMoveSpeed());
    }
  }

  @Override
  public void stop() {
    mob.getNavigation().stop();
  }
}
