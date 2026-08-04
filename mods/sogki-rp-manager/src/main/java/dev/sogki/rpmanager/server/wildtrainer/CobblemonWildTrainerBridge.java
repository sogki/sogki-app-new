package dev.sogki.rpmanager.server.wildtrainer;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.SpawnReason;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.slf4j.Logger;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.function.Consumer;

/**
 * Cobblemon battle integration: hidden {@code cobblemon:npc} host for {@link #startTrainerBattle} when the
 * visible overworld trainer is {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity} (no visible Cobblemon NPC).
 */
public final class CobblemonWildTrainerBridge {
  private static final Identifier NPC_ENTITY_ID = Identifier.of("cobblemon", "npc");

  private final Logger logger;
  private boolean warnedMissingCobblemon;
  private boolean warnedBattleFailure;
  public CobblemonWildTrainerBridge(Logger logger) {
    this.logger = logger;
  }

  public boolean cobblemonPresent() {
    return FabricLoader.getInstance().isModLoaded("cobblemon")
      && Registries.ENTITY_TYPE.containsId(NPC_ENTITY_ID);
  }

  /** True for Cobblemon's {@code cobblemon:npc} entity type (professor, healer, etc.). */
  public boolean isCobblemonNpcEntity(Entity entity) {
    if (entity == null || !cobblemonPresent()) {
      return false;
    }
    return NPC_ENTITY_ID.equals(Registries.ENTITY_TYPE.getId(entity.getType()));
  }

  /**
   * Hidden {@code cobblemon:npc} used only as the battle host for {@link #startTrainerBattle} when the world trainer is
   * {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity}. Must not use Sogki wild-trainer tags.
   */
  public Entity createTransientBattleNpc(ServerWorld world, ServerPlayerEntity anchor, WildTrainerEntry def) {
    if (!cobblemonPresent()) {
      logOnceMissing();
      return null;
    }
    if (world == null || anchor == null || def == null) {
      return null;
    }
    BlockPos ap = anchor.getBlockPos();
    int bottom = world.getBottomY();
    double y = Math.max(bottom + 1.5, ap.getY() - 4.0);
    double x = ap.getX() + 0.5;
    double z = ap.getZ() + 0.5;
    return spawnHiddenBattleHostNpc(world, x, y, z, def);
  }

  private Entity spawnHiddenBattleHostNpc(ServerWorld world, double x, double y, double z, WildTrainerEntry def) {
    if (!cobblemonPresent()) {
      return null;
    }
    int npcLevel = Math.max(1, def.npcLevel);
    int skill = Math.max(0, Math.min(5, def.skill));
    List<String> partyLines = def.partyLines == null ? List.of() : def.partyLines;
    float yaw = 0.0F;
    try {
      Class<?> npcClass = Class.forName("com.cobblemon.mod.common.entity.npc.NPCEntity");
      EntityType<?> entityType = Registries.ENTITY_TYPE.get(NPC_ENTITY_ID);
      Entity entity = createNpcEntity(entityType, world, x, y, z);
      if (entity == null || !npcClass.isInstance(entity)) {
        logger.warn("[SogkiCobblemon] cobblemon:npc EntityType.create/spawn returned null or wrong type.");
        return null;
      }

      Object npcEntity = entity;
      entity.refreshPositionAndAngles(x, y, z, yaw, 0.0F);

      Object dummyValue = resolveDummyNpcClass();
      if (dummyValue == null) {
        logger.warn("[SogkiCobblemon] NPCClasses.dummy() unavailable for this Cobblemon version.");
        return null;
      }

      boolean preConfigured = invokeSetNpc(npcClass, npcEntity, dummyValue)
        && invokeInitialize(npcClass, npcEntity, npcLevel);

      if (!world.spawnEntity(entity)) {
        logger.warn("[SogkiCobblemon] world.spawnEntity(cobblemon:npc) returned false (position blocked?).");
        return null;
      }

      if (!preConfigured) {
        invokeSetNpc(npcClass, npcEntity, dummyValue);
        invokeInitialize(npcClass, npcEntity, npcLevel);
      }

      Object partyStore = buildNpcPartyStore(world, npcEntity, partyLines);
      if (partyStore == null) {
        entity.discard();
        logger.warn("[SogkiCobblemon] Party build failed (PokemonProperties.parse / create or party set).");
        return null;
      }
      attachParty(npcClass, npcEntity, partyStore);

      applySkillAndMovement(npcClass, npcEntity, skill, false);
      entity.setInvulnerable(true);
      entity.setSilent(true);
      entity.setInvisible(true);
      if (entity instanceof LivingEntity living) {
        living.setInvisible(true);
      }
      entity.setCustomNameVisible(false);
      invokeVoid1(npcClass, npcEntity, "setHideNameTag", boolean.class, true);
      invokeVoid1(npcClass, npcEntity, "setRenderScale", float.class, 0.01f);
      invokeVoid1(npcClass, npcEntity, "setHitboxScale", float.class, 0.01f);
      return entity;
    } catch (Throwable t) {
      logger.warn("[SogkiCobblemon] Failed to spawn hidden Cobblemon battle host: {}", t.toString());
      logger.debug("[SogkiCobblemon] Battle host spawn trace", t);
      return null;
    }
  }

