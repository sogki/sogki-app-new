package dev.sogki.rpmanager.server.wildtrainer;

import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.registry.entry.RegistryEntry;
import net.minecraft.registry.tag.TagKey;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.biome.Biome;

import java.util.List;
import java.util.Optional;

/**
 * Per-trainer biome filters for dynamic / random placement. Empty {@link WildTrainerEntry#spawnBiomes} = any biome.
 * <ul>
 *   <li>{@code minecraft:plains} — exact biome id</li>
 *   <li>{@code #minecraft:is_forest} — biome tag (leading {@code #})</li>
 *   <li>{@code *} — wildcard (redundant if list is empty)</li>
 * </ul>
 */
public final class WildTrainerBiomeRules {
  private WildTrainerBiomeRules() {
  }

  public static boolean allows(ServerWorld world, BlockPos feet, WildTrainerEntry entry) {
    if (entry == null || world == null || feet == null) {
      return true;
    }
    List<String> rules = entry.spawnBiomes;
    if (rules == null || rules.isEmpty()) {
      return true;
    }
    RegistryEntry<Biome> biomeEntry = world.getBiome(feet);
    Optional<RegistryKey<Biome>> keyOpt = biomeEntry.getKey();
    Identifier biomeId = keyOpt.map(k -> k.getValue()).orElse(null);
    for (String raw : rules) {
      if (raw == null) {
        continue;
      }
      String rule = raw.trim();
      if (rule.isEmpty()) {
        continue;
      }
      if ("*".equals(rule)) {
        return true;
      }
      if (rule.startsWith("#")) {
        Identifier tagId = Identifier.tryParse(rule.substring(1));
        if (tagId != null && biomeEntry.isIn(TagKey.of(RegistryKeys.BIOME, tagId))) {
          return true;
        }
      } else {
        Identifier want = Identifier.tryParse(rule);
        if (want != null && biomeId != null && want.equals(biomeId)) {
          return true;
        }
      }
    }
    return false;
  }
}
