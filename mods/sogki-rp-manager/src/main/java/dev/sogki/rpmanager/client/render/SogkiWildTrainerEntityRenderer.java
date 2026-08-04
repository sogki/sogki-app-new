package dev.sogki.rpmanager.client.render;

import dev.sogki.rpmanager.client.SogkiWildTrainerSkinTextures;
import dev.sogki.rpmanager.entity.SogkiWildTrainerEntity;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.render.entity.LivingEntityRenderer;
import net.minecraft.client.render.entity.model.EntityModelLayers;
import net.minecraft.client.render.entity.model.PlayerEntityModel;
import net.minecraft.util.Identifier;

/**
 * Renders {@link SogkiWildTrainerEntity} with a player-shaped model and Mojang skin from {@code skinUsername}.
 * Uses the slim or wide player model to match the skin so limbs and head UVs line up.
 */
public class SogkiWildTrainerEntityRenderer extends LivingEntityRenderer<SogkiWildTrainerEntity, PlayerEntityModel<SogkiWildTrainerEntity>> {
  private final PlayerEntityModel<SogkiWildTrainerEntity> wideModel;
  private final PlayerEntityModel<SogkiWildTrainerEntity> slimModel;

  public SogkiWildTrainerEntityRenderer(EntityRendererFactory.Context ctx) {
    super(ctx, new PlayerEntityModel<>(ctx.getModelLoader().getModelPart(EntityModelLayers.PLAYER), false), 0.5F);
    this.wideModel = this.model;
    this.slimModel = new PlayerEntityModel<>(ctx.getModelLoader().getModelPart(EntityModelLayers.PLAYER_SLIM), true);
  }

  @Override
  public void render(
    SogkiWildTrainerEntity entity,
    float yaw,
    float tickDelta,
    MatrixStack matrices,
    VertexConsumerProvider vertexConsumers,
    int light
  ) {
    this.model = usesSlimArms(entity) ? slimModel : wideModel;
    super.render(entity, yaw, tickDelta, matrices, vertexConsumers, light);
  }

  private static boolean usesSlimArms(SogkiWildTrainerEntity entity) {
    return SogkiWildTrainerSkinTextures.usesSlimModel(entity.getSkinUsername());
  }

  @Override
  public Identifier getTexture(SogkiWildTrainerEntity entity) {
    String user = entity.getSkinUsername();
    SogkiWildTrainerSkinTextures.warmup(user);
    return SogkiWildTrainerSkinTextures.textureFor(user);
  }
}