  /**
   * Minecraft 1.21+ {@link EntityType#create(World)} is the usual entry (same as vanilla armor stands, etc.).
   * Reflective fallbacks cover {@code create(ServerWorld, Consumer, BlockPos, SpawnReason, boolean, boolean)} and older shapes.
   */
  private static Entity createNpcEntity(EntityType<?> entityType, ServerWorld world, double x, double y, double z) {
    if (entityType == null) {
      return null;
    }
    try {
      Entity direct = entityType.create(world);
      if (direct != null) {
        return direct;
      }
    } catch (Throwable ignored) {
    }
    BlockPos pos = BlockPos.ofFloored(x, y, z);
    try {
      for (Class<?> c = entityType.getClass(); c != null && c != Object.class; c = c.getSuperclass()) {
        for (Method m : c.getDeclaredMethods()) {
          if (Modifier.isStatic(m.getModifiers())) {
            continue;
          }
          String name = m.getName();
          if (!"create".equals(name) && !"spawn".equals(name)) {
            continue;
          }
          Class<?>[] p = m.getParameterTypes();
          try {
            m.setAccessible(true);
            if (p.length == 1 && World.class.isAssignableFrom(p[0])) {
              Object e = m.invoke(entityType, world);
              if (e instanceof Entity ent) {
                return ent;
              }
            }
            if (p.length == 6
              && p[0] == ServerWorld.class
              && Consumer.class.isAssignableFrom(p[1])
              && p[2] == BlockPos.class
              && p[3] == SpawnReason.class
              && p[4] == boolean.class
              && p[5] == boolean.class) {
              for (boolean align : new boolean[]{true, false}) {
                for (boolean invert : new boolean[]{false, true}) {
                  Object e = m.invoke(entityType, world, null, pos, SpawnReason.COMMAND, align, invert);
                  if (e instanceof Entity ent) {
                    return ent;
                  }
                }
              }
            }
            if (p.length == 2 && p[0] == ServerWorld.class && p[1] == SpawnReason.class) {
              Object e = m.invoke(entityType, world, SpawnReason.COMMAND);
              if (e instanceof Entity ent) {
                return ent;
              }
            }
            if (p.length == 3 && p[0] == ServerWorld.class && p[1] == BlockPos.class && p[2] == SpawnReason.class) {
              Object e = m.invoke(entityType, world, pos, SpawnReason.COMMAND);
              if (e instanceof Entity ent) {
                return ent;
              }
            }
          } catch (Throwable ignored) {
          }
        }
      }
    } catch (Throwable ignored) {
    }
    return null;
  }

  private static boolean invokeSetNpc(Class<?> npcClass, Object npcEntity, Object dummy) {
    for (Method m : npcClass.getMethods()) {
      if (!"setNpc".equals(m.getName()) || m.getParameterCount() != 1) {
        continue;
      }
      if (!m.getParameterTypes()[0].isInstance(dummy)) {
        continue;
      }
      try {
        m.invoke(npcEntity, dummy);
        return true;
      } catch (Throwable ignored) {
      }
    }
    try {
      Field f = npcClass.getDeclaredField("npc");
      f.setAccessible(true);
      f.set(npcEntity, dummy);
      return true;
    } catch (Throwable ignored) {
    }
    return false;
  }

