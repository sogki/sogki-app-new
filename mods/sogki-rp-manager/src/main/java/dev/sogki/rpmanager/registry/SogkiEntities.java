package dev.sogki.rpmanager.registry;

import dev.sogki.rpmanager.entity.SogkiWildTrainerEntity;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricEntityTypeBuilder;
import net.minecraft.entity.EntityDimensions;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public final class SogkiEntities {
  public static final EntityType<SogkiWildTrainerEntity> WILD_TRAINER = Registry.register(
    Registries.ENTITY_TYPE,
    Identifier.of("sogkirpmanager", "wild_trainer"),
    FabricEntityTypeBuilder.create(SpawnGroup.CREATURE, SogkiWildTrainerEntity::new)
      .dimensions(EntityDimensions.fixed(0.6F, 1.8F))
      .trackRangeChunks(10)
      .trackedUpdateRate(1)
      .build()
  );

  private SogkiEntities() {
  }

  public static void register() {
    FabricDefaultAttributeRegistry.register(WILD_TRAINER, SogkiWildTrainerEntity.createAttributes());
  }
}
