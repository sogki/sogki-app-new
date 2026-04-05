package dev.sogki.rpmanager.server.util;

import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.world.World;

import java.lang.reflect.Method;
import java.util.Collection;
import java.util.Locale;
import java.util.UUID;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public final class TemplateEngine {
  private static final Pattern LEGACY_COLOR_CODE = Pattern.compile("(?i)&([0-9A-FK-OR])");
  private static final long COBBLEMON_CACHE_MS = 2000L;
  private static final Map<UUID, CachedStats> COBBLEMON_STATS_CACHE = new ConcurrentHashMap<>();
  private static volatile PlaceholderProvider PLACEHOLDER_PROVIDER;

  private TemplateEngine() {
  }

  public static String render(String template, Map<String, String> values) {
    if (template == null || template.isBlank()) return "";
    String out = template;
    for (Map.Entry<String, String> entry : values.entrySet()) {
      out = out.replace("{" + entry.getKey() + "}", entry.getValue() == null ? "" : entry.getValue());
    }
    return applyLegacyColorCodes(out);
  }

  /** Integer block coordinate (floor), for chat/UI without long decimal tails. */
  public static String formatBlockCoord(double pos) {
    return String.valueOf((int) Math.floor(pos));
  }

  /**
   * Human-readable position: whole numbers when close to an integer, otherwise up to {@code decimals} places.
   */
  public static String formatCoord(double pos, int decimals) {
    int d = Math.max(0, Math.min(6, decimals));
    double r = Math.rint(pos);
    if (d > 0 && Math.abs(pos - r) < 1e-4) {
      return String.valueOf((long) r);
    }
    return String.format(Locale.ROOT, "%." + d + "f", pos);
  }

  public static Map<String, String> baseMap(MinecraftServer server, ServerPlayerEntity player, String brand) {
    Map<String, String> values = new HashMap<>();
    int online = 0;
    int maxOnline = 0;
    if (server != null) {
      try {
        if (server.getPlayerManager() != null) {
          online = server.getPlayerManager().getPlayerList().size();
          maxOnline = server.getMaxPlayerCount();
        } else {
          online = server.getCurrentPlayerCount();
          maxOnline = server.getMaxPlayerCount();
        }
      } catch (Exception ignored) {
        online = 0;
        maxOnline = 0;
      }
    }
    if (online <= 0 && player != null) {
      // Defensive fallback so sidebar never shows 0 while player is online.
      online = 1;
    }
    int x = 0;
    int y = 0;
    int z = 0;
    if (player != null) {
      try {
        x = player.getBlockPos().getX();
        y = player.getBlockPos().getY();
        z = player.getBlockPos().getZ();
      } catch (Exception ignored) {
        try {
          // Older/newer mappings can sometimes behave differently for block-pos access.
          x = (int) Math.floor(player.getX());
          y = (int) Math.floor(player.getY());
          z = (int) Math.floor(player.getZ());
        } catch (Exception ignoredAgain) {
          x = 0;
          y = 0;
          z = 0;
        }
      }
    }
    values.put("brand", safe(brand));
    values.put("online", String.valueOf(online));
    values.put("maxOnline", String.valueOf(maxOnline));
    values.put("player", player == null ? "" : safe(player.getGameProfile().getName()));
    World world = player == null ? null : player.getWorld();
    values.put("world", world == null ? "unknown" : safe(world.getRegistryKey().getValue().toString()));
    values.put("x", String.valueOf(x));
    values.put("y", String.valueOf(y));
    values.put("z", String.valueOf(z));
    if (player != null) {
      values.put("bx", formatBlockCoord(player.getX()));
      values.put("by", formatBlockCoord(player.getY()));
      values.put("bz", formatBlockCoord(player.getZ()));
    } else {
      values.put("bx", "0");
      values.put("by", "0");
      values.put("bz", "0");
    }
    int pingMs = 0;
    if (player != null) {
      try {
        pingMs = player.networkHandler.getLatency();
      } catch (Exception ignored) {
        pingMs = 0;
      }
    }
    values.put("ping", String.valueOf(pingMs));
    CobblemonStats stats = resolveCobblemonStats(player);
    values.put("pokemonCount", String.valueOf(stats.pokedexCaught()));
    values.put("pokemonOwnedCount", String.valueOf(stats.totalOwned()));
    values.put("pokemonUniqueCaught", String.valueOf(stats.pokedexCaught()));
    values.put("partyCount", String.valueOf(stats.partyCount()));
    values.put("pcCount", String.valueOf(stats.pcCount()));
    values.put("pokedexCaught", String.valueOf(stats.pokedexCaught()));
    values.put("pokedexSeen", String.valueOf(stats.pokedexSeen()));
    PlaceholderProvider provider = PLACEHOLDER_PROVIDER;
    if (provider != null) {
      try {
        Map<String, String> extra = provider.resolve(server, player);
        if (extra != null) values.putAll(extra);
      } catch (Exception ignored) {
      }
    }
    return values;
  }

  public static void setPlaceholderProvider(PlaceholderProvider provider) {
    PLACEHOLDER_PROVIDER = provider;
  }

  private static String safe(String value) {
    return value == null ? "" : value;
  }

  private static String applyLegacyColorCodes(String input) {
    if (input == null || input.isEmpty()) return "";
    return LEGACY_COLOR_CODE.matcher(input).replaceAll("\u00A7$1");
  }

  private static CobblemonStats resolveCobblemonStats(ServerPlayerEntity player) {
    if (player == null) return new CobblemonStats(0, 0, 0, 0);
    long now = System.currentTimeMillis();
    UUID uuid = player.getUuid();
    CachedStats cached = COBBLEMON_STATS_CACHE.get(uuid);
    if (cached != null && now - cached.cachedAtMs <= COBBLEMON_CACHE_MS) {
      return cached.stats;
    }
    try {
      // Best-effort reflective integration for Cobblemon without a hard compile dependency.
      Class<?> classCobblemon = Class.forName("com.cobblemon.mod.common.Cobblemon");
      Object instance = classCobblemon.getField("INSTANCE").get(null);
      Object storage = classCobblemon.getMethod("getStorage").invoke(instance);
      Object party = resolvePartyObject(storage, player);
      int partyCount = Math.max(0, countPokemonObjects(party));
      Object pc = resolvePcObject(storage, player);
      int pcCount = Math.max(0, countPokemonObjects(pc));
      int pokedexCaught = Math.max(0, resolvePokedexCount(instance, player, true));
      int pokedexSeen = Math.max(0, resolvePokedexCount(instance, player, false));
      CobblemonStats stats = new CobblemonStats(partyCount, pcCount, pokedexCaught, pokedexSeen);
      COBBLEMON_STATS_CACHE.put(uuid, new CachedStats(stats, now));
      return stats;
    } catch (Throwable ignored) {
      // Fallback when Cobblemon API/class signatures differ.
    }
    CobblemonStats fallback = new CobblemonStats(0, 0, 0, 0);
    COBBLEMON_STATS_CACHE.put(uuid, new CachedStats(fallback, now));
    return fallback;
  }

  private static Object resolvePartyObject(Object storage, ServerPlayerEntity player) {
    Object party = tryInvoke(storage, "getParty", player.getUuid());
    if (party == null) party = tryInvoke(storage, "getParty", player);
    if (party == null) party = tryInvoke(storage, "getParty", player.getUuid().toString());
    if (party == null) {
      Object playerStorage = tryInvoke(storage, "getParty", player.getGameProfile());
      if (playerStorage != null) party = playerStorage;
    }
    return party;
  }

  private static Object resolvePcObject(Object storage, ServerPlayerEntity player) {
    Object pc = tryInvoke(storage, "getPC", player.getUuid());
    if (pc == null) pc = tryInvoke(storage, "getPc", player.getUuid());
    if (pc == null) pc = tryInvoke(storage, "getPCStore", player.getUuid());
    if (pc == null) pc = tryInvoke(storage, "getPcStore", player.getUuid());
    if (pc == null) pc = tryInvoke(storage, "getPC", player);
    if (pc == null) pc = tryInvoke(storage, "getPc", player);
    if (pc == null) pc = tryInvoke(storage, "getPCStore", player);
    if (pc == null) pc = tryInvoke(storage, "getPcStore", player);
    if (pc == null) pc = tryInvoke(storage, "getPC", player.getUuid().toString());
    if (pc == null) pc = tryInvoke(storage, "getPc", player.getUuid().toString());
    if (pc == null) pc = tryInvoke(storage, "getPCStore", player.getUuid().toString());
    if (pc == null) pc = tryInvoke(storage, "getPcStore", player.getUuid().toString());
    return pc;
  }

  private static int resolvePokedexCount(Object cobblemonInstance, ServerPlayerEntity player, boolean caught) {
    Object pokedex = resolvePokedexObject(cobblemonInstance, player);
    if (pokedex == null) return -1;

    int fromNamed = caught
      ? firstNonNegative(
      tryInvokeIntNoArgs(pokedex, "getCaughtCount"),
      tryInvokeIntNoArgs(pokedex, "caughtCount"),
      tryInvokeIntNoArgs(pokedex, "countCaught"),
      tryInvokeIntNoArgs(pokedex, "getOwnedCount"),
      tryInvokeIntNoArgs(pokedex, "ownedCount")
    )
      : firstNonNegative(
      tryInvokeIntNoArgs(pokedex, "getSeenCount"),
      tryInvokeIntNoArgs(pokedex, "seenCount"),
      tryInvokeIntNoArgs(pokedex, "countSeen")
    );
    if (fromNamed >= 0) return fromNamed;

    Object maybeCollection = caught
      ? firstNonNull(
      tryInvokeNoArgs(pokedex, "getCaught"),
      tryInvokeNoArgs(pokedex, "caught"),
      tryInvokeNoArgs(pokedex, "getOwned"),
      tryInvokeNoArgs(pokedex, "owned")
    )
      : firstNonNull(
      tryInvokeNoArgs(pokedex, "getSeen"),
      tryInvokeNoArgs(pokedex, "seen")
    );
    int fromCollection = countPokemonObjects(maybeCollection);
    if (fromCollection >= 0) return fromCollection;

    return -1;
  }

  private static Object resolvePokedexObject(Object cobblemonInstance, ServerPlayerEntity player) {
    Object directDex = firstNonNull(
      tryInvoke(cobblemonInstance, "getPokedex", player.getUuid()),
      tryInvoke(cobblemonInstance, "getPokedex", player),
      tryInvoke(cobblemonInstance, "getPokedex", player.getUuid().toString()),
      tryInvoke(cobblemonInstance, "getDex", player.getUuid()),
      tryInvoke(cobblemonInstance, "getDex", player),
      tryInvoke(cobblemonInstance, "getDex", player.getUuid().toString())
    );
    if (directDex != null) return directDex;

    Object manager = firstNonNull(
      tryInvokeNoArgs(cobblemonInstance, "getPlayerData"),
      tryInvokeNoArgs(cobblemonInstance, "getPlayerDataManager"),
      tryInvokeNoArgs(cobblemonInstance, "getPlayerDataStore"),
      tryInvokeNoArgs(cobblemonInstance, "getData")
    );
    if (manager == null) return null;

    Object playerData = firstNonNull(
      tryInvoke(manager, "get", player.getUuid()),
      tryInvoke(manager, "get", player),
      tryInvoke(manager, "get", player.getUuid().toString()),
      tryInvoke(manager, "getOrCreate", player.getUuid()),
      tryInvoke(manager, "getOrCreate", player),
      tryInvoke(manager, "getOrCreate", player.getUuid().toString()),
      tryInvoke(manager, "getData", player.getUuid()),
      tryInvoke(manager, "getData", player),
      tryInvoke(manager, "getData", player.getUuid().toString())
    );
    if (playerData == null) return null;

    return firstNonNull(
      tryInvokeNoArgs(playerData, "getPokedex"),
      tryInvokeNoArgs(playerData, "pokedex"),
      tryInvokeNoArgs(playerData, "getDex"),
      tryInvokeNoArgs(playerData, "dex")
    );
  }

  private static int countPokemonObjects(Object root) {
    return countPokemonObjects(root, 0);
  }

  private static int countPokemonObjects(Object root, int depth) {
    if (root == null) return -1;
    if (depth > 5) return -1;

    Object fromToGappyList = tryInvokeNoArgs(root, "toGappyList");
    int count = countNonNull(fromToGappyList);
    if (count >= 0) return count;

    Object fromToList = tryInvokeNoArgs(root, "toList");
    count = countNonNull(fromToList);
    if (count >= 0) return count;

    Object fromGetAll = tryInvokeNoArgs(root, "getAll");
    count = countNonNull(fromGetAll);
    if (count >= 0) return count;

    Object fromValues = tryInvokeNoArgs(root, "values");
    count = countNonNull(fromValues);
    if (count >= 0) return count;

    Object fromGetBoxes = tryInvokeNoArgs(root, "getBoxes");
    if (fromGetBoxes != null) {
      int nested = countPokemonObjects(fromGetBoxes, depth + 1);
      if (nested >= 0) return nested;
    }

    Object fromGetPokemon = tryInvokeNoArgs(root, "getPokemon");
    if (fromGetPokemon != null) {
      int nested = countPokemonObjects(fromGetPokemon, depth + 1);
      if (nested >= 0) return nested;
    }

    Object fromStream = tryInvokeNoArgs(root, "stream");
    if (fromStream != null) {
      Object filtered = tryInvoke(fromStream, "filter", new java.util.function.Predicate<Object>() {
        @Override
        public boolean test(Object value) {
          return value != null;
        }
      });
      Object streamCount = filtered == null ? null : tryInvokeNoArgs(filtered, "count");
      if (streamCount instanceof Number n) return n.intValue();
    }

    Object size = tryInvokeNoArgs(root, "size");
    if (size instanceof Number n) return Math.max(0, n.intValue());

    if (root instanceof Iterable<?> iterable) {
      int sum = 0;
      boolean foundAnyNested = false;
      for (Object element : iterable) {
        if (element == null) continue;
        int nested = countPokemonObjects(element, depth + 1);
        if (nested >= 0) {
          sum += nested;
          foundAnyNested = true;
        } else {
          sum++;
          foundAnyNested = true;
        }
      }
      if (foundAnyNested) return sum;
    }

    return -1;
  }

  private static int countNonNull(Object values) {
    if (values == null) return -1;
    if (values instanceof Collection<?> c) {
      int count = 0;
      for (Object item : c) if (item != null) count++;
      return count;
    }
    if (values instanceof Iterable<?> it) {
      int count = 0;
      for (Object item : it) if (item != null) count++;
      return count;
    }
    if (values.getClass().isArray()) {
      int count = 0;
      int length = java.lang.reflect.Array.getLength(values);
      for (int i = 0; i < length; i++) {
        if (java.lang.reflect.Array.get(values, i) != null) count++;
      }
      return count;
    }
    if (values instanceof Iterator<?> iterator) {
      int count = 0;
      while (iterator.hasNext()) if (iterator.next() != null) count++;
      return count;
    }
    return -1;
  }

  private static Object tryInvokeNoArgs(Object target, String methodName) {
    if (target == null) return null;
    try {
      Method method = target.getClass().getMethod(methodName);
      method.setAccessible(true);
      return method.invoke(target);
    } catch (Throwable ignored) {
      return null;
    }
  }

  private static int tryInvokeIntNoArgs(Object target, String methodName) {
    Object value = tryInvokeNoArgs(target, methodName);
    return value instanceof Number n ? Math.max(0, n.intValue()) : -1;
  }

  private static Object tryInvoke(Object target, String methodName, Object arg) {
    if (target == null) return null;
    Class<?> klass = target.getClass();
    Method[] methods = klass.getMethods();
    for (Method method : methods) {
      if (!method.getName().equals(methodName)) continue;
      Class<?>[] params = method.getParameterTypes();
      if (params.length != 1) continue;
      if (arg != null && !isAssignable(params[0], arg.getClass())) continue;
      try {
        method.setAccessible(true);
        return method.invoke(target, arg);
      } catch (Throwable ignored) {
      }
    }
    return null;
  }

  private static boolean isAssignable(Class<?> target, Class<?> actual) {
    if (target.isAssignableFrom(actual)) return true;
    if (target == java.util.UUID.class && actual == String.class) return false;
    if (!target.isPrimitive()) return false;
    return (target == int.class && actual == Integer.class)
      || (target == long.class && actual == Long.class)
      || (target == boolean.class && actual == Boolean.class)
      || (target == double.class && actual == Double.class)
      || (target == float.class && actual == Float.class)
      || (target == short.class && actual == Short.class)
      || (target == byte.class && actual == Byte.class)
      || (target == char.class && actual == Character.class);
  }

  private static int firstNonNegative(int... values) {
    for (int value : values) {
      if (value >= 0) return value;
    }
    return -1;
  }

  private static Object firstNonNull(Object... values) {
    for (Object value : values) {
      if (value != null) return value;
    }
    return null;
  }

  private record CobblemonStats(int partyCount, int pcCount, int pokedexCaught, int pokedexSeen) {
    private int totalOwned() {
      return Math.max(0, partyCount) + Math.max(0, pcCount);
    }
  }

  private record CachedStats(CobblemonStats stats, long cachedAtMs) {
  }

  public record CobblemonSummary(int partyCount, int pcCount, int pokedexCaught, int pokedexSeen) {
    public int totalOwned() {
      return Math.max(0, partyCount) + Math.max(0, pcCount);
    }
  }

  public static CobblemonSummary cobblemonSummary(ServerPlayerEntity player) {
    CobblemonStats s = resolveCobblemonStats(player);
    return new CobblemonSummary(s.partyCount(), s.pcCount(), s.pokedexCaught(), s.pokedexSeen());
  }

  public interface PlaceholderProvider {
    Map<String, String> resolve(MinecraftServer server, ServerPlayerEntity player);
  }
}