  private static boolean invokeInitialize(Class<?> npcClass, Object npcEntity, int npcLevel) {
    for (Method m : npcClass.getMethods()) {
      if (!"initialize".equals(m.getName())) {
        continue;
      }
      Class<?>[] p = m.getParameterTypes();
      try {
        if (p.length == 1 && p[0] == int.class) {
          m.invoke(npcEntity, npcLevel);
          return true;
        }
        if (p.length == 1 && p[0] == Integer.class) {
          m.invoke(npcEntity, npcLevel);
          return true;
        }
        if (p.length == 0) {
          m.invoke(npcEntity);
          return true;
        }
      } catch (Throwable ignored) {
      }
    }
    return false;
  }

  /**
   * Re-applies skin, nameplate, and Cobblemon sync for a visible {@code cobblemon:npc} (legacy / stray entities only).
   */
  public void refreshWildTrainerPresentation(Entity entity, WildTrainerEntry trainer, WildTrainerFileConfig cfg) {
    if (entity == null || trainer == null || cfg == null || !isCobblemonNpcEntity(entity)) {
      return;
    }
    try {
      Class<?> npcClass = Class.forName("com.cobblemon.mod.common.entity.npc.NPCEntity");
      invokeVoid1(npcClass, entity, "setHideNameTag", boolean.class, false);
      WildTrainerNametags.applyVanillaStyle(entity, trainer, cfg);
      applySkin(npcClass, entity, trainer.skinUsername);
      invokeUpdateAspects(npcClass, entity);
      refreshNpcPresentation(entity);
      entity.setCustomNameVisible(true);
    } catch (Throwable t) {
      logger.debug("[SogkiCobblemon] refreshWildTrainerPresentation: {}", t.getMessage());
    }
  }

  /**
   * Cobblemon {@code NPCEntity} uses synced fields for name tag visibility and scale; also {@code loadTextureFromGameProfileName}
   * resolves asynchronously. Call again on the next server tick if the model still looks wrong.
   */
  public void refreshNpcPresentation(Entity entity) {
    if (entity == null || !cobblemonPresent()) {
      return;
    }
    try {
      Class<?> npcClass = Class.forName("com.cobblemon.mod.common.entity.npc.NPCEntity");
      if (!npcClass.isInstance(entity)) {
        return;
      }
      entity.setInvisible(false);
      if (entity instanceof LivingEntity living) {
        living.setInvisible(false);
      }
      invokeVoid1(npcClass, entity, "setHideNameTag", boolean.class, false);
      invokeVoid1(npcClass, entity, "setRenderScale", float.class, 1.0f);
      invokeVoid1(npcClass, entity, "setHitboxScale", float.class, 1.0f);
    } catch (Throwable t) {
      logger.debug("[SogkiCobblemon] refreshNpcPresentation: {}", t.getMessage());
    }
  }

  public void reapplyPlayerSkin(Entity entity, String skinUsername) {
    if (entity == null || skinUsername == null || skinUsername.isBlank() || !cobblemonPresent()) {
      return;
    }
    try {
      Class<?> npcClass = Class.forName("com.cobblemon.mod.common.entity.npc.NPCEntity");
      if (!npcClass.isInstance(entity)) {
        return;
      }
      applySkin(npcClass, entity, skinUsername);
      refreshNpcPresentation(entity);
    } catch (Throwable ignored) {
    }
  }

  private static void invokeVoid1(Class<?> c, Object target, String method, Class<?> paramType, Object value) {
    try {
      Method m = c.getMethod(method, paramType);
      m.invoke(target, value);
    } catch (Throwable ignored) {
    }
  }

  private static void invokeUpdateAspects(Class<?> npcClass, Object npcEntity) {
    if (npcClass == null || npcEntity == null) {
      return;
    }
    try {
      Method m = npcClass.getMethod("updateAspects");
      m.invoke(npcEntity);
      return;
    } catch (Throwable ignored) {
    }
    try {
      Method m = npcClass.getDeclaredMethod("updateAspects");
      m.setAccessible(true);
      m.invoke(npcEntity);
    } catch (Throwable ignored) {
    }
  }

