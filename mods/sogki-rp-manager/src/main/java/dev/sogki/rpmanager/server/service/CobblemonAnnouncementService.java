package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import org.slf4j.Logger;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.DoubleSupplier;
import java.util.function.Supplier;

public final class CobblemonAnnouncementService {
  private static final String COBBLEMON_MOD_ID = "cobblemon";
  private static final long FIRST_THROW_WINDOW_MS = 5 * 60 * 1000L;
  private final Logger logger;
  private final Map<String, Long> lastSent = new HashMap<>();
  private final Map<String, Long> firstThrowTracker = new HashMap<>();
  private final Map<UUID, PlayerCatchStats> catchStats = new HashMap<>();
  private Supplier<ServerFeatureConfig> configSupplier = ServerFeatureConfig::new;
  private DoubleSupplier catchRateMultiplierSupplier = () -> 1.0D;
  private SkillTreeService skillTreeService;
  private TitleService titleService;
  private boolean attemptedRegistration;
  private boolean attemptedCatchHook;

  public CobblemonAnnouncementService(Logger logger) {
    this.logger = logger;
  }

  public void setConfigSupplier(Supplier<ServerFeatureConfig> supplier) {
    this.configSupplier = supplier == null ? ServerFeatureConfig::new : supplier;
  }

  public void setCatchRateMultiplierSupplier(DoubleSupplier supplier) {
    this.catchRateMultiplierSupplier = supplier == null ? (() -> 1.0D) : supplier;
  }

  public Map<String, String> placeholderValues(ServerPlayerEntity player) {
    Map<String, String> out = new HashMap<>();
    if (player == null) {
      out.put("catchesTotal", "0");
      out.put("catchesShiny", "0");
      out.put("catchesLegendary", "0");
      out.put("lastCaughtPokemon", "None");
      out.put("lastCaughtShiny", "false");
      out.put("lastCaughtLegendary", "false");
      return out;
    }
    PlayerCatchStats stats = catchStats.getOrDefault(player.getUuid(), new PlayerCatchStats());
    out.put("catchesTotal", String.valueOf(stats.total));
    out.put("catchesShiny", String.valueOf(stats.shiny));
    out.put("catchesLegendary", String.valueOf(stats.legendary));
    out.put("lastCaughtPokemon", stats.lastPokemon == null || stats.lastPokemon.isBlank() ? "None" : stats.lastPokemon);
    out.put("lastCaughtShiny", String.valueOf(stats.lastShiny));
    out.put("lastCaughtLegendary", String.valueOf(stats.lastLegendary));
    return out;
  }

  public void tryRegisterCobblemonHooks(SkillTreeService skillTree, TitleService titles) {
    this.skillTreeService = skillTree;
    this.titleService = titles;
    if (attemptedRegistration) return;
    attemptedRegistration = true;
    if (!FabricLoader.getInstance().isModLoaded(COBBLEMON_MOD_ID)) {
      logger.info("[SogkiCobblemon] Cobblemon not detected. Announcement hooks idle.");
      return;
    }
    logger.info("[SogkiCobblemon] Cobblemon detected. Reflective event adapter enabled (best effort).");
    tryRegisterCatchChanceHook(skillTree);
  }

  private void tryRegisterCatchChanceHook(SkillTreeService skillTree) {
    if (attemptedCatchHook) return;
    attemptedCatchHook = true;
    if (skillTree == null) return;
    try {
      Class<?> eventsClass = Class.forName("com.cobblemon.mod.common.api.events.CobblemonEvents");
      Object catchRateObservable = staticField(eventsClass, "POKEMON_CATCH_RATE");
      Object capturedObservable = staticField(eventsClass, "POKEMON_CAPTURED");
      boolean catchRateHooked = subscribeObservable(catchRateObservable, event -> onCatchRateEvent(event, skillTree));
      boolean capturedHooked = subscribeObservable(capturedObservable, this::onCapturedEvent);
      if (catchRateHooked) {
        logger.info("[SogkiCobblemon] Catch chance hook attached to CobblemonEvents.POKEMON_CATCH_RATE");
      } else {
        logger.info("[SogkiCobblemon] Catch chance hook unavailable for this Cobblemon API version; node stays config-ready.");
      }
      if (!capturedHooked) {
        logger.debug("[SogkiCobblemon] Optional cleanup hook POKEMON_CAPTURED unavailable.");
      }
    } catch (Throwable ignored) {
      logger.info("[SogkiCobblemon] Catch chance hook unavailable for this Cobblemon API version; node stays config-ready.");
    }
  }

