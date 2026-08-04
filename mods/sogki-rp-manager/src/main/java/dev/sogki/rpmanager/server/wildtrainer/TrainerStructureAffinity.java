package dev.sogki.rpmanager.server.wildtrainer;

import net.minecraft.registry.Registry;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.registry.entry.RegistryEntry;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.structure.StructureStart;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.ChunkPos;
import net.minecraft.world.chunk.ChunkStatus;
import net.minecraft.world.gen.structure.Structure;

import java.util.List;
import java.util.Locale;

/**
 * Detects whether a block position sits inside a Cobblemon / Cobbletown-style structure so trainers can spawn
 * in lore-appropriate places (e.g. Pallet Town). Matching is by structure id {@linkplain Identifier#getPath() path}
 * against configured substrings (case-insensitive).
 */
public final class TrainerStructureAffinity {
  private TrainerStructureAffinity() {
  }

  /**
   * {@link net.minecraft.world.gen.StructureAccessor#getStructureContaining} loads chunks synchronously and can block
   * the server thread for a long time (watchdog crash). Only call it when the chunk already exists.
   */
  public static boolean chunkReadyForStructureQuery(ServerWorld world, BlockPos pos) {
    if (world == null || pos == null) {
      return false;
    }
    ChunkPos chunkPos = new ChunkPos(pos);
    return world.getChunkManager().getChunk(chunkPos.x, chunkPos.z, ChunkStatus.STRUCTURE_STARTS, false) != null;
  }

  public static Identifier structureIdAt(ServerWorld world, BlockPos pos, List<String> allowedNamespaces) {
    if (world == null || pos == null || allowedNamespaces == null || allowedNamespaces.isEmpty()) {
      return null;
    }
    if (!chunkReadyForStructureQuery(world, pos)) {
      return null;
    }
    Registry<Structure> reg = world.getRegistryManager().get(RegistryKeys.STRUCTURE);
    if (reg == null) {
      return null;
    }
    try {
      StructureStart start = world.getStructureAccessor().getStructureContaining(
        pos,
        entry -> namespaceAllowed(entry, reg, allowedNamespaces)
      );
      if (start == null || !start.hasChildren()) {
        return null;
      }
      return reg.getId(start.getStructure());
    } catch (Throwable ignored) {
      return null;
    }
  }

  private static boolean namespaceAllowed(
    RegistryEntry<Structure> entry,
    Registry<Structure> reg,
    List<String> allowedNamespaces
  ) {
    Identifier id = reg.getId(entry.value());
    if (id == null) {
      return false;
    }
    String ns = id.getNamespace();
    for (String raw : allowedNamespaces) {
      if (raw == null) {
        continue;
      }
      String n = raw.trim().toLowerCase(Locale.ROOT);
      if (n.isEmpty()) {
        continue;
      }
      if (ns.equalsIgnoreCase(n)) {
        return true;
      }
    }
    return false;
  }

  /**
   * True when the position is inside a structure whose path matches any preferred token
   * (exact path, ends with /token, or contains token).
   */
  public static boolean matchesPreferred(
    ServerWorld world,
    BlockPos pos,
    List<String> preferredStructurePaths,
    List<String> loreNamespaces
  ) {
    if (preferredStructurePaths == null || preferredStructurePaths.isEmpty()) {
      return false;
    }
    Identifier sid = structureIdAt(world, pos, loreNamespaces);
    if (sid == null) {
      return false;
    }
    String path = sid.getPath().toLowerCase(Locale.ROOT);
    for (String raw : preferredStructurePaths) {
      if (raw == null) {
        continue;
      }
      String want = raw.trim().toLowerCase(Locale.ROOT).replace(' ', '_');
      if (want.isEmpty()) {
        continue;
      }
      if (path.equals(want) || path.endsWith("/" + want) || path.contains(want)) {
        return true;
      }
    }
    return false;
  }
}