  private static void applySkin(Class<?> npcClass, Object npcEntity, String skinUsername) {
    if (skinUsername == null || skinUsername.isBlank()) {
      return;
    }
    String name = skinUsername.trim();
    try {
      Method loadSkin = npcClass.getMethod("loadTextureFromGameProfileName", String.class);
      loadSkin.invoke(npcEntity, name);
    } catch (Throwable ignored) {
    }
    for (Class<?> c = npcClass; c != null && c != Object.class; c = c.getSuperclass()) {
      for (Method m : c.getDeclaredMethods()) {
        if (m.getParameterCount() != 1 || m.getParameterTypes()[0] != String.class) {
          continue;
        }
        String n = m.getName();
        if (!(n.contains("Texture") || n.contains("Profile") || n.contains("Skin") || n.contains("Avatar"))) {
          continue;
        }
        try {
          m.setAccessible(true);
          m.invoke(npcEntity, name);
        } catch (Throwable ignored) {
        }
      }
    }
    for (Method m : npcClass.getMethods()) {
      if (m.getParameterCount() != 1 || m.getParameterTypes()[0] != String.class) {
        continue;
      }
      String n = m.getName();
      if (n.contains("Texture") || n.contains("Profile") || n.contains("Skin")) {
        try {
          m.invoke(npcEntity, name);
        } catch (Throwable ignored) {
        }
      }
    }
  }

  private static void attachParty(Class<?> npcClass, Object npcEntity, Object partyStore) throws Exception {
    try {
      Method setParty = npcClass.getMethod("setParty", partyStore.getClass());
      setParty.invoke(npcEntity, partyStore);
    } catch (NoSuchMethodException e) {
      Field partyField = npcClass.getDeclaredField("party");
      partyField.setAccessible(true);
      partyField.set(npcEntity, partyStore);
    }
    Method partyInit = partyStore.getClass().getMethod("initialize");
    partyInit.invoke(partyStore);
  }

  private static void applySkillAndMovement(Class<?> npcClass, Object npcEntity, int skill, boolean wander) {
    try {
      Field skillField = npcClass.getDeclaredField("skill");
      skillField.setAccessible(true);
      skillField.set(npcEntity, skill);
    } catch (Exception ignored) {
    }
    try {
      Field invuln = npcClass.getDeclaredField("isInvulnerable");
      invuln.setAccessible(true);
      invuln.set(npcEntity, Boolean.TRUE);
      Field movable = npcClass.getDeclaredField("isMovable");
      movable.setAccessible(true);
      movable.set(npcEntity, wander);
    } catch (Exception ignored) {
    }
  }

  public boolean startTrainerBattle(ServerPlayerEntity player, Object npcEntity) {
    if (!cobblemonPresent() || player == null || npcEntity == null) {
      return false;
    }
    try {
      Class<?> bbClass = Class.forName("com.cobblemon.mod.common.battles.BattleBuilder");
      Object instance = bbClass.getField("INSTANCE").get(null);
      Method pvn = null;
      for (Method m : bbClass.getMethods()) {
        if ("pvn".equals(m.getName()) && m.getParameterCount() == 2) {
          Class<?>[] p = m.getParameterTypes();
          if (p[0].isAssignableFrom(player.getClass()) && p[1].isAssignableFrom(npcEntity.getClass())) {
            pvn = m;
            break;
          }
        }
      }
      if (pvn == null) {
        logger.warn("[SogkiCobblemon] BattleBuilder.pvn(ServerPlayer, NPCEntity) not found for this Cobblemon version.");
        return false;
      }
      Object result = pvn.invoke(instance, player, npcEntity);
      Class<?> errClass = Class.forName("com.cobblemon.mod.common.battles.ErroredBattleStart");
      if (errClass.isInstance(result)) {
        Method sendTo = errClass.getMethod("sendTo", net.minecraft.entity.Entity.class);
        sendTo.invoke(result, player);
        return false;
      }
      return true;
    } catch (Throwable t) {
      if (!warnedBattleFailure) {
        warnedBattleFailure = true;
        logger.warn("[SogkiCobblemon] Could not start Cobblemon trainer battle (API mismatch?): {}", t.getMessage());
      }
      logger.debug("[SogkiCobblemon] Battle start trace", t);
      return false;
    }
  }

