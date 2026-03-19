package dev.sogki.rpmanager.server;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.config.ServerConfigManager;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.service.AreaService;
import dev.sogki.rpmanager.server.service.ChatFormatService;
import dev.sogki.rpmanager.server.service.CobblemonAnnouncementService;
import dev.sogki.rpmanager.server.service.RegionProtectionService;
import dev.sogki.rpmanager.server.service.StreakService;
import dev.sogki.rpmanager.server.service.TablistSidebarService;
import dev.sogki.rpmanager.server.service.QuizService;
import dev.sogki.rpmanager.server.util.MessageDisplay;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.message.v1.ServerMessageDecoratorEvent;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.block.AbstractSignBlock;
import net.minecraft.block.BedBlock;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.block.ButtonBlock;
import net.minecraft.block.DoorBlock;
import net.minecraft.block.FenceGateBlock;
import net.minecraft.block.LeverBlock;
import net.minecraft.block.TrapdoorBlock;
import net.minecraft.command.argument.IdentifierArgumentType;
import net.minecraft.entity.ai.brain.MemoryModuleType;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.mob.EndermanEntity;
import net.minecraft.entity.mob.MobEntity;
import net.minecraft.entity.passive.VillagerEntity;
import net.minecraft.entity.mob.ZombieEntity;
import net.minecraft.entity.projectile.ProjectileEntity;
import net.minecraft.item.BlockItem;
import net.minecraft.registry.Registries;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Identifier;
import net.minecraft.world.World;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class SogkiCobblemonServerMod implements ModInitializer {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path SPAWN_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("spawn.json");

  private static final ServerConfigManager CONFIG_MANAGER = new ServerConfigManager();
  private static final StreakService STREAK_SERVICE = new StreakService();
  private static final AreaService AREA_SERVICE = new AreaService(LOGGER);
  private static final RegionProtectionService REGION_SERVICE = new RegionProtectionService();
  private static final ChatFormatService CHAT_SERVICE = new ChatFormatService();
  private static final TablistSidebarService TABLIST_SERVICE = new TablistSidebarService();
  private static final CobblemonAnnouncementService COBBLEMON_ANNOUNCEMENTS = new CobblemonAnnouncementService(LOGGER);
  private static final QuizService QUIZ_SERVICE = new QuizService();

  private static long ticks;

  @Override
  public void onInitialize() {
    ServerFeatureConfig cfg = CONFIG_MANAGER.reload();
    STREAK_SERVICE.load();
    LOGGER.info("[SogkiCobblemon] Loaded.");

    registerLifecycle();
    registerCommands();
    registerGameplayHooks();
    registerFormattingHooks();
  }

  private void registerLifecycle() {
    ServerLifecycleEvents.SERVER_STARTED.register(server -> {
      CONFIG_MANAGER.reload();
      STREAK_SERVICE.load();
      COBBLEMON_ANNOUNCEMENTS.tryRegisterCobblemonHooks();
      LOGGER.info("[SogkiCobblemon] Server started.");
    });

    ServerLifecycleEvents.SERVER_STOPPING.register(server -> STREAK_SERVICE.save());

    ServerTickEvents.END_SERVER_TICK.register(server -> {
      ticks++;
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      AREA_SERVICE.tick(server, cfg, ticks);
      TABLIST_SERVICE.tick(server, cfg, ticks);
      QUIZ_SERVICE.tick(server, cfg, ticks);
      enforceMobSpawnRules(server, cfg);
      enforceExplosiveRegionSafety(server, cfg);
      suppressVillagerZombiePanic(server, cfg);
      enforceNpcPersistence(server);
    });

    ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      STREAK_SERVICE.onJoin(handler.player, cfg);
      COBBLEMON_ANNOUNCEMENTS.tryRegisterCobblemonHooks();
      String town = REGION_SERVICE.townNameAt(handler.player.getWorld(), handler.player.getBlockPos(), cfg);
      if (town != null) {
        var values = TemplateEngine.baseMap(server, handler.player, cfg.brand);
        values.put("town", town);
        MessageDisplay.send(handler.player, TemplateEngine.render(cfg.messages.enteredTown, values), cfg.area.townDisplay);
      }
    });
  }

  private void registerGameplayHooks() {
    PlayerBlockBreakEvents.BEFORE.register((world, player, pos, state, blockEntity) -> {
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity sp)) {
        return true;
      }
      return !REGION_SERVICE.denyBreak(world, pos, sp, CONFIG_MANAGER.get());
    });

    UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
      if (world.isClient()) return ActionResult.PASS;
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity sp)) return ActionResult.PASS;
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      var stack = sp.getStackInHand(hand);
      var item = stack.getItem();
      var targetPos = hitResult.getBlockPos();
      BlockState targetState = world.getBlockState(targetPos);

      if (targetState.isOf(Blocks.TNT) && REGION_SERVICE.denyExplosiveUse(world, targetPos, sp, item, cfg)) {
        return ActionResult.FAIL;
      }

      // Preserve normal interaction UX (chests/doors/PCs/etc.) while still blocking true placement attempts.
      if (shouldAllowInteraction(targetState, sp)) {
        return ActionResult.PASS;
      }

      if (item instanceof BlockItem && REGION_SERVICE.denyPlace(world, targetPos, sp, cfg)) {
        return ActionResult.FAIL;
      }

      return ActionResult.PASS;
    });

    ServerLivingEntityEvents.ALLOW_DAMAGE.register((entity, source, amount) -> {
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      if (cfg == null || cfg.regions == null || !cfg.regions.protectVillagersFromMobs) return true;
      if (!(entity instanceof VillagerEntity)) return true;

      var attacker = source.getAttacker();
      if (attacker instanceof MobEntity) return false;

      var direct = source.getSource();
      if (direct instanceof MobEntity) return false;
      if (direct instanceof ProjectileEntity projectile && projectile.getOwner() instanceof MobEntity) return false;

      return true;
    });

  }

  private void enforceMobSpawnRules(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (!cfg.regions.enabled && (cfg.cobbletown == null || !cfg.cobbletown.enabled)) return;
    if (ticks % 20 != 0) return;
    for (var world : server.getWorlds()) {
      List<net.minecraft.entity.Entity> toDiscard = new ArrayList<>();
      for (var entity : world.iterateEntities()) {
        if (entity == null) continue;
        try {
          var pos = entity.getBlockPos();
          if (pos == null) continue;
          if (REGION_SERVICE.denyMobSpawn(world, pos, entity, cfg)) {
            toDiscard.add(entity);
            continue;
          }
        } catch (Throwable ignored) {
          // Defensive guard: skip entities that become invalid mid-iteration.
        }
      }
      for (var entity : toDiscard) {
        try {
          if (entity != null && entity.isAlive()) {
            entity.discard();
          }
        } catch (Throwable ignored) {
        }
      }
    }
  }

  private void suppressVillagerZombiePanic(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (cfg == null || cfg.regions == null || !cfg.regions.villagersIgnoreZombieFear) return;
    if (ticks % 10 != 0) return;
    for (var world : server.getWorlds()) {
      for (var entity : world.iterateEntities()) {
        if (!(entity instanceof VillagerEntity villager)) continue;
        try {
          var brain = villager.getBrain();
          var nearestHostile = brain.getOptionalRegisteredMemory(MemoryModuleType.NEAREST_HOSTILE);
          if (nearestHostile.isPresent()) {
            LivingEntity hostile = nearestHostile.get();
            if (hostile instanceof ZombieEntity) {
              brain.forget(MemoryModuleType.NEAREST_HOSTILE);
            }
          }
        } catch (Throwable ignored) {
          // Best-effort guard for API variance.
        }
      }
    }
  }

  private void enforceExplosiveRegionSafety(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (!cfg.regions.enabled && (cfg.cobbletown == null || !cfg.cobbletown.enabled)) return;
    if (ticks % 5 != 0) return;
    for (var world : server.getWorlds()) {
      List<net.minecraft.entity.Entity> toDiscard = new ArrayList<>();
      for (var entity : world.iterateEntities()) {
        if (entity == null) continue;
        try {
          var pos = entity.getBlockPos();
          if (pos == null) continue;
          if (REGION_SERVICE.denyExplosiveThreatEntity(world, pos, entity, cfg)) {
            toDiscard.add(entity);
            continue;
          }
          if (entity instanceof EndermanEntity enderman
            && REGION_SERVICE.denyEndermanGriefInProtectedArea(world, pos, entity, cfg)) {
            enderman.setCarriedBlock(null);
          }
        } catch (Throwable ignored) {
        }
      }
      for (var entity : toDiscard) {
        try {
          if (entity != null && entity.isAlive()) entity.discard();
        } catch (Throwable ignored) {
        }
      }
    }
  }

  private void enforceNpcPersistence(net.minecraft.server.MinecraftServer server) {
    if (ticks % 40 != 0) return;
    for (var world : server.getWorlds()) {
      for (var entity : world.iterateEntities()) {
        if (!(entity instanceof MobEntity mob)) continue;
        if (!isCobbletownEntity(entity)) continue;
        try {
          mob.setPersistent();
        } catch (Throwable ignored) {
          // Best effort: keep custom town NPCs from despawning.
        }
      }
    }
  }

  private void registerFormattingHooks() {
    ServerMessageDecoratorEvent.EVENT.register(ServerMessageDecoratorEvent.CONTENT_PHASE, (sender, message) -> {
      if (sender == null || sender.getServer() == null) return message;
      QUIZ_SERVICE.onPlayerChat(sender.getServer(), sender, message.getString(), CONFIG_MANAGER.get());
      return CHAT_SERVICE.format(sender.getServer(), sender, message, CONFIG_MANAGER.get());
    });
  }

  private void registerCommands() {
    CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
      dispatcher.register(CommandManager.literal("claim")
        .executes(ctx -> runClaim(ctx.getSource())));

      dispatcher.register(CommandManager.literal("claimmenu")
        .executes(ctx -> runClaimMenu(ctx.getSource())));

      dispatcher.register(CommandManager.literal("spawn")
        .executes(ctx -> runSpawn(ctx.getSource())));

      dispatcher.register(CommandManager.literal("setspawn")
        .requires(src -> src.hasPermissionLevel(2))
        .executes(ctx -> runSetSpawn(ctx.getSource())));

      var adminCommand = CommandManager.literal("sogkiadmin")
        .requires(src -> src.hasPermissionLevel(2))
        .then(CommandManager.literal("reload")
          .executes(ctx -> runReload(ctx.getSource())))
        .then(CommandManager.literal("tab")
          .then(CommandManager.literal("preview")
            .executes(ctx -> runTabPreview(ctx.getSource()))))
        .then(CommandManager.literal("sidebar")
          .then(CommandManager.literal("preview")
            .executes(ctx -> runSidebarPreview(ctx.getSource()))))
        .then(CommandManager.literal("announce")
          .then(CommandManager.argument("message", StringArgumentType.greedyString())
            .executes(ctx -> runAnnounce(ctx.getSource(), StringArgumentType.getString(ctx, "message")))))
        .then(CommandManager.literal("checkregion")
          .executes(ctx -> runCheckRegion(ctx.getSource())))
        .then(CommandManager.literal("whereami")
          .executes(ctx -> runWhereAmI(ctx.getSource())))
        .then(CommandManager.literal("quiz")
          .then(CommandManager.literal("start")
            .executes(ctx -> runQuizStart(ctx.getSource())))
          .then(CommandManager.literal("skip")
            .executes(ctx -> runQuizSkip(ctx.getSource())))
          .then(CommandManager.literal("status")
            .executes(ctx -> runQuizStatus(ctx.getSource()))))
        .then(CommandManager.literal("makeradius")
          .then(CommandManager.literal("region")
            .then(CommandManager.argument("id", StringArgumentType.word())
              .then(CommandManager.argument("radius", IntegerArgumentType.integer(1, 10000))
                .executes(ctx -> runMakeRadiusRegion(
                  ctx.getSource(),
                  StringArgumentType.getString(ctx, "id"),
                  IntegerArgumentType.getInteger(ctx, "radius")
                )))))
          .then(CommandManager.literal("town")
            .then(CommandManager.argument("townId", IdentifierArgumentType.identifier())
              .then(CommandManager.argument("radius", IntegerArgumentType.integer(1, 10000))
                .executes(ctx -> runMakeRadiusTown(
                  ctx.getSource(),
                  IdentifierArgumentType.getIdentifier(ctx, "townId").toString(),
                  IntegerArgumentType.getInteger(ctx, "radius")
                )))))
        );

      dispatcher.register(adminCommand);
    });
  }

  private static int runClaim(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      var result = STREAK_SERVICE.claim(player, CONFIG_MANAGER.get());
      if (result.ok()) {
        source.sendFeedback(() -> Text.literal(result.message()), false);
        return 1;
      }
      source.sendError(Text.literal(result.message()));
      return 0;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.claimPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runClaimMenu(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      player.sendMessage(STREAK_SERVICE.menuText(player, CONFIG_MANAGER.get()));
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.claimMenuPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runReload(ServerCommandSource source) {
    ServerFeatureConfig cfg = CONFIG_MANAGER.reload();
    STREAK_SERVICE.save();
    String msg = TemplateEngine.render(cfg.messages.configReloaded, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runTabPreview(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    TABLIST_SERVICE.refreshTablist(source.getServer(), CONFIG_MANAGER.get());
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.tabPreviewRefreshed, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runSidebarPreview(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    TABLIST_SERVICE.tick(source.getServer(), CONFIG_MANAGER.get(), Long.MAX_VALUE / 4);
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.sidebarPreviewRefreshed, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runAnnounce(ServerCommandSource source, String message) {
    if (source.getServer() == null) return 0;
    COBBLEMON_ANNOUNCEMENTS.announceManual(source.getServer(), message, CONFIG_MANAGER.get());
    return 1;
  }

  private static int runSetSpawn(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      var pos = player.getPos();
      SpawnPoint spawn = new SpawnPoint();
      spawn.dimension = player.getWorld().getRegistryKey().getValue().toString();
      spawn.x = pos.x;
      spawn.y = pos.y;
      spawn.z = pos.z;
      spawn.yaw = player.getYaw();
      spawn.pitch = player.getPitch();
      if (!saveSpawn(spawn)) {
        source.sendError(Text.literal("Failed to save spawn point."));
        return 0;
      }

      Map<String, String> values = TemplateEngine.baseMap(source.getServer(), player, CONFIG_MANAGER.get().brand);
      values.put("world", spawn.dimension);
      values.put("x", String.valueOf((int) Math.floor(spawn.x)));
      values.put("y", String.valueOf((int) Math.floor(spawn.y)));
      values.put("z", String.valueOf((int) Math.floor(spawn.z)));
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.setSpawnSuccess, values);
      source.sendFeedback(() -> Text.literal(msg), true);
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.setSpawnPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runSpawn(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      SpawnPoint spawn = loadSpawn();
      if (spawn == null || spawn.dimension == null || spawn.dimension.isBlank()) {
        String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.spawnNotSet, Map.of());
        source.sendError(Text.literal(msg));
        return 0;
      }
      Identifier dimId = Identifier.tryParse(spawn.dimension);
      if (dimId == null) {
        String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.spawnNotSet, Map.of());
        source.sendError(Text.literal(msg));
        return 0;
      }

      RegistryKey<World> key = RegistryKey.of(RegistryKeys.WORLD, dimId);
      ServerWorld target = source.getServer().getWorld(key);
      if (target == null) {
        String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.spawnNotSet, Map.of());
        source.sendError(Text.literal(msg));
        return 0;
      }

      player.teleport(target, spawn.x, spawn.y, spawn.z, spawn.yaw, spawn.pitch);
      Map<String, String> values = TemplateEngine.baseMap(source.getServer(), player, CONFIG_MANAGER.get().brand);
      values.put("world", spawn.dimension);
      values.put("x", String.valueOf((int) Math.floor(spawn.x)));
      values.put("y", String.valueOf((int) Math.floor(spawn.y)));
      values.put("z", String.valueOf((int) Math.floor(spawn.z)));
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.spawnTeleported, values);
      source.sendFeedback(() -> Text.literal(msg), false);
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.spawnPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runMakeRadiusRegion(ServerCommandSource source, String id, int radius) {
    try {
      var player = source.getPlayerOrThrow();
      var pos = player.getBlockPos();
      String dim = player.getWorld().getRegistryKey().getValue().toString();
      String snippet = "{\n"
        + "  \"id\": \"" + id + "\",\n"
        + "  \"displayName\": \"" + id + "\",\n"
        + "  \"dimension\": \"" + dim + "\",\n"
        + "  \"useRadius\": true,\n"
        + "  \"centerX\": " + pos.getX() + ",\n"
        + "  \"centerZ\": " + pos.getZ() + ",\n"
        + "  \"radius\": " + radius + ",\n"
        + "  \"minY\": -64,\n"
        + "  \"maxY\": 320,\n"
        + "  \"denyBlockBreak\": true,\n"
        + "  \"denyBlockPlace\": true,\n"
        + "  \"denyExplosives\": true,\n"
        + "  \"denyCreeperExplosions\": true,\n"
        + "  \"denyEndermanGrief\": true,\n"
        + "  \"denyMobSpawn\": true,\n"
        + "  \"isTown\": false\n"
        + "}";
      source.sendFeedback(() -> Text.literal("Region radius snippet generated (copy from logs/chat output)."), false);
      source.sendFeedback(() -> Text.literal(snippet), false);
      LOGGER.info("[SogkiCobblemon] makeRadius region {} -> {}", id, snippet.replace('\n', ' '));
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command must be run by an in-game operator."));
      return 0;
    }
  }

  private static int runMakeRadiusTown(ServerCommandSource source, String townId, int radius) {
    try {
      var player = source.getPlayerOrThrow();
      var pos = player.getBlockPos();
      String dim = player.getWorld().getRegistryKey().getValue().toString();
      String snippet = "{\n"
        + "  \"townId\": \"" + townId + "\",\n"
        + "  \"displayName\": \"" + townId + "\",\n"
        + "  \"dimension\": \"" + dim + "\",\n"
        + "  \"useRadius\": true,\n"
        + "  \"centerX\": " + pos.getX() + ",\n"
        + "  \"centerZ\": " + pos.getZ() + ",\n"
        + "  \"radius\": " + radius + ",\n"
        + "  \"minY\": -64,\n"
        + "  \"maxY\": 320,\n"
        + "  \"denyBlockBreak\": true,\n"
        + "  \"denyBlockPlace\": true,\n"
        + "  \"denyExplosives\": true,\n"
        + "  \"denyCreeperExplosions\": true,\n"
        + "  \"denyEndermanGrief\": true,\n"
        + "  \"denyMobSpawn\": true\n"
        + "}";
      source.sendFeedback(() -> Text.literal("Cobbletown radius snippet generated (copy from logs/chat output)."), false);
      source.sendFeedback(() -> Text.literal(snippet), false);
      LOGGER.info("[SogkiCobblemon] makeRadius town {} -> {}", townId, snippet.replace('\n', ' '));
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command must be run by an in-game operator."));
      return 0;
    }
  }

  private static int runCheckRegion(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      var world = player.getWorld();
      var pos = player.getBlockPos();
      String msg = REGION_SERVICE.debugRegionAt(world, pos, CONFIG_MANAGER.get());
      source.sendFeedback(() -> Text.literal(msg), false);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command must be run by an in-game operator."));
      return 0;
    }
  }

  private static int runWhereAmI(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      var pos = player.getBlockPos();
      String dim = player.getWorld().getRegistryKey().getValue().toString();
      String msg = "Position: x=" + pos.getX() + ", y=" + pos.getY() + ", z=" + pos.getZ() + " | dimension=" + dim;
      source.sendFeedback(() -> Text.literal(msg), false);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command must be run by an in-game operator."));
      return 0;
    }
  }

  private static int runQuizStart(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    boolean started = QUIZ_SERVICE.forceStart(source.getServer(), CONFIG_MANAGER.get(), ticks);
    if (!started) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.quizAdminStartFailed, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.quizAdminStartSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runQuizSkip(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    boolean skipped = QUIZ_SERVICE.skipActive(source.getServer(), CONFIG_MANAGER.get());
    if (!skipped) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.quizAdminSkipFailed, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.quizAdminSkipSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runQuizStatus(ServerCommandSource source) {
    String status = QUIZ_SERVICE.status(ticks);
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.quizAdminStatus, Map.of("status", status));
    source.sendFeedback(() -> Text.literal(msg), false);
    return 1;
  }

  private static boolean shouldAllowInteraction(BlockState state, net.minecraft.server.network.ServerPlayerEntity player) {
    if (state == null || state.isAir()) return false;
    if (player != null && player.isSneaking()) return false;

    if (state.hasBlockEntity()) return true;
    var block = state.getBlock();
    if (block instanceof DoorBlock
      || block instanceof TrapdoorBlock
      || block instanceof FenceGateBlock
      || block instanceof ButtonBlock
      || block instanceof LeverBlock
      || block instanceof BedBlock
      || block instanceof AbstractSignBlock) {
      return true;
    }

    Identifier id = Registries.BLOCK.getId(block);
    if (id == null) return false;
    if ("cobblemon".equals(id.getNamespace())) return true;

    String path = id.getPath();
    return path.contains("chest")
      || path.contains("barrel")
      || path.contains("shulker_box")
      || path.contains("door")
      || path.contains("trapdoor")
      || path.contains("gate")
      || path.contains("button")
      || path.contains("lever")
      || path.contains("anvil")
      || path.contains("crafting")
      || path.contains("furnace")
      || path.contains("enchanting_table");
  }

  private boolean isCobbletownEntity(net.minecraft.entity.Entity entity) {
    try {
      Identifier id = Registries.ENTITY_TYPE.getId(entity.getType());
      if (id == null) return false;
      String namespace = id.getNamespace();
      return "cobbletown".equals(namespace) || "cobbletowns".equals(namespace);
    } catch (Throwable ignored) {
      return false;
    }
  }

  private static SpawnPoint loadSpawn() {
    try {
      if (Files.notExists(SPAWN_PATH)) return null;
      String raw = Files.readString(SPAWN_PATH, StandardCharsets.UTF_8);
      return GSON.fromJson(raw, SpawnPoint.class);
    } catch (Exception ignored) {
      return null;
    }
  }

  private static boolean saveSpawn(SpawnPoint spawn) {
    try {
      Files.createDirectories(SPAWN_PATH.getParent());
      Files.writeString(SPAWN_PATH, GSON.toJson(spawn), StandardCharsets.UTF_8);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  private static final class SpawnPoint {
    String dimension;
    double x;
    double y;
    double z;
    float yaw;
    float pitch;
  }
}