  private Object staticField(Class<?> klass, String name) {
    try {
      Field field = klass.getField(name);
      return field.get(null);
    } catch (Throwable ignored) {
      return null;
    }
  }

  private boolean subscribeObservable(Object observable, Consumer<Object> consumer) {
    if (observable == null || consumer == null) return false;
    try {
      Class<?> priorityClass = Class.forName("com.cobblemon.mod.common.api.Priority");
      @SuppressWarnings("unchecked")
      Object normalPriority = Enum.valueOf((Class<Enum>) priorityClass.asSubclass(Enum.class), "NORMAL");
      Class<?> function1Class = Class.forName("kotlin.jvm.functions.Function1");
      Object unit = Class.forName("kotlin.Unit").getField("INSTANCE").get(null);
      Object callback = java.lang.reflect.Proxy.newProxyInstance(
        function1Class.getClassLoader(),
        new Class<?>[]{function1Class},
        (proxy, method, args) -> {
          if ("invoke".equals(method.getName()) && args != null && args.length == 1) {
            consumer.accept(args[0]);
            return unit;
          }
          return unit;
        }
      );
      Method subscribe = observable.getClass().getMethod("subscribe", priorityClass, function1Class);
      subscribe.invoke(observable, normalPriority, callback);
      return true;
    } catch (Throwable ignored) {
      return false;
    }
  }

  private void onCatchRateEvent(Object event, SkillTreeService skillTree) {
    if (event == null || skillTree == null) return;
    ServerPlayerEntity player = extractPlayer(event);
    if (player == null) return;
    UUID playerUuid = player.getUuid();
    UUID pokemonUuid = extractPokemonUuid(event);
    if (pokemonUuid == null) return;
    long now = System.currentTimeMillis();
    cleanupTracker(now);
    String key = playerUuid + "|" + pokemonUuid;
    if (firstThrowTracker.putIfAbsent(key, now) != null) {
      return;
    }
    double bonusPercent = skillTree.cobblemonFirstTryCatchBonusPercent(playerUuid);
    if (bonusPercent <= 0.0D) return;
    float base = extractCatchRate(event);
    if (base <= 0.0F) return;
    float adjusted = (float) Math.max(0.0D, base * (1.0D + (bonusPercent / 100.0D)));
    try {
      double multiplier = catchRateMultiplierSupplier == null ? 1.0D : catchRateMultiplierSupplier.getAsDouble();
      adjusted = (float) Math.max(0.0D, adjusted * Math.max(0.0D, multiplier));
    } catch (Exception ignored) {
    }
    setCatchRate(event, adjusted);
  }