  private Object resolveDummyNpcClass() {
    try {
      Class<?> npcClassesType = Class.forName("com.cobblemon.mod.common.api.npc.NPCClasses");
      try {
        Field inst = npcClassesType.getField("INSTANCE");
        Object obj = inst.get(null);
        Method dummy = obj.getClass().getMethod("dummy");
        return dummy.invoke(obj);
      } catch (Throwable ignored) {
      }
      try {
        Field comp = npcClassesType.getDeclaredField("Companion");
        comp.setAccessible(true);
        Object companion = comp.get(null);
        return companion.getClass().getMethod("dummy").invoke(companion);
      } catch (Throwable ignored) {
      }
      try {
        return npcClassesType.getMethod("dummy").invoke(null);
      } catch (Throwable ignored) {
      }
    } catch (Throwable t1) {
      logger.warn("[SogkiCobblemon] Could not resolve Cobblemon NPCClasses.dummy(): {}", t1.toString());
    }
    return null;
  }

  private Object buildNpcPartyStore(ServerWorld world, Object npcEntity, List<String> partyLines) throws Exception {
    Class<?> npcClass = npcEntity.getClass();
    Class<?> partyStoreClass = Class.forName("com.cobblemon.mod.common.api.storage.party.NPCPartyStore");
    Constructor<?> ctor = partyStoreClass.getConstructor(npcClass);
    Object store = ctor.newInstance(npcEntity);

    Class<?> propsClass = Class.forName("com.cobblemon.mod.common.api.pokemon.PokemonProperties");
    PokemonParseBinding parseBinding = resolvePokemonPropertiesParse(propsClass);
    if (parseBinding == null) {
      logger.warn("[SogkiCobblemon] PokemonProperties.parse(String) not found for {} (Companion / static / *Kt).",
        propsClass.getName());
      return null;
    }

    Method createPokemon = null;
    Class<?> propsRuntimeClass = propsClass;
    for (String probe : partyLines) {
      if (probe == null || probe.isBlank()) {
        continue;
      }
      try {
        Object sample = parseBinding.parse(probe.trim());
        if (sample != null) {
          propsRuntimeClass = sample.getClass();
          createPokemon = findCreatePokemonMethod(propsRuntimeClass);
          if (createPokemon != null) {
            break;
          }
        }
      } catch (Throwable ignored) {
      }
    }
    if (createPokemon == null) {
      createPokemon = findCreatePokemonMethod(propsClass);
    }
    if (createPokemon == null) {
      logger.warn("[SogkiCobblemon] PokemonProperties.create / create(ServerWorld) not found on {}.",
        propsRuntimeClass.getName());
      return null;
    }

    Method set = findPartySetMethod(partyStoreClass);
    if (set == null) {
      logger.warn("[SogkiCobblemon] PartyStore.set not found.");
      return null;
    }

    int i = 0;
    for (String line : partyLines) {
      if (line == null || line.isBlank()) {
        continue;
      }
      Object props = parseBinding.parse(line.trim());
      if (props == null) {
        continue;
      }
      Method createForInstance = createPokemon.getDeclaringClass().isAssignableFrom(props.getClass())
        ? createPokemon
        : findCreatePokemonMethod(props.getClass());
      if (createForInstance == null) {
        continue;
      }
      Object pokemon = invokeCreatePokemon(createForInstance, props, world);
      if (pokemon == null) {
        continue;
      }
      set.invoke(store, i, pokemon);
      i++;
    }
    if (i == 0) {
      logger.warn("[SogkiCobblemon] Trainer party was empty after parsing.");
      return null;
    }
    return store;
  }

  /** Kotlin often puts {@code parse} on the companion, not as a static on the outer class. */
  private static final class PokemonParseBinding {
    private final Method method;
    /** null when {@link Method} is static */
    private final Object receiver;

    private PokemonParseBinding(Method method, Object receiver) {
      this.method = method;
      this.receiver = receiver;
    }

    Object parse(String spec) throws Exception {
      if (Modifier.isStatic(method.getModifiers())) {
        return method.invoke(null, spec);
      }
      return method.invoke(receiver, spec);
    }
  }

