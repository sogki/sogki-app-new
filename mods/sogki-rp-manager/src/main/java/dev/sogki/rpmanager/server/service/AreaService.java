package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.integration.CobbletownAdapter;
import dev.sogki.rpmanager.server.util.MessageDisplay;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.registry.entry.RegistryEntry;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.structure.StructureStart;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.gen.structure.Structure;
import org.slf4j.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public final class AreaService {
  private final Map<UUID, AreaState> states = new HashMap<>();
  private final CobbletownAdapter cobbletown;

  public AreaService(Logger logger) {
    this.cobbletown = new CobbletownAdapter(logger);
  }

  public void tick(MinecraftServer server, ServerFeatureConfig config, long tick) {
    if (!config.area.enabled) return;
    int interval = Math.max(5, config.area.checkIntervalTicks);
    if (tick % interval != 0) return;

    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      ResolvedArea current = resolveArea(player, config);
      AreaState state = states.computeIfAbsent(player.getUuid(), ignored -> new AreaState());
      if (state.currentArea == null) {
        state.currentArea = current;
        continue;
      }
      if (state.currentArea.equals(current)) continue;

      long nowSec = System.currentTimeMillis() / 1000L;
      if (nowSec - state.lastNotifySec < Math.max(1, config.area.perPlayerCooldownSeconds)) {
        state.currentArea = current;
        continue;
      }

      Map<String, String> map = TemplateEngine.baseMap(server, player, config.brand);
      map.put("area", state.currentArea.label);
      map.put("town", state.currentArea.town ? state.currentArea.label : "");
      MessageDisplay.send(player, TemplateEngine.render(config.area.leaveTemplate, map), config.area.leaveDisplay);

      map.put("area", current.label);
      map.put("town", current.town ? current.label : "");
      MessageDisplay.send(
        player,
        TemplateEngine.render(config.area.enterTemplate, map),
        current.town ? config.area.townDisplay : config.area.enterDisplay
      );

      state.currentArea = current;
      state.lastNotifySec = nowSec;
    }
  }

  private ResolvedArea resolveArea(ServerPlayerEntity player, ServerFeatureConfig config) {
    var townFromAdapter = cobbletown.resolveTownName(player);
    if (townFromAdapter.isPresent()) return new ResolvedArea(cleanAreaLabel(townFromAdapter.get()), true);

    World world = player.getWorld();
    BlockPos pos = player.getBlockPos();
    String townFromRegions = findTownFromRegions(world, pos, config);
    if (townFromRegions != null) return new ResolvedArea(cleanAreaLabel(townFromRegions), true);
    String townFromStructure = findTownFromStructure(world, pos);
    if (townFromStructure != null) return new ResolvedArea(cleanAreaLabel(townFromStructure), true);

    String dim = world.getRegistryKey().getValue().toString();
    for (ServerFeatureConfig.TownDefinition town : config.area.towns) {
      if (town == null || town.dimension == null) continue;
      if (!town.dimension.equals(dim)) continue;
      if (pos.getX() < Math.min(town.minX, town.maxX) || pos.getX() > Math.max(town.minX, town.maxX)) continue;
      if (pos.getY() < Math.min(town.minY, town.maxY) || pos.getY() > Math.max(town.minY, town.maxY)) continue;
      if (pos.getZ() < Math.min(town.minZ, town.maxZ) || pos.getZ() > Math.max(town.minZ, town.maxZ)) continue;
      return new ResolvedArea(cleanAreaLabel(town.name == null || town.name.isBlank() ? town.id : town.name), true);
    }
    String biome = world.getBiome(pos).getKey().map(key -> key.getValue().toString()).orElse("unknown");
    return new ResolvedArea(prettyIdentifierLike(biome), false);
  }

  private String findTownFromRegions(World world, BlockPos pos, ServerFeatureConfig config) {
    String dim = world.getRegistryKey().getValue().toString();
    if (config.regions != null && config.regions.list != null) {
      for (ServerFeatureConfig.RegionRule region : config.regions.list) {
        if (region == null || !region.isTown || region.dimension == null) continue;
        if (!region.dimension.equals(dim)) continue;
        if (!matchesRegion(pos, region)) continue;
        if (region.displayName != null && !region.displayName.isBlank()) return region.displayName;
        return region.id == null || region.id.isBlank() ? "Town" : region.id;
      }
    }
    if (config.cobbletown != null && config.cobbletown.enabled && config.cobbletown.towns != null) {
      for (ServerFeatureConfig.CobbletownTown town : config.cobbletown.towns) {
        if (town == null || town.dimension == null) continue;
        if (!town.dimension.equals(dim)) continue;
        if (!matchesTown(pos, town)) continue;
        if (town.displayName != null && !town.displayName.isBlank()) return town.displayName;
        return town.townId == null || town.townId.isBlank() ? "Town" : town.townId;
      }
    }
    return null;
  }

  private static final class AreaState {
    private ResolvedArea currentArea;
    private long lastNotifySec;
  }

  private record ResolvedArea(String label, boolean town) {
    private ResolvedArea {
      if (label == null || label.isBlank()) label = "Unknown";
    }
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

  private String findTownFromStructure(World world, BlockPos pos) {
    if (!(world instanceof ServerWorld serverWorld)) return null;
    try {
      Registry<Structure> structureRegistry = serverWorld.getRegistryManager().get(RegistryKeys.STRUCTURE);
      if (structureRegistry == null) return null;
      StructureStart start = serverWorld.getStructureAccessor().getStructureContaining(
        pos,
        entry -> isCobbletownStructure(entry, structureRegistry)
      );
      if (start == null || !start.hasChildren()) return null;
      Identifier id = structureRegistry.getId(start.getStructure());
      if (id == null) return null;
      if (!isCobbletownNamespace(id.getNamespace())) return null;
      return prettyIdentifierLike(id.getPath());
    } catch (Throwable ignored) {
      return null;
    }
  }

  private boolean isCobbletownStructure(RegistryEntry<Structure> entry, Registry<Structure> structureRegistry) {
    Identifier id = structureRegistry.getId(entry.value());
    return id != null && isCobbletownNamespace(id.getNamespace());
  }

  private boolean isCobbletownNamespace(String namespace) {
    if (namespace == null) return false;
    return "cobbletown".equals(namespace) || "cobbletowns".equals(namespace);
  }

  private String cleanAreaLabel(String raw) {
    if (raw == null || raw.isBlank()) return "Unknown";
    String trimmed = raw.trim();
    if (trimmed.regionMatches(true, 0, "town:", 0, 5)) {
      trimmed = trimmed.substring(5).trim();
    } else if (trimmed.regionMatches(true, 0, "biome:", 0, 6)) {
      trimmed = trimmed.substring(6).trim();
    }
    return prettyIdentifierLike(trimmed);
  }

  private String prettyIdentifierLike(String raw) {
    if (raw == null || raw.isBlank()) return "Unknown";
    String value = raw.trim();
    int colon = value.indexOf(':');
    if (colon >= 0 && colon + 1 < value.length()) value = value.substring(colon + 1);
    value = value.replace('/', ' ').replace('_', ' ').replace('-', ' ').trim();
    if (value.isBlank()) return "Unknown";

    StringBuilder out = new StringBuilder(value.length());
    String[] words = value.split("\\s+");
    for (int i = 0; i < words.length; i++) {
      String word = words[i];
      if (word.isEmpty()) continue;
      if (i > 0) out.append(' ');
      out.append(Character.toUpperCase(word.charAt(0)));
      if (word.length() > 1) out.append(word.substring(1).toLowerCase());
    }
    return out.toString();
  }
}
