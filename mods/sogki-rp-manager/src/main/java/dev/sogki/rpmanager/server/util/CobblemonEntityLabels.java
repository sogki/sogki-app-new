package dev.sogki.rpmanager.server.util;

import net.minecraft.entity.Entity;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.Identifier;

public final class CobblemonEntityLabels {
  private CobblemonEntityLabels() {
  }

  public static boolean isCobblemonPokemon(Entity entity) {
    if (entity == null) return false;
    Identifier id = Registries.ENTITY_TYPE.getId(entity.getType());
    return id != null && "cobblemon".equals(id.getNamespace()) && "pokemon".equals(id.getPath());
  }

  public static String pokemonLabel(Entity entity) {
    if (entity == null) return "Pokémon";
    try {
      Object pokemon = tryInvoke(entity, "getPokemon");
      if (pokemon != null) {
        Object species = tryInvoke(pokemon, "getSpecies");
        if (species != null) {
          Object name = tryInvoke(species, "getName");
          if (name != null) {
            String s = String.valueOf(name);
            if (!s.isBlank()) return s;
          }
        }
      }
    } catch (Throwable ignored) {
    }
    if (entity.hasCustomName() && entity.getCustomName() != null) {
      return entity.getCustomName().getString();
    }
    return entity.getName().getString();
  }

  public static String playerOrPokemonLabel(Entity entity) {
    if (entity instanceof ServerPlayerEntity sp) {
      return sp.getGameProfile().getName();
    }
    if (isCobblemonPokemon(entity)) {
      return pokemonLabel(entity);
    }
    return entity.getName().getString();
  }

  private static Object tryInvoke(Object target, String method) {
    if (target == null) return null;
    try {
      return target.getClass().getMethod(method).invoke(target);
    } catch (Throwable ignored) {
      return null;
    }
  }
}