  private static PokemonParseBinding resolvePokemonPropertiesParse(Class<?> propsClass) {
    for (Class<?> c = propsClass; c != null && c != Object.class; c = c.getSuperclass()) {
      PokemonParseBinding b = findStaticParseMethod(c);
      if (b != null) {
        return b;
      }
    }
    try {
      Field comp = propsClass.getDeclaredField("Companion");
      comp.setAccessible(true);
      Object companion = comp.get(null);
      PokemonParseBinding b = findInstanceParseMethod(companion.getClass(), companion);
      if (b != null) {
        return b;
      }
    } catch (Throwable ignored) {
    }
    try {
      Field inst = propsClass.getDeclaredField("INSTANCE");
      inst.setAccessible(true);
      Object obj = inst.get(null);
      PokemonParseBinding b = findInstanceParseMethod(obj.getClass(), obj);
      if (b != null) {
        return b;
      }
    } catch (Throwable ignored) {
    }
    try {
      Class<?> kt = Class.forName(propsClass.getName() + "Kt");
      PokemonParseBinding b = findStaticParseMethod(kt);
      if (b != null) {
        return b;
      }
    } catch (Throwable ignored) {
    }
    return null;
  }

  private static PokemonParseBinding findStaticParseMethod(Class<?> clazz) {
    for (Method m : clazz.getDeclaredMethods()) {
      if (!Modifier.isStatic(m.getModifiers()) || !"parse".equals(m.getName()) || m.getParameterCount() != 1) {
        continue;
      }
      if (!isStringLikeParameter(m.getParameterTypes()[0])) {
        continue;
      }
      m.setAccessible(true);
      return new PokemonParseBinding(m, null);
    }
    return null;
  }

  private static PokemonParseBinding findInstanceParseMethod(Class<?> clazz, Object receiver) {
    for (Method m : clazz.getDeclaredMethods()) {
      if (Modifier.isStatic(m.getModifiers()) || !"parse".equals(m.getName()) || m.getParameterCount() != 1) {
        continue;
      }
      if (!isStringLikeParameter(m.getParameterTypes()[0])) {
        continue;
      }
      m.setAccessible(true);
      return new PokemonParseBinding(m, receiver);
    }
    return null;
  }

  private static boolean isStringLikeParameter(Class<?> t) {
    return t == String.class || t == CharSequence.class;
  }

  private static Method findCreatePokemonMethod(Class<?> startClass) {
    for (Class<?> c = startClass; c != null && c != Object.class; c = c.getSuperclass()) {
      Method zeroArg = null;
      Method oneArg = null;
      for (Method m : c.getDeclaredMethods()) {
        if (!"create".equals(m.getName())) {
          continue;
        }
        m.setAccessible(true);
        if (m.getParameterCount() == 1 && m.getParameterTypes()[0] == ServerWorld.class) {
          return m;
        }
        if (m.getParameterCount() == 0) {
          zeroArg = m;
        } else if (m.getParameterCount() == 1) {
          oneArg = m;
        }
      }
      if (oneArg != null) {
        return oneArg;
      }
      if (zeroArg != null) {
        return zeroArg;
      }
    }
    return null;
  }

  private static Object invokeCreatePokemon(Method createPokemon, Object props, ServerWorld world) {
    try {
      if (createPokemon.getParameterCount() == 0) {
        return createPokemon.invoke(props);
      }
      Class<?> t = createPokemon.getParameterTypes()[0];
      if (t == ServerWorld.class) {
        return createPokemon.invoke(props, world);
      }
      try {
        return createPokemon.invoke(props, new Object[]{null});
      } catch (Throwable ignored) {
      }
      if (t == boolean.class) {
        return createPokemon.invoke(props, true);
      }
      return null;
    } catch (Throwable ignored) {
      return null;
    }
  }

  private static Method findPartySetMethod(Class<?> partyStoreClass) {
    Class<?> walk = partyStoreClass;
    while (walk != null) {
      for (Method m : walk.getDeclaredMethods()) {
        if (!"set".equals(m.getName()) || m.getParameterCount() != 2) {
          continue;
        }
        Class<?>[] p = m.getParameterTypes();
        if ((p[0] == int.class || p[0] == Integer.class) && !p[1].isPrimitive()) {
          m.setAccessible(true);
          return m;
        }
      }
      walk = walk.getSuperclass();
    }
    return null;
  }

  private void logOnceMissing() {
    if (!warnedMissingCobblemon) {
      warnedMissingCobblemon = true;
      logger.info("[SogkiCobblemon] Cobblemon NPC entity not found — wild trainers disabled.");
    }
  }
}
