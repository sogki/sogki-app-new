package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.entity.Entity;
import net.minecraft.entity.mob.MobEntity;
import net.minecraft.item.Item;
import net.minecraft.item.Items;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

public final class RegionProtectionService {
  public boolean denyBreak(World world, BlockPos pos, ServerPlayerEntity player, ServerFeatureConfig config) {
    if (!config.regions.enabled || player.hasPermissionLevel(2)) return false;
    RegionMatch region = regionAt(world, pos, config);
    if (region == null || !region.denyBlockBreak) return false;
    var values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("region", region.display);
    player.sendMessage(Text.literal(TemplateEngine.render(config.messages.regionDenyBreak, values)), true);
    return true;
  }

  public boolean denyPlace(World world, BlockPos pos, ServerPlayerEntity player, ServerFeatureConfig config) {
    if (!config.regions.enabled || player.hasPermissionLevel(2)) return false;
    RegionMatch region = regionAt(world, pos, config);
    if (region == null || !region.denyBlockPlace) return false;
    var values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("region", region.display);
    player.sendMessage(Text.literal(TemplateEngine.render(config.messages.regionDenyPlace, values)), true);
    return true;
  }

  public boolean denyExplosiveUse(World world, BlockPos pos, ServerPlayerEntity player, Item item, ServerFeatureConfig config) {
    if (!config.regions.enabled || player.hasPermissionLevel(2)) return false;
    if (item != Items.FLINT_AND_STEEL && item != Items.FIRE_CHARGE) return false;
    RegionMatch region = regionAt(world, pos, config);
    if (region == null || !region.denyExplosives) return false;
    var values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("region", region.display);
    player.sendMessage(Text.literal(TemplateEngine.render(config.messages.regionDenyExplosives, values)), true);
    return true;
  }

  public boolean denyMobSpawn(World world, BlockPos pos, Entity entity, ServerFeatureConfig config) {
    if (!config.regions.enabled && (config.cobbletown == null || !config.cobbletown.enabled)) return false;
    if (!(entity instanceof MobEntity)) return false;
    if (isCobblemonEntity(entity)) return false;
    RegionMatch region = regionAt(world, pos, config);
    return region != null && region.denyMobSpawn;
  }

  public String townNameAt(World world, BlockPos pos, ServerFeatureConfig config) {
    RegionMatch region = regionAt(world, pos, config);
    if (region == null || !region.isTown) return null;
    return region.display;
  }

  public String debugRegionAt(World world, BlockPos pos, ServerFeatureConfig config) {
    RegionMatch region = regionAt(world, pos, config);
    if (region == null) return "No matching region/town rule at current location.";
    return "Matched: " + region.display
      + " | isTown=" + region.isTown
      + " | break=" + region.denyBlockBreak
      + " | place=" + region.denyBlockPlace
      + " | explosives=" + region.denyExplosives
      + " | mobSpawn=" + region.denyMobSpawn;
  }

  private RegionMatch regionAt(World world, BlockPos pos, ServerFeatureConfig config) {
    String dim = world.getRegistryKey().getValue().toString();
    for (ServerFeatureConfig.RegionRule region : config.regions.list) {
      if (region == null || region.dimension == null) continue;
      if (!region.dimension.equals(dim)) continue;
      if (!matchesRegion(pos, region)) continue;
      return new RegionMatch(
        display(region),
        region.isTown,
        region.denyBlockBreak,
        region.denyBlockPlace,
        region.denyExplosives,
        region.denyMobSpawn
      );
    }
    if (config.cobbletown != null && config.cobbletown.enabled && config.cobbletown.towns != null) {
      for (ServerFeatureConfig.CobbletownTown town : config.cobbletown.towns) {
        if (town == null || town.dimension == null) continue;
        if (!town.dimension.equals(dim)) continue;
        if (!matchesTown(pos, town)) continue;
        String display = (town.displayName != null && !town.displayName.isBlank()) ? town.displayName : town.townId;
        return new RegionMatch(
          display == null || display.isBlank() ? "Town" : display,
          true,
          town.denyBlockBreak,
          town.denyBlockPlace,
          town.denyExplosives,
          town.denyMobSpawn
        );
      }
    }
    return null;
  }

  private String display(ServerFeatureConfig.RegionRule region) {
    if (region.displayName != null && !region.displayName.isBlank()) return region.displayName;
    if (region.id != null && !region.id.isBlank()) return region.id;
    return "this area";
  }

  private boolean matchesRegion(BlockPos pos, ServerFeatureConfig.RegionRule region) {
    if (region.useRadius && region.radius > 0) {
      int yMin = Math.min(region.minY, region.maxY);
      int yMax = Math.max(region.minY, region.maxY);
      if (pos.getY() < yMin || pos.getY() > yMax) return false;
      long dx = (long) pos.getX() - region.centerX;
      long dz = (long) pos.getZ() - region.centerZ;
      long r = region.radius;
      return dx * dx + dz * dz <= r * r;
    }
    if (pos.getX() < Math.min(region.minX, region.maxX) || pos.getX() > Math.max(region.minX, region.maxX)) return false;
    if (pos.getY() < Math.min(region.minY, region.maxY) || pos.getY() > Math.max(region.minY, region.maxY)) return false;
    return pos.getZ() >= Math.min(region.minZ, region.maxZ) && pos.getZ() <= Math.max(region.minZ, region.maxZ);
  }

  private boolean matchesTown(BlockPos pos, ServerFeatureConfig.CobbletownTown town) {
    if (town.useRadius && town.radius > 0) {
      int yMin = Math.min(town.minY, town.maxY);
      int yMax = Math.max(town.minY, town.maxY);
      if (pos.getY() < yMin || pos.getY() > yMax) return false;
      long dx = (long) pos.getX() - town.centerX;
      long dz = (long) pos.getZ() - town.centerZ;
      long r = town.radius;
      return dx * dx + dz * dz <= r * r;
    }
    if (pos.getX() < Math.min(town.minX, town.maxX) || pos.getX() > Math.max(town.minX, town.maxX)) return false;
    if (pos.getY() < Math.min(town.minY, town.maxY) || pos.getY() > Math.max(town.minY, town.maxY)) return false;
    return pos.getZ() >= Math.min(town.minZ, town.maxZ) && pos.getZ() <= Math.max(town.minZ, town.maxZ);
  }

  private record RegionMatch(
    String display,
    boolean isTown,
    boolean denyBlockBreak,
    boolean denyBlockPlace,
    boolean denyExplosives,
    boolean denyMobSpawn
  ) {
  }

  private boolean isCobblemonEntity(Entity entity) {
    try {
      Identifier id = Registries.ENTITY_TYPE.getId(entity.getType());
      return id != null && "cobblemon".equals(id.getNamespace());
    } catch (Throwable ignored) {
      return false;
    }
  }
}