  private void onCapturedEvent(Object event) {
    if (event == null) return;
    Object playerObj = firstNonNull(
      tryInvokeNoArgs(event, "getPlayer"),
      tryInvokeNoArgs(event, "player")
    );
    if (!(playerObj instanceof ServerPlayerEntity player)) return;
    Object pokemonObj = firstNonNull(
      tryInvokeNoArgs(event, "getPokemon"),
      tryInvokeNoArgs(event, "pokemon")
    );
    boolean shiny = asBoolean(firstNonNull(
      tryInvokeNoArgs(pokemonObj, "getShiny"),
      tryInvokeNoArgs(pokemonObj, "isShiny"),
      tryInvokeNoArgs(pokemonObj, "shiny")
    ));
    boolean legendary = asBoolean(firstNonNull(
      tryInvokeNoArgs(pokemonObj, "isLegendary"),
      tryInvokeNoArgs(pokemonObj, "getLegendary"),
      tryInvokeNoArgs(pokemonObj, "legendary")
    ));
    String pokemonName = resolvePokemonName(pokemonObj);
    updateCatchStats(player.getUuid(), pokemonName, shiny, legendary);
    if (skillTreeService != null) {
      skillTreeService.onPokemonCaptured(player, shiny, legendary);
    }
    if (titleService != null) {
      titleService.onPokemonCatchAction(player);
    }
    ServerFeatureConfig cfg = configSupplier == null ? new ServerFeatureConfig() : configSupplier.get();
    if (cfg == null) cfg = new ServerFeatureConfig();
    if (player.getServer() != null) {
      announceCatch(player.getServer(), player, pokemonName, shiny, legendary, cfg);
    }
    UUID pokemonUuid = extractUuidFromObject(pokemonObj);
    if (pokemonUuid == null) return;
    firstThrowTracker.remove(player.getUuid() + "|" + pokemonUuid);
  }

  private UUID extractPokemonUuid(Object event) {
    Object pokemonEntity = firstNonNull(
      tryInvokeNoArgs(event, "getPokemonEntity"),
      tryInvokeNoArgs(event, "pokemonEntity"),
      tryInvokeNoArgs(event, "getPokemon"),
      tryInvokeNoArgs(event, "pokemon")
    );
    return extractUuidFromObject(pokemonEntity);
  }

  private UUID extractUuidFromObject(Object object) {
    if (object == null) return null;
    Object raw = firstNonNull(
      tryInvokeNoArgs(object, "getUuid"),
      tryInvokeNoArgs(object, "uuid")
    );
    if (raw instanceof UUID uuid) return uuid;
    if (raw instanceof String text) {
      try {
        return UUID.fromString(text);
      } catch (Exception ignored) {
        return null;
      }
    }
    return null;
  }

  private ServerPlayerEntity extractPlayer(Object event) {
    Object direct = firstNonNull(
      tryInvokeNoArgs(event, "getThrower"),
      tryInvokeNoArgs(event, "thrower"),
      tryInvokeNoArgs(event, "getPlayer"),
      tryInvokeNoArgs(event, "player")
    );
    return direct instanceof ServerPlayerEntity sp ? sp : null;
  }

  private float extractCatchRate(Object event) {
    Object value = firstNonNull(
      tryInvokeNoArgs(event, "getCatchRate"),
      tryInvokeNoArgs(event, "catchRate")
    );
    if (value instanceof Number number) {
      return number.floatValue();
    }
    return 0.0F;
  }

  private void setCatchRate(Object event, float value) {
    for (Method method : event.getClass().getMethods()) {
      if (!method.getName().equals("setCatchRate")) continue;
      if (method.getParameterCount() != 1) continue;
      Class<?> type = method.getParameterTypes()[0];
      try {
        if (type == float.class || type == Float.class) {
          method.invoke(event, value);
          return;
        }
        if (type == double.class || type == Double.class) {
          method.invoke(event, (double) value);
          return;
        }
        if (type == int.class || type == Integer.class) {
          method.invoke(event, Math.max(0, (int) Math.round(value)));
          return;
        }
      } catch (Throwable ignored) {
      }
    }
  }

  private void cleanupTracker(long nowMs) {
    if (firstThrowTracker.isEmpty()) return;
    if (firstThrowTracker.size() < 128) return;
    firstThrowTracker.entrySet().removeIf(entry -> (nowMs - entry.getValue()) > FIRST_THROW_WINDOW_MS);
  }

  private void updateCatchStats(UUID uuid, String pokemonName, boolean shiny, boolean legendary) {
    if (uuid == null) return;
    PlayerCatchStats stats = catchStats.computeIfAbsent(uuid, ignored -> new PlayerCatchStats());
    stats.total++;
    if (shiny) stats.shiny++;
    if (legendary) stats.legendary++;
    stats.lastPokemon = pokemonName == null || pokemonName.isBlank() ? "Pokemon" : pokemonName;
    stats.lastShiny = shiny;
    stats.lastLegendary = legendary;
  }

  private boolean asBoolean(Object value) {
    if (value instanceof Boolean b) return b;
    return false;
  }

  private String resolvePokemonName(Object pokemonObj) {
    if (pokemonObj == null) return "Pokemon";
    Object display = tryInvokeNoArgs(pokemonObj, "getDisplayName");
    Object displayText = firstNonNull(
      tryInvokeNoArgs(display, "getString"),
      tryInvokeNoArgs(display, "string")
    );
    if (displayText instanceof String text && !text.isBlank()) return text;

    Object species = tryInvokeNoArgs(pokemonObj, "getSpecies");
    Object translated = tryInvokeNoArgs(species, "getTranslatedName");
    Object translatedText = firstNonNull(
      tryInvokeNoArgs(translated, "getString"),
      tryInvokeNoArgs(translated, "string")
    );
    if (translatedText instanceof String text && !text.isBlank()) return text;
    Object speciesName = tryInvokeNoArgs(species, "getName");
    if (speciesName instanceof String text && !text.isBlank()) return text;
    return "Pokemon";
  }

  private Object tryInvokeNoArgs(Object target, String methodName) {
    if (target == null) return null;
    try {
      Method method = target.getClass().getMethod(methodName);
      method.setAccessible(true);
      return method.invoke(target);
    } catch (Throwable ignored) {
      return null;
    }
  }

  private Object firstNonNull(Object... values) {
    for (Object value : values) {
      if (value != null) return value;
    }
    return null;
  }

  public void announceCatch(MinecraftServer server, ServerPlayerEntity player, String pokemonName, boolean shiny, boolean legendary, ServerFeatureConfig cfg) {
    if (cfg == null || cfg.announcements == null) return;
    if (!cfg.announcements.enabled) return;
    if (!cfg.announcements.catchAnnouncements) return;
    if (shiny && !cfg.announcements.shinyCatchAnnouncements) return;
    if (!shiny && legendary && !cfg.announcements.legendaryCatchAnnouncements) return;

    long now = System.currentTimeMillis() / 1000L;
    long cooldown = Math.max(0, cfg.announcements.cooldownSeconds);
    String kind = shiny ? "shiny" : (legendary ? "legendary" : "catch");
    String key = player.getUuid() + ":" + kind;
    if (cooldown > 0 && now - lastSent.getOrDefault(key, 0L) < cooldown) return;
    lastSent.put(key, now);

    var values = TemplateEngine.baseMap(server, player, cfg.brand);
    values.put("pokemon", pokemonName == null ? "Pokemon" : pokemonName);
    String template = shiny
      ? cfg.announcements.shinyCatchTemplate
      : (legendary ? cfg.announcements.legendaryCatchTemplate : cfg.announcements.catchTemplate);
    String text = TemplateEngine.render(template, values);
    server.getPlayerManager().broadcast(Text.literal(text), false);
  }

  public void announceManual(MinecraftServer server, String message, ServerFeatureConfig cfg) {
    if (cfg == null || cfg.announcements == null) return;
    if (message == null || message.isBlank()) return;
    var values = new java.util.HashMap<String, String>();
    values.put("message", message);
    String formatted = TemplateEngine.render(cfg.announcements.manualTemplate, values);
    server.getPlayerManager().broadcast(Text.literal(formatted), false);
  }

  private static final class PlayerCatchStats {
    int total;
    int shiny;
    int legendary;
    String lastPokemon = "None";
    boolean lastShiny;
    boolean lastLegendary;
  }
}
