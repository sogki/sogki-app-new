package dev.sogki.rpmanager.server;

import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.suggestion.Suggestions;
import com.mojang.brigadier.suggestion.SuggestionsBuilder;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.config.ServerConfigManager;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.service.AreaService;
import dev.sogki.rpmanager.server.service.ChatFormatService;
import dev.sogki.rpmanager.server.service.CobblemonAnnouncementService;
import dev.sogki.rpmanager.server.service.ModerationMenuService;
import dev.sogki.rpmanager.server.service.ModerationService;
import dev.sogki.rpmanager.server.service.RegionProtectionService;
import dev.sogki.rpmanager.server.service.StreakService;
import dev.sogki.rpmanager.server.service.TablistSidebarService;
import dev.sogki.rpmanager.server.service.QuizService;
import dev.sogki.rpmanager.server.service.DiscordStatusService;
import dev.sogki.rpmanager.server.service.SkillTreeMenuService;
import dev.sogki.rpmanager.server.service.SkillTreeService;
import dev.sogki.rpmanager.server.service.TitleMenuService;
import dev.sogki.rpmanager.server.service.TitleService;
import dev.sogki.rpmanager.server.service.TeamId;
import dev.sogki.rpmanager.server.service.TeamMissionService;
import dev.sogki.rpmanager.server.service.TeamScoreboardService;
import dev.sogki.rpmanager.server.service.TeamSelectionMenuService;
import dev.sogki.rpmanager.server.service.TeamService;
import dev.sogki.rpmanager.server.service.WorldEventService;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.MessageDisplay;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.fabric.api.event.player.UseItemCallback;
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
import net.minecraft.command.argument.EntityArgumentType;
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
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Formatting;
import net.minecraft.util.Identifier;
import net.minecraft.util.TypedActionResult;
import net.minecraft.world.World;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

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
  private static final DiscordStatusService DISCORD_STATUS = new DiscordStatusService(LOGGER);
  private static final TeamService TEAM_SERVICE = new TeamService();
  private static final TeamMissionService TEAM_MISSION_SERVICE = new TeamMissionService();
  private static final TeamScoreboardService TEAM_SCOREBOARD_SERVICE = new TeamScoreboardService();
  private static final WorldEventService WORLD_EVENT_SERVICE = new WorldEventService(LOGGER);
  private static final TeamSelectionMenuService TEAM_MENU_SERVICE = new TeamSelectionMenuService();
  private static final SkillTreeService SKILL_TREE_SERVICE = new SkillTreeService();
  private static final SkillTreeMenuService SKILL_TREE_MENU_SERVICE = new SkillTreeMenuService();
  private static final TitleService TITLE_SERVICE = new TitleService();
  private static final TitleMenuService TITLE_MENU_SERVICE = new TitleMenuService();
  private static final ModerationService MODERATION_SERVICE = new ModerationService(LOGGER);
  private static final ModerationMenuService MODERATION_MENU_SERVICE = new ModerationMenuService();

  private static long ticks;

  @Override
  public void onInitialize() {
    ServerFeatureConfig cfg = CONFIG_MANAGER.reload();
    STREAK_SERVICE.load();
    TEAM_SERVICE.load();
    TEAM_MISSION_SERVICE.load();
    TEAM_SCOREBOARD_SERVICE.load();
    SKILL_TREE_SERVICE.load();
    WORLD_EVENT_SERVICE.load();
    TITLE_SERVICE.load();
    MODERATION_SERVICE.load();
    TABLIST_SERVICE.setServices(TEAM_SERVICE, TITLE_SERVICE);
    TemplateEngine.setPlaceholderProvider((server, player) -> buildTeamPlaceholders(server, player, CONFIG_MANAGER.get()));
    COBBLEMON_ANNOUNCEMENTS.setConfigSupplier(CONFIG_MANAGER::get);
    COBBLEMON_ANNOUNCEMENTS.setCatchRateMultiplierSupplier(WORLD_EVENT_SERVICE::catchRateMultiplier);
    LOGGER.info("[SogkiCobblemon] Loaded.");

    registerLifecycle();
    registerCommands();
    registerGameplayHooks();
    registerFormattingHooks();
  }

  private void registerLifecycle() {
    ServerLifecycleEvents.SERVER_STARTED.register(server -> {
      ServerFeatureConfig cfg = CONFIG_MANAGER.reload();
      STREAK_SERVICE.load();
      TEAM_SERVICE.load();
      TEAM_MISSION_SERVICE.load();
      TEAM_SCOREBOARD_SERVICE.load();
      SKILL_TREE_SERVICE.load();
      WORLD_EVENT_SERVICE.load();
      TITLE_SERVICE.load();
      MODERATION_SERVICE.load();
      TABLIST_SERVICE.setServices(TEAM_SERVICE, TITLE_SERVICE);
      COBBLEMON_ANNOUNCEMENTS.tryRegisterCobblemonHooks(SKILL_TREE_SERVICE, TITLE_SERVICE);
      DISCORD_STATUS.startBotRuntime(server, cfg);
      DISCORD_STATUS.announceOnline(server, cfg);
      TemplateEngine.setPlaceholderProvider((currentServer, player) -> buildTeamPlaceholders(currentServer, player, CONFIG_MANAGER.get()));
      COBBLEMON_ANNOUNCEMENTS.setConfigSupplier(CONFIG_MANAGER::get);
      COBBLEMON_ANNOUNCEMENTS.setCatchRateMultiplierSupplier(WORLD_EVENT_SERVICE::catchRateMultiplier);
      LOGGER.info("[SogkiCobblemon] Server started.");
    });

    ServerLifecycleEvents.SERVER_STOPPING.register(server -> {
      STREAK_SERVICE.save();
      TEAM_SERVICE.save();
      TEAM_MISSION_SERVICE.save();
      TEAM_SCOREBOARD_SERVICE.save();
      SKILL_TREE_SERVICE.save();
      WORLD_EVENT_SERVICE.save();
      TITLE_SERVICE.save();
      MODERATION_SERVICE.save();
      DISCORD_STATUS.announceOffline(server, CONFIG_MANAGER.get());
      DISCORD_STATUS.stopBotRuntime();
    });

    ServerTickEvents.END_SERVER_TICK.register(server -> {
      ticks++;
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      AREA_SERVICE.tick(server, cfg, ticks);
      TABLIST_SERVICE.tick(server, cfg, ticks);
      QUIZ_SERVICE.tick(server, cfg, ticks);
      TEAM_SERVICE.tickApplyBuffs(server, cfg, ticks);
      TEAM_MISSION_SERVICE.tick(server, cfg, TEAM_SERVICE, SKILL_TREE_SERVICE, ticks);
      TEAM_SCOREBOARD_SERVICE.tick(server, cfg, TEAM_SERVICE, TEAM_MISSION_SERVICE, ticks);
      SKILL_TREE_SERVICE.tick(server, ticks);
      WORLD_EVENT_SERVICE.tick(server, cfg, ticks, SKILL_TREE_SERVICE, DISCORD_STATUS);
      MODERATION_SERVICE.tickCleanup(ticks);
      enforceMobSpawnRules(server, cfg);
      enforceExplosiveRegionSafety(server, cfg);
      suppressVillagerZombiePanic(server, cfg);
      enforceNpcPersistence(server);
    });

    ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
      MODERATION_SERVICE.noteSeenPlayer(handler.player);
      MODERATION_SERVICE.enforceBanOnJoin(handler.player);
      ServerFeatureConfig cfg = CONFIG_MANAGER.get();
      STREAK_SERVICE.onJoin(handler.player, cfg);
      TEAM_SERVICE.onJoin(handler.player, cfg);
      COBBLEMON_ANNOUNCEMENTS.tryRegisterCobblemonHooks(SKILL_TREE_SERVICE, TITLE_SERVICE);
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
    PlayerBlockBreakEvents.AFTER.register((world, player, pos, state, blockEntity) -> {
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity sp)) {
        return;
      }
      WORLD_EVENT_SERVICE.onBlockBroken(sp, state, SKILL_TREE_SERVICE);
      if (isOreBlock(state)) {
        SKILL_TREE_SERVICE.onMiningOreBreak(sp);
        TITLE_SERVICE.onMiningAction(sp);
      }
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

    ServerLivingEntityEvents.AFTER_DEATH.register((entity, damageSource) -> {
      if (entity == null || damageSource == null) return;
      var attacker = damageSource.getAttacker();
      if (attacker instanceof net.minecraft.server.network.ServerPlayerEntity sp) {
        SKILL_TREE_SERVICE.onMobKill(sp);
        TITLE_SERVICE.onMobKillAction(sp);
      }
    });

    UseItemCallback.EVENT.register((player, world, hand) -> {
      if (world.isClient()) return TypedActionResult.pass(player.getStackInHand(hand));
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity sp)) {
        return TypedActionResult.pass(player.getStackInHand(hand));
      }
      var stack = sp.getStackInHand(hand);
      boolean redeemed = TITLE_SERVICE.tryRedeemItem(sp, stack);
      if (!redeemed) return TypedActionResult.pass(stack);
      return TypedActionResult.success(stack);
    });

  }

  private void enforceMobSpawnRules(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (!cfg.regions.enabled && (cfg.cobbletown == null || !cfg.cobbletown.enabled)) return;
    if (server == null || server.getPlayerManager().getPlayerList().isEmpty()) return;
    if (ticks % 40 != 0) return;
    for (var world : server.getWorlds()) {
      if (world == null || world.getPlayers().isEmpty()) continue;
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
        } catch (Throwable t) {
          // Defensive guard: skip entities that become invalid mid-iteration.
          LOGGER.debug("[SogkiCobblemon] Mob spawn guard skipped invalid entity: {}", t.getMessage());
        }
      }
      for (var entity : toDiscard) {
        try {
          if (entity != null && entity.isAlive()) {
            entity.discard();
          }
        } catch (Throwable t) {
          LOGGER.debug("[SogkiCobblemon] Mob spawn guard discard failed: {}", t.getMessage());
        }
      }
    }
  }

  private void suppressVillagerZombiePanic(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (cfg == null || cfg.regions == null || !cfg.regions.villagersIgnoreZombieFear) return;
    if (server == null || server.getPlayerManager().getPlayerList().isEmpty()) return;
    if (ticks % 20 != 0) return;
    for (var world : server.getWorlds()) {
      if (world == null || world.getPlayers().isEmpty()) continue;
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
        } catch (Throwable t) {
          // Best-effort guard for API variance.
          LOGGER.debug("[SogkiCobblemon] Villager panic suppression failed: {}", t.getMessage());
        }
      }
    }
  }

  private void enforceExplosiveRegionSafety(net.minecraft.server.MinecraftServer server, ServerFeatureConfig cfg) {
    if (!cfg.regions.enabled && (cfg.cobbletown == null || !cfg.cobbletown.enabled)) return;
    if (server == null || server.getPlayerManager().getPlayerList().isEmpty()) return;
    if (ticks % 10 != 0) return;
    for (var world : server.getWorlds()) {
      if (world == null || world.getPlayers().isEmpty()) continue;
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
        } catch (Throwable t) {
          LOGGER.debug("[SogkiCobblemon] Explosive safety scan skipped entity: {}", t.getMessage());
        }
      }
      for (var entity : toDiscard) {
        try {
          if (entity != null && entity.isAlive()) entity.discard();
        } catch (Throwable t) {
          LOGGER.debug("[SogkiCobblemon] Explosive safety discard failed: {}", t.getMessage());
        }
      }
    }
  }

  private void enforceNpcPersistence(net.minecraft.server.MinecraftServer server) {
    if (server == null || server.getPlayerManager().getPlayerList().isEmpty()) return;
    if (ticks % 40 != 0) return;
    for (var world : server.getWorlds()) {
      if (world == null || world.getPlayers().isEmpty()) continue;
      for (var entity : world.iterateEntities()) {
        if (!(entity instanceof MobEntity mob)) continue;
        if (!isCobbletownEntity(entity)) continue;
        try {
          mob.setPersistent();
        } catch (Throwable t) {
          // Best effort: keep custom town NPCs from despawning.
          LOGGER.debug("[SogkiCobblemon] NPC persistence set failed: {}", t.getMessage());
        }
      }
    }
  }

  private void registerFormattingHooks() {
    ServerMessageDecoratorEvent.EVENT.register(ServerMessageDecoratorEvent.CONTENT_PHASE, (sender, message) -> {
      if (sender == null || sender.getServer() == null) return message;
      boolean quizWin = QUIZ_SERVICE.onPlayerChat(sender.getServer(), sender, message.getString(), CONFIG_MANAGER.get());
      if (quizWin) {
        TEAM_MISSION_SERVICE.onQuizWin(sender, CONFIG_MANAGER.get(), TEAM_SERVICE, SKILL_TREE_SERVICE);
        SKILL_TREE_SERVICE.onQuizWin(sender);
      }
      return message;
    });
  }

  public static boolean tryOverridePlayerChat(net.minecraft.network.message.SignedMessage signedMessage,
                                              net.minecraft.server.network.ServerPlayerEntity sender) {
    if (sender == null || sender.getServer() == null) return false;
    if (MODERATION_SERVICE.blockMutedChat(sender)) return true;
    ServerFeatureConfig cfg = CONFIG_MANAGER.get();
    if (cfg == null || cfg.chat == null || !cfg.chat.enabled) return false;
    try {
      String raw = signedMessage == null || signedMessage.getContent() == null
        ? ""
        : signedMessage.getContent().getString();
      Text formatted = CHAT_SERVICE.format(sender.getServer(), sender, Text.literal(raw), cfg);
      sender.getServer().getPlayerManager().broadcast(formatted, false);
      return true;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Chat override failed; falling back to vanilla chat broadcast.", e);
      return false;
    }
  }

  private void registerCommands() {
    CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> {
      dispatcher.register(CommandManager.literal("claim")
        .executes(ctx -> runClaim(ctx.getSource())));

      dispatcher.register(CommandManager.literal("claimmenu")
        .executes(ctx -> runClaimMenu(ctx.getSource())));

      dispatcher.register(CommandManager.literal("spawn")
        .executes(ctx -> runSpawn(ctx.getSource())));

      dispatcher.register(CommandManager.literal("team")
        .executes(ctx -> runTeamRoot(ctx.getSource()))
        .then(CommandManager.literal("help")
          .executes(ctx -> runTeamHelp(ctx.getSource())))
        .then(CommandManager.literal("gui")
          .executes(ctx -> runTeamMenu(ctx.getSource())))
        .then(CommandManager.literal("choose")
          .then(CommandManager.argument("name", StringArgumentType.word())
            .executes(ctx -> runTeamChoose(ctx.getSource(), StringArgumentType.getString(ctx, "name")))))
        .then(CommandManager.literal("info")
          .executes(ctx -> runTeamInfo(ctx.getSource())))
        .then(CommandManager.literal("missions")
          .executes(ctx -> runTeamMissions(ctx.getSource())))
        .then(CommandManager.literal("top")
          .executes(ctx -> runTeamTop(ctx.getSource())))
        .then(CommandManager.literal("leave")
          .executes(ctx -> runTeamLeave(ctx.getSource()))));

      dispatcher.register(CommandManager.literal("teams")
        .executes(ctx -> runTeamMenu(ctx.getSource()))
        .then(CommandManager.literal("help")
          .executes(ctx -> runTeamHelp(ctx.getSource())))
        .then(CommandManager.literal("gui")
          .executes(ctx -> runTeamMenu(ctx.getSource())))
        .then(CommandManager.literal("choose")
          .then(CommandManager.argument("name", StringArgumentType.word())
            .executes(ctx -> runTeamChoose(ctx.getSource(), StringArgumentType.getString(ctx, "name")))))
        .then(CommandManager.literal("info")
          .executes(ctx -> runTeamInfo(ctx.getSource())))
        .then(CommandManager.literal("missions")
          .executes(ctx -> runTeamMissions(ctx.getSource())))
        .then(CommandManager.literal("top")
          .executes(ctx -> runTeamTop(ctx.getSource())))
        .then(CommandManager.literal("leave")
          .executes(ctx -> runTeamLeave(ctx.getSource()))));

      dispatcher.register(CommandManager.literal("missions")
        .executes(ctx -> runTeamMissions(ctx.getSource())));

      dispatcher.register(CommandManager.literal("teammissions")
        .executes(ctx -> runTeamMissions(ctx.getSource())));

      dispatcher.register(CommandManager.literal("skills")
        .executes(ctx -> runSkillsMenu(ctx.getSource()))
        .then(CommandManager.literal("status")
          .executes(ctx -> runSkillsStatus(ctx.getSource())))
        .then(CommandManager.literal("tree")
          .executes(ctx -> runSkillsTree(ctx.getSource())))
        .then(CommandManager.literal("unlock")
          .then(CommandManager.argument("nodeId", StringArgumentType.word())
            .executes(ctx -> runSkillsUnlock(ctx.getSource(), StringArgumentType.getString(ctx, "nodeId")))))
        .then(CommandManager.literal("reset")
          .executes(ctx -> runSkillsReset(ctx.getSource()))));

      dispatcher.register(CommandManager.literal("titles")
        .executes(ctx -> runTitlesMenu(ctx.getSource()))
        .then(CommandManager.literal("grant")
          .requires(src -> src.hasPermissionLevel(2))
          .then(CommandManager.argument("player", EntityArgumentType.player())
            .then(CommandManager.argument("titleId", StringArgumentType.word())
              .suggests((ctx, builder) -> {
                for (TitleService.TitleDefinition title : TITLE_SERVICE.titles()) {
                  if (title == null) continue;
                  String id = title.id == null ? "" : title.id.trim();
                  if (!id.isBlank()) builder.suggest(id);
                }
                return builder.buildFuture();
              })
              .executes(ctx -> runTitlesGrant(
                ctx.getSource(),
                EntityArgumentType.getPlayer(ctx, "player"),
                StringArgumentType.getString(ctx, "titleId")
              )))))
        .then(CommandManager.literal("grantall")
          .requires(src -> src.hasPermissionLevel(2))
          .then(CommandManager.argument("player", EntityArgumentType.player())
            .executes(ctx -> runTitlesGrantAll(
              ctx.getSource(),
              EntityArgumentType.getPlayer(ctx, "player")
            )))));

      dispatcher.register(CommandManager.literal("punish")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests((ctx, builder) -> {
            String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
            for (var player : ctx.getSource().getServer().getPlayerManager().getPlayerList()) {
              String name = player.getGameProfile().getName();
              if (name != null && name.toLowerCase(Locale.ROOT).startsWith(remain)) {
                builder.suggest(name);
              }
            }
            for (String known : MODERATION_SERVICE.knownNames()) {
              if (known.toLowerCase(Locale.ROOT).startsWith(remain)) {
                builder.suggest(known);
              }
            }
            return builder.buildFuture();
          })
          .executes(ctx -> runPunishOpen(ctx.getSource(), StringArgumentType.getString(ctx, "user")))));

      dispatcher.register(CommandManager.literal("history")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests((ctx, builder) -> {
            String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
            for (var player : ctx.getSource().getServer().getPlayerManager().getPlayerList()) {
              String name = player.getGameProfile().getName();
              if (name != null && name.toLowerCase(Locale.ROOT).startsWith(remain)) {
                builder.suggest(name);
              }
            }
            for (String known : MODERATION_SERVICE.knownNames()) {
              if (known.toLowerCase(Locale.ROOT).startsWith(remain)) {
                builder.suggest(known);
              }
            }
            return builder.buildFuture();
          })
          .executes(ctx -> runHistoryOpen(ctx.getSource(), StringArgumentType.getString(ctx, "user")))));

      dispatcher.register(CommandManager.literal("warn")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests(SogkiCobblemonServerMod::suggestModerationUsers)
          .then(CommandManager.argument("reason", StringArgumentType.greedyString())
            .suggests((ctx, builder) ->
              suggestTextOptions(builder, MODERATION_SERVICE.reasonsFor(ModerationService.PunishmentType.WARNING)))
            .executes(ctx -> runWarnAlias(
              ctx.getSource(),
              StringArgumentType.getString(ctx, "user"),
              StringArgumentType.getString(ctx, "reason")
            )))));

      dispatcher.register(CommandManager.literal("mute")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests(SogkiCobblemonServerMod::suggestModerationUsers)
          .then(CommandManager.argument("length", StringArgumentType.word())
            .suggests((ctx, builder) -> {
              for (String each : List.of("2h", "1d", "4d", "7d")) builder.suggest(each);
              return builder.buildFuture();
            })
            .then(CommandManager.argument("reason", StringArgumentType.greedyString())
              .suggests((ctx, builder) ->
                suggestTextOptions(builder, MODERATION_SERVICE.reasonsFor(ModerationService.PunishmentType.MUTE)))
              .executes(ctx -> runMuteAlias(
                ctx.getSource(),
                StringArgumentType.getString(ctx, "user"),
                StringArgumentType.getString(ctx, "length"),
                StringArgumentType.getString(ctx, "reason")
              ))))));

      dispatcher.register(CommandManager.literal("ban")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests(SogkiCobblemonServerMod::suggestModerationUsers)
          .then(CommandManager.argument("length", StringArgumentType.word())
            .suggests((ctx, builder) -> {
              for (String each : List.of("2h", "1d", "4d", "7d", "perm")) builder.suggest(each);
              return builder.buildFuture();
            })
            .then(CommandManager.argument("reason", StringArgumentType.greedyString())
              .suggests((ctx, builder) ->
                suggestTextOptions(builder, MODERATION_SERVICE.reasonsFor(ModerationService.PunishmentType.BAN)))
              .executes(ctx -> runBanAlias(
                ctx.getSource(),
                StringArgumentType.getString(ctx, "user"),
                StringArgumentType.getString(ctx, "length"),
                StringArgumentType.getString(ctx, "reason")
              ))))));

      dispatcher.register(CommandManager.literal("unban")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests(SogkiCobblemonServerMod::suggestModerationUsers)
          .executes(ctx -> runUnbanAlias(ctx.getSource(), StringArgumentType.getString(ctx, "user"), "Manual unban"))
          .then(CommandManager.argument("reason", StringArgumentType.greedyString())
            .suggests((ctx, builder) ->
              suggestTextOptions(builder, List.of("Appeal accepted", "Issued in error", "Ban expired")))
            .executes(ctx -> runUnbanAlias(
              ctx.getSource(),
              StringArgumentType.getString(ctx, "user"),
              StringArgumentType.getString(ctx, "reason")
            )))));

      dispatcher.register(CommandManager.literal("unmute")
        .requires(SogkiCobblemonServerMod::hasModerationAccess)
        .then(CommandManager.argument("user", StringArgumentType.word())
          .suggests(SogkiCobblemonServerMod::suggestModerationUsers)
          .executes(ctx -> runUnmuteAlias(ctx.getSource(), StringArgumentType.getString(ctx, "user"), "Manual unmute"))
          .then(CommandManager.argument("reason", StringArgumentType.greedyString())
            .suggests((ctx, builder) ->
              suggestTextOptions(builder, List.of("Mute expired", "Issued in error", "Staff discretion")))
            .executes(ctx -> runUnmuteAlias(
              ctx.getSource(),
              StringArgumentType.getString(ctx, "user"),
              StringArgumentType.getString(ctx, "reason")
            )))));

      dispatcher.register(CommandManager.literal("permissions")
        .requires(SogkiCobblemonServerMod::hasPermissionManagementAccess)
        .then(CommandManager.literal("update")
          .then(CommandManager.argument("user", StringArgumentType.word())
            .suggests((ctx, builder) -> {
              String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
              for (var player : ctx.getSource().getServer().getPlayerManager().getPlayerList()) {
                String name = player.getGameProfile().getName();
                if (name != null && name.toLowerCase(Locale.ROOT).startsWith(remain)) {
                  builder.suggest(name);
                }
              }
              for (String known : MODERATION_SERVICE.knownNames()) {
                if (known.toLowerCase(Locale.ROOT).startsWith(remain)) {
                  builder.suggest(known);
                }
              }
              return builder.buildFuture();
            })
            .then(CommandManager.argument("role", StringArgumentType.word())
              .suggests((ctx, builder) -> {
                String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
                for (String role : MODERATION_SERVICE.roleNames()) {
                  if (role.toLowerCase(Locale.ROOT).startsWith(remain)) builder.suggest(role);
                }
                return builder.buildFuture();
              })
              .executes(ctx -> runPermissionsUpdate(
                ctx.getSource(),
                StringArgumentType.getString(ctx, "user"),
                StringArgumentType.getString(ctx, "role")
              )))))
        .then(CommandManager.literal("view")
          .then(CommandManager.argument("user", StringArgumentType.word())
            .suggests((ctx, builder) -> {
              String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
              for (var player : ctx.getSource().getServer().getPlayerManager().getPlayerList()) {
                String name = player.getGameProfile().getName();
                if (name != null && name.toLowerCase(Locale.ROOT).startsWith(remain)) {
                  builder.suggest(name);
                }
              }
              for (String known : MODERATION_SERVICE.knownNames()) {
                if (known.toLowerCase(Locale.ROOT).startsWith(remain)) {
                  builder.suggest(known);
                }
              }
              return builder.buildFuture();
            })
            .executes(ctx -> runPermissionsView(
              ctx.getSource(),
              StringArgumentType.getString(ctx, "user")
            ))))
        .then(CommandManager.literal("roles")
          .executes(ctx -> runPermissionsRoles(ctx.getSource()))));

      dispatcher.register(CommandManager.literal("setspawn")
        .requires(src -> src.hasPermissionLevel(2))
        .executes(ctx -> runSetSpawn(ctx.getSource())));

      var makeradiusCommand = CommandManager.literal("makeradius")
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
              )))));

      var teamScoreboardCommand = CommandManager.literal("scoreboard")
        .then(CommandManager.literal("team")
          .then(CommandManager.literal("help")
            .executes(ctx -> runTeamScoreboardAdminHelp(ctx.getSource())))
          .then(CommandManager.literal("setup")
            .executes(ctx -> runTeamScoreboardSetup(ctx.getSource())))
          .then(CommandManager.literal("refresh")
            .executes(ctx -> runTeamScoreboardRefresh(ctx.getSource())))
          .then(CommandManager.literal("delete")
            .executes(ctx -> runTeamScoreboardDelete(ctx.getSource())))
          .then(CommandManager.literal("reset")
            .then(CommandManager.argument("token", StringArgumentType.word())
              .executes(ctx -> runTeamScoreboardReset(ctx.getSource(), StringArgumentType.getString(ctx, "token"))))));

      var teamScoreboardAliasCommand = CommandManager.literal("teamscoreboard")
        .then(CommandManager.literal("help")
          .executes(ctx -> runTeamScoreboardAdminHelp(ctx.getSource())))
        .then(CommandManager.literal("setup")
          .executes(ctx -> runTeamScoreboardSetup(ctx.getSource())))
        .then(CommandManager.literal("refresh")
          .executes(ctx -> runTeamScoreboardRefresh(ctx.getSource())))
        .then(CommandManager.literal("delete")
          .executes(ctx -> runTeamScoreboardDelete(ctx.getSource())))
        .then(CommandManager.literal("reset")
          .then(CommandManager.argument("token", StringArgumentType.word())
            .executes(ctx -> runTeamScoreboardReset(ctx.getSource(), StringArgumentType.getString(ctx, "token")))));

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
        .then(CommandManager.literal("discord")
          .then(CommandManager.literal("test")
            .executes(ctx -> runDiscordTest(ctx.getSource()))))
        .then(CommandManager.literal("skills")
          .then(CommandManager.literal("grant")
            .then(CommandManager.argument("player", EntityArgumentType.player())
              .then(CommandManager.argument("points", IntegerArgumentType.integer(-999, 999))
                .executes(ctx -> runAdminSkillsGrant(
                  ctx.getSource(),
                  EntityArgumentType.getPlayer(ctx, "player"),
                  IntegerArgumentType.getInteger(ctx, "points")
                )))))
          .then(CommandManager.literal("revoke")
            .then(CommandManager.argument("player", EntityArgumentType.player())
              .then(CommandManager.argument("points", IntegerArgumentType.integer(1, 999))
                .executes(ctx -> runAdminSkillsRevoke(
                  ctx.getSource(),
                  EntityArgumentType.getPlayer(ctx, "player"),
                  IntegerArgumentType.getInteger(ctx, "points")
                ))))))
        .then(CommandManager.literal("events")
          .then(CommandManager.literal("status")
            .executes(ctx -> runAdminEventsStatus(ctx.getSource())))
          .then(CommandManager.literal("list")
            .executes(ctx -> runAdminEventsList(ctx.getSource())))
          .then(CommandManager.literal("start")
            .then(CommandManager.argument("eventId", StringArgumentType.word())
              .suggests((ctx, builder) -> {
                for (String eventId : WORLD_EVENT_SERVICE.eventIds()) {
                  if (eventId != null && !eventId.isBlank()) builder.suggest(eventId);
                }
                return builder.buildFuture();
              })
              .executes(ctx -> runAdminEventsStart(
                ctx.getSource(),
                StringArgumentType.getString(ctx, "eventId")
              ))))
          .then(CommandManager.literal("end")
            .executes(ctx -> runAdminEventsEnd(ctx.getSource()))))
        .then(makeradiusCommand)
        .then(teamScoreboardCommand)
        .then(teamScoreboardAliasCommand)
        .then(CommandManager.literal("team")
          .then(CommandManager.literal("mission")
            .then(CommandManager.literal("reroll")
              .executes(ctx -> runTeamMissionReroll(ctx.getSource())))));

      dispatcher.register(adminCommand);
    });
  }

  private static int runClaim(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      var result = STREAK_SERVICE.claim(player, CONFIG_MANAGER.get());
      if (result.ok()) {
        SKILL_TREE_SERVICE.onDailyClaim(player);
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
    SKILL_TREE_SERVICE.save();
    TITLE_SERVICE.save();
    WORLD_EVENT_SERVICE.load();
    SKILL_TREE_SERVICE.load();
    TITLE_SERVICE.load();
    MODERATION_SERVICE.load();
    TABLIST_SERVICE.setServices(TEAM_SERVICE, TITLE_SERVICE);
    if (source.getServer() != null) {
      DISCORD_STATUS.restartBotRuntime(source.getServer(), cfg);
    }
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

  private static int runTeamRoot(ServerCommandSource source) {
    return runTeamHelp(source);
  }

  private static int runTeamHelp(ServerCommandSource source) {
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamHelpLine, Map.of());
    source.sendFeedback(() -> Text.literal(msg), false);
    return 1;
  }

  private static int runTeamMenu(ServerCommandSource source) {
    ServerFeatureConfig cfg = CONFIG_MANAGER.get();
    if (cfg == null || cfg.messages == null || cfg.teams == null || !cfg.teams.enabled) {
      String template = (cfg != null && cfg.messages != null)
        ? cfg.messages.teamCommandUnavailable
        : "Teams are disabled.";
      String msg = TemplateEngine.render(template, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
    try {
      var player = source.getPlayerOrThrow();
      TEAM_MENU_SERVICE.open(player, cfg, TEAM_SERVICE);
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(cfg.messages.teamPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamChoose(ServerCommandSource source, String teamName) {
    try {
      var player = source.getPlayerOrThrow();
      TeamId team = TeamId.parse(teamName);
      TeamService.CommandResult result = TEAM_SERVICE.chooseTeam(player, CONFIG_MANAGER.get(), team);
      if (result.ok()) {
        source.sendFeedback(() -> Text.literal(result.message()), false);
        return 1;
      }
      source.sendError(Text.literal(result.message()));
      return 0;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamInfo(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      TeamService.CommandResult result = TEAM_SERVICE.status(player, CONFIG_MANAGER.get(), TEAM_MISSION_SERVICE);
      source.sendFeedback(() -> Text.literal(result.message()), false);
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamMissions(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      TeamId team = TEAM_SERVICE.getTeam(player.getUuid());
      if (team == null) {
        String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamPromptChoose, Map.of());
        source.sendError(Text.literal(msg));
        return 0;
      }
      String header = TemplateEngine.render(
        CONFIG_MANAGER.get().messages.teamMissionsHeader,
        Map.of("teamDisplay", TEAM_SERVICE.teamDisplay(CONFIG_MANAGER.get(), team))
      );
      source.sendFeedback(() -> Text.literal(header), false);
      List<TeamMissionService.MissionProgressLine> lines = TEAM_MISSION_SERVICE.missionLines(team, CONFIG_MANAGER.get());
      for (TeamMissionService.MissionProgressLine line : lines) {
        Map<String, String> values = new java.util.HashMap<>();
        values.put("mission", line.mission());
        values.put("current", String.valueOf(line.current()));
        values.put("target", String.valueOf(line.target()));
        values.put("period", line.period());
        String rendered = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamMissionLine, values);
        source.sendFeedback(() -> Text.literal(rendered), false);
      }
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamTop(ServerCommandSource source) {
    String header = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamTopHeader, Map.of());
    source.sendFeedback(() -> Text.literal(header), false);
    List<TeamMissionService.TeamStanding> standings = TEAM_MISSION_SERVICE.standings(CONFIG_MANAGER.get(), TEAM_SERVICE);
    int rank = 1;
    for (TeamMissionService.TeamStanding standing : standings) {
      Map<String, String> values = new java.util.HashMap<>();
      values.put("rank", String.valueOf(rank++));
      values.put("team", standing.team().id());
      values.put("teamDisplay", TEAM_SERVICE.teamDisplay(CONFIG_MANAGER.get(), standing.team()));
      values.put("teamPoints", String.valueOf(standing.points()));
      values.put("teamTotalCatches", String.valueOf(standing.catches()));
      values.put("teamTotalQuizzes", String.valueOf(standing.quizzes()));
      values.put("teamMissionsCompleted", String.valueOf(standing.missionsCompleted()));
      String line = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamTopLine, values);
      source.sendFeedback(() -> Text.literal(line), false);
    }
    return 1;
  }

  private static int runTeamLeave(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      TeamService.CommandResult result = TEAM_SERVICE.leave(player, CONFIG_MANAGER.get());
      if (result.ok()) {
        source.sendFeedback(() -> Text.literal(result.message()), false);
        return 1;
      }
      source.sendError(Text.literal(result.message()));
      return 0;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamPlayerOnly, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamScoreboardSetup(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      TEAM_SCOREBOARD_SERVICE.setupAtPlayer(source.getServer(), player, CONFIG_MANAGER.get());
      TEAM_SCOREBOARD_SERVICE.refresh(source.getServer(), CONFIG_MANAGER.get(), TEAM_SERVICE, TEAM_MISSION_SERVICE);
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardSetupSuccess, Map.of());
      source.sendFeedback(() -> Text.literal(msg), true);
      return 1;
    } catch (Exception e) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardPlayerOnlySetup, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
  }

  private static int runTeamScoreboardRefresh(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    TEAM_SCOREBOARD_SERVICE.refresh(source.getServer(), CONFIG_MANAGER.get(), TEAM_SERVICE, TEAM_MISSION_SERVICE);
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardRefreshSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runTeamScoreboardDelete(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    TEAM_SCOREBOARD_SERVICE.deleteScoreboard(source.getServer(), CONFIG_MANAGER.get());
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardClearSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runTeamScoreboardReset(ServerCommandSource source, String token) {
    if (!"CONFIRM".equalsIgnoreCase(token)) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardResetConfirm, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
    if (source.getServer() == null) return 0;
    TEAM_MISSION_SERVICE.resetAll();
    TEAM_SCOREBOARD_SERVICE.refresh(source.getServer(), CONFIG_MANAGER.get(), TEAM_SERVICE, TEAM_MISSION_SERVICE);
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardResetSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runTeamMissionReroll(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    TEAM_MISSION_SERVICE.resetAll();
    TEAM_SCOREBOARD_SERVICE.refresh(source.getServer(), CONFIG_MANAGER.get(), TEAM_SERVICE, TEAM_MISSION_SERVICE);
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamMissionRerollSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runTeamScoreboardAdminHelp(ServerCommandSource source) {
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.teamScoreboardAdminHelp, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static int runSkillsStatus(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      int points = SKILL_TREE_SERVICE.points(player.getUuid());
      List<String> unlocked = SKILL_TREE_SERVICE.unlocked(player.getUuid());
      source.sendFeedback(() -> Text.literal(TemplateEngine.render("&bSkills &7| Points: &f" + points, Map.of())), false);
      if (unlocked.isEmpty()) {
        source.sendFeedback(() -> Text.literal(TemplateEngine.render("&8No skills unlocked yet. Use /skills tree", Map.of())), false);
      } else {
        source.sendFeedback(() -> Text.literal(TemplateEngine.render("&7Unlocked: &f" + String.join(", ", unlocked), Map.of())), false);
      }
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runSkillsMenu(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      SKILL_TREE_MENU_SERVICE.open(player, SKILL_TREE_SERVICE);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runSkillsTree(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      for (String line : SKILL_TREE_SERVICE.treeLines(player.getUuid())) {
        source.sendFeedback(() -> Text.literal(TemplateEngine.render(line, Map.of())), false);
      }
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runSkillsUnlock(ServerCommandSource source, String nodeId) {
    try {
      var player = source.getPlayerOrThrow();
      SkillTreeService.CommandResult result = SKILL_TREE_SERVICE.unlock(player, nodeId);
      if (result.ok()) {
        source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), false);
        return 1;
      }
      source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
      return 0;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runSkillsReset(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      SkillTreeService.CommandResult result = SKILL_TREE_SERVICE.reset(player.getUuid());
      if (result.ok()) {
        source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), false);
        return 1;
      }
      source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
      return 0;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runTitlesMenu(ServerCommandSource source) {
    try {
      var player = source.getPlayerOrThrow();
      TITLE_MENU_SERVICE.open(player, TITLE_SERVICE, TEAM_SERVICE, 1);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command is player-only."));
      return 0;
    }
  }

  private static int runPunishOpen(ServerCommandSource source, String user) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      MODERATION_MENU_SERVICE.openPunishMenu(staff, MODERATION_SERVICE, maybeTarget.get());
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runHistoryOpen(ServerCommandSource source, String user) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      MODERATION_MENU_SERVICE.openHistory(staff, MODERATION_SERVICE, maybeTarget.get(), 1);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runWarnAlias(ServerCommandSource source, String user, String reason) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      var target = maybeTarget.get();
      var result = MODERATION_SERVICE.warnWithNotifications(target, staff, reason);
      if (!result.ok()) {
        source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        return 0;
      }
      source.sendFeedback(() -> Text.literal(result.message()), true);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runMuteAlias(ServerCommandSource source, String user, String length, String reason) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      Duration duration = parseDurationToken(length);
      if (duration == null) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.invalidMuteLengthMessage(), Map.of())));
        return 0;
      }
      var target = maybeTarget.get();
      var result = MODERATION_SERVICE.muteWithNotifications(target, staff, duration, reason);
      if (!result.ok()) {
        source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        return 0;
      }
      source.sendFeedback(() -> Text.literal(result.message()), true);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runBanAlias(ServerCommandSource source, String user, String length, String reason) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      Duration duration = parseDurationToken(length);
      boolean permanent = isPermanentToken(length);
      if (duration == null && !permanent) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.invalidBanLengthMessage(), Map.of())));
        return 0;
      }
      var target = maybeTarget.get();
      var result = MODERATION_SERVICE.banWithNotifications(target, staff, permanent ? null : duration, reason);
      if (!result.ok()) {
        source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        return 0;
      }
      source.sendFeedback(() -> Text.literal(result.message()), true);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runUnbanAlias(ServerCommandSource source, String user, String reason) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      var result = MODERATION_SERVICE.unban(maybeTarget.get(), staff, reason);
      if (!result.ok()) {
        source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        return 0;
      }
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), true);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runUnmuteAlias(ServerCommandSource source, String user, String reason) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canModerate(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      var result = MODERATION_SERVICE.unmute(maybeTarget.get(), staff, reason);
      if (!result.ok()) {
        source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        return 0;
      }
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), true);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static boolean isPermanentToken(String raw) {
    String token = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    return token.equals("perm") || token.equals("permanent");
  }

  private static Duration parseDurationToken(String raw) {
    String token = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    if (token.isBlank()) return null;
    if (isPermanentToken(token)) return null;
    try {
      if (token.endsWith("h")) {
        long n = Long.parseLong(token.substring(0, token.length() - 1));
        return n <= 0 ? null : Duration.ofHours(n);
      }
      if (token.endsWith("d")) {
        long n = Long.parseLong(token.substring(0, token.length() - 1));
        return n <= 0 ? null : Duration.ofDays(n);
      }
    } catch (Exception ignored) {
      return null;
    }
    return null;
  }

  private static int runPermissionsUpdate(ServerCommandSource source, String user, String role) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canManagePermissions(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      var target = maybeTarget.get();
      String normalized = MODERATION_SERVICE.normalizeRole(role);
      if (normalized.isBlank()) {
        source.sendError(Text.literal(TemplateEngine.render(
          MODERATION_SERVICE.invalidRoleMessage(MODERATION_SERVICE.roleNames()),
          Map.of()
        )));
        return 0;
      }
      boolean ok = MODERATION_SERVICE.setRole(target.uuid(), normalized);
      if (!ok) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.roleUpdateFailedMessage(), Map.of())));
        return 0;
      }
      String msg = MODERATION_SERVICE.roleUpdatedMessage(target.name(), normalized);
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(msg, Map.of())), true);
      var online = source.getServer() == null ? null : source.getServer().getPlayerManager().getPlayer(target.uuid());
      if (online != null) {
        online.sendMessage(Text.literal(TemplateEngine.render(
          MODERATION_SERVICE.roleUpdatedTargetMessage(normalized),
          Map.of()
        )), false);
      }
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runPermissionsView(ServerCommandSource source, String user) {
    try {
      var staff = source.getPlayerOrThrow();
      if (!MODERATION_SERVICE.canManagePermissions(staff)) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.noPermissionMessage(), Map.of())));
        return 0;
      }
      var maybeTarget = MODERATION_SERVICE.resolveTarget(source.getServer(), user);
      if (maybeTarget.isEmpty()) {
        source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.unknownPlayerMessage(), Map.of())));
        return 0;
      }
      var target = maybeTarget.get();
      String role = MODERATION_SERVICE.roleOf(target.uuid());
      String msg = MODERATION_SERVICE.roleViewMessage(target.name(), role);
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(msg, Map.of())), false);
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal(TemplateEngine.render(MODERATION_SERVICE.commandPlayerOnlyMessage(), Map.of())));
      return 0;
    }
  }

  private static int runPermissionsRoles(ServerCommandSource source) {
    String msg = "&bRoles: &f" + String.join(", ", MODERATION_SERVICE.roleNames());
    source.sendFeedback(() -> Text.literal(TemplateEngine.render(msg, Map.of())), false);
    return 1;
  }

  private static int runTitlesGrant(ServerCommandSource source,
                                    net.minecraft.server.network.ServerPlayerEntity target,
                                    String titleId) {
    TitleService.CommandResult result = TITLE_SERVICE.grant(target.getUuid(), titleId);
    if (!result.ok()) {
      source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
      return 0;
    }
    String adminMsg = TemplateEngine.render(result.message(), Map.of(
      "player", target.getName().getString()
    ));
    source.sendFeedback(() -> Text.literal(adminMsg), true);
    String playerMsg = TITLE_SERVICE.playerGrantMessage(titleId);
    target.sendMessage(Text.literal(playerMsg), false);
    return 1;
  }

  private static int runTitlesGrantAll(ServerCommandSource source,
                                       net.minecraft.server.network.ServerPlayerEntity target) {
    TitleService.CommandResult result = TITLE_SERVICE.grantAll(target.getUuid());
    if (!result.ok()) {
      source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
      return 0;
    }
    String adminMsg = TemplateEngine.render(result.message(), Map.of(
      "player", target.getName().getString()
    ));
    source.sendFeedback(() -> Text.literal(TemplateEngine.render(
      adminMsg + " &7(" + target.getName().getString() + ")",
      Map.of()
    )), true);
    target.sendMessage(Text.literal(TemplateEngine.render(
      "&aAn admin granted you access to all titles.",
      Map.of()
    )), false);
    return 1;
  }

  private static int runAdminSkillsGrant(ServerCommandSource source,
                                         net.minecraft.server.network.ServerPlayerEntity target,
                                         int points) {
    SkillTreeService.CommandResult result = SKILL_TREE_SERVICE.grantPoints(target.getUuid(), points);
    if (result.ok()) {
      source.sendFeedback(() -> Text.literal("Updated " + target.getName().getString() + ": " + TemplateEngine.render(result.message(), Map.of())), true);
      target.sendMessage(Text.literal("Skill points updated by admin. New total: " + SKILL_TREE_SERVICE.points(target.getUuid())));
      return 1;
    }
    source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
    return 0;
  }

  private static int runAdminSkillsRevoke(ServerCommandSource source,
                                          net.minecraft.server.network.ServerPlayerEntity target,
                                          int points) {
    int revokeAmount = Math.max(1, points);
    SkillTreeService.CommandResult result = SKILL_TREE_SERVICE.grantPoints(target.getUuid(), -revokeAmount);
    if (result.ok()) {
      source.sendFeedback(() -> Text.literal("Revoked " + revokeAmount + " skill point(s) from "
        + target.getName().getString() + ". " + TemplateEngine.render(result.message(), Map.of())), true);
      target.sendMessage(Text.literal("Skill points revoked by admin. New total: " + SKILL_TREE_SERVICE.points(target.getUuid())));
      return 1;
    }
    source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
    return 0;
  }

  private static int runAdminEventsStatus(ServerCommandSource source) {
    WorldEventService.EventStatus status = WORLD_EVENT_SERVICE.status();
    String mode = status.forced() ? "forced (" + status.forcedEventId() + ")" : status.mode();
    String start = status.activeStartUtc().isBlank() ? "n/a" : status.activeStartUtc();
    String end = status.activeEndUtc().isBlank() ? "n/a" : status.activeEndUtc();
    String next = status.nextScheduledStartUtc().isBlank() ? "n/a" : status.nextScheduledStartUtc();
    source.sendFeedback(() -> Text.literal(TemplateEngine.render(
      "&7Event mode: &f" + mode
        + " &8| &7Active: &f" + status.activeEventId()
        + " &8| &7Start: &f" + start
        + " &8| &7End: &f" + end
        + " &8| &7Next: &f" + next,
      Map.of()
    )), true);
    return 1;
  }

  private static int runAdminEventsList(ServerCommandSource source) {
    List<String> ids = WORLD_EVENT_SERVICE.eventIds();
    if (ids.isEmpty()) {
      source.sendError(Text.literal("No world events are configured."));
      return 0;
    }
    source.sendFeedback(() -> Text.literal(TemplateEngine.render(
      "&7Configured events: &f" + String.join(", ", ids),
      Map.of()
    )), true);
    return 1;
  }

  private static int runAdminEventsStart(ServerCommandSource source, String eventId) {
    WorldEventService.CommandResult result = WORLD_EVENT_SERVICE.forceStart(eventId);
    if (result.ok()) {
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), true);
      return 1;
    }
    source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
    return 0;
  }

  private static int runAdminEventsEnd(ServerCommandSource source) {
    WorldEventService.CommandResult result = WORLD_EVENT_SERVICE.forceEnd();
    if (result.ok()) {
      source.sendFeedback(() -> Text.literal(TemplateEngine.render(result.message(), Map.of())), true);
      return 1;
    }
    source.sendError(Text.literal(TemplateEngine.render(result.message(), Map.of())));
    return 0;
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
      source.sendFeedback(() -> Text.literal("Region radius snippet generated. Click the message below to copy it."), false);
      source.sendFeedback(() -> copyableSnippetText(snippet), false);
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
      source.sendFeedback(() -> Text.literal("Cobbletown radius snippet generated. Click the message below to copy it."), false);
      source.sendFeedback(() -> copyableSnippetText(snippet), false);
      LOGGER.info("[SogkiCobblemon] makeRadius town {} -> {}", townId, snippet.replace('\n', ' '));
      return 1;
    } catch (Exception e) {
      source.sendError(Text.literal("This command must be run by an in-game operator."));
      return 0;
    }
  }

  private static Text copyableSnippetText(String snippet) {
    String safeSnippet = snippet == null ? "{}" : snippet;
    return Text.literal(safeSnippet)
      .styled(style -> style
        .withColor(Formatting.AQUA)
        .withUnderline(true)
        .withClickEvent(new ClickEvent(ClickEvent.Action.COPY_TO_CLIPBOARD, safeSnippet))
        .withHoverEvent(new HoverEvent(
          HoverEvent.Action.SHOW_TEXT,
          Text.literal("Click to copy this JSON snippet to clipboard")
        )));
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

  private static int runDiscordTest(ServerCommandSource source) {
    if (source.getServer() == null) return 0;
    boolean ok = DISCORD_STATUS.sendTest(source.getServer(), CONFIG_MANAGER.get());
    if (!ok) {
      String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.discordAdminTestFailed, Map.of());
      source.sendError(Text.literal(msg));
      return 0;
    }
    String msg = TemplateEngine.render(CONFIG_MANAGER.get().messages.discordAdminTestSuccess, Map.of());
    source.sendFeedback(() -> Text.literal(msg), true);
    return 1;
  }

  private static CompletableFuture<Suggestions> suggestModerationUsers(CommandContext<ServerCommandSource> ctx,
                                                                        SuggestionsBuilder builder) {
    String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
    if (ctx != null && ctx.getSource() != null && ctx.getSource().getServer() != null) {
      for (var player : ctx.getSource().getServer().getPlayerManager().getPlayerList()) {
        String name = player.getGameProfile().getName();
        if (name != null && name.toLowerCase(Locale.ROOT).startsWith(remain)) {
          builder.suggest(name);
        }
      }
    }
    for (String known : MODERATION_SERVICE.knownNames()) {
      if (known.toLowerCase(Locale.ROOT).startsWith(remain)) {
        builder.suggest(known);
      }
    }
    return builder.buildFuture();
  }

  private static CompletableFuture<Suggestions> suggestTextOptions(SuggestionsBuilder builder, List<String> options) {
    if (builder == null) return Suggestions.empty();
    if (options == null || options.isEmpty()) return builder.buildFuture();
    String remain = builder.getRemaining().toLowerCase(Locale.ROOT);
    for (String option : options) {
      if (option == null || option.isBlank()) continue;
      if (option.toLowerCase(Locale.ROOT).startsWith(remain)) {
        builder.suggest(option);
      }
    }
    return builder.buildFuture();
  }

  private static boolean hasModerationAccess(ServerCommandSource source) {
    try {
      if (source == null) return false;
      if (source.hasPermissionLevel(2)) return true;
      var player = source.getPlayer();
      return player != null && MODERATION_SERVICE.canModerate(player);
    } catch (Exception e) {
      return false;
    }
  }

  private static boolean hasPermissionManagementAccess(ServerCommandSource source) {
    try {
      if (source == null) return false;
      if (source.hasPermissionLevel(2)) return true;
      var player = source.getPlayer();
      return player != null && MODERATION_SERVICE.canManagePermissions(player);
    } catch (Exception e) {
      return false;
    }
  }

  private static Map<String, String> buildTeamPlaceholders(net.minecraft.server.MinecraftServer server,
                                                            net.minecraft.server.network.ServerPlayerEntity player,
                                                            ServerFeatureConfig cfg) {
    Map<String, String> out = new java.util.HashMap<>();
    TeamId team = player == null ? null : TEAM_SERVICE.getTeam(player.getUuid());
    String teamId = team == null ? "unassigned" : team.id();
    String teamDisplay = TEAM_SERVICE.teamDisplay(cfg, team);
    int points = TEAM_MISSION_SERVICE.getTeamPoints(team);
    int catches = TEAM_MISSION_SERVICE.getTeamTotalCatches(team);
    int quizzes = TEAM_MISSION_SERVICE.getTeamTotalQuizzes(team);
    int missions = TEAM_MISSION_SERVICE.getTeamMissionsCompleted(team);

    int rank = 0;
    int idx = 1;
    for (TeamMissionService.TeamStanding standing : TEAM_MISSION_SERVICE.standings(cfg, TEAM_SERVICE)) {
      if (standing.team() == team) {
        rank = idx;
        break;
      }
      idx++;
    }

    out.put("team", teamId);
    out.put("teamDisplay", teamDisplay);
    out.put("teamColor", colorForTeam(teamId));
    out.put("teamSortKey", String.valueOf(teamSortOrder(cfg, teamId)));
    out.put("teamTabPrefix", team == null ? "" : "&8[&r" + teamDisplay + "&8] &r");
    out.put("teamPoints", String.valueOf(points));
    out.put("teamRank", String.valueOf(rank));
    out.put("teamTotalCatches", String.valueOf(catches));
    out.put("teamTotalQuizzes", String.valueOf(quizzes));
    out.put("teamMissionsCompleted", String.valueOf(missions));
    out.putAll(COBBLEMON_ANNOUNCEMENTS.placeholderValues(player));

    int skillPoints = player == null ? 0 : SKILL_TREE_SERVICE.points(player.getUuid());
    int unusedSkillPoints = player == null ? 0 : SKILL_TREE_SERVICE.unusedPoints(player.getUuid());
    int skillUnlocked = player == null ? 0 : SKILL_TREE_SERVICE.totalUnlocked(player.getUuid());
    out.put("skillPoints", String.valueOf(skillPoints));
    out.put("unusedSkillPoints", String.valueOf(unusedSkillPoints));
    out.put("skillUnlockedTotal", String.valueOf(skillUnlocked));
    out.put("skillMilestoneStep", String.valueOf(SKILL_TREE_SERVICE.categoryMilestoneStep()));
    double fishBonus = player == null ? 0.0D : SKILL_TREE_SERVICE.perkPercent(player.getUuid(), "fishing_good_loot");
    double catchBonus = player == null ? 0.0D : SKILL_TREE_SERVICE.cobblemonFirstTryCatchBonusPercent(player.getUuid());
    out.put("skillFishingGoodLootBonus", String.valueOf((int) Math.round(fishBonus)));
    out.put("skillCobblemonFirstTryCatchBonus", String.valueOf((int) Math.round(catchBonus)));

    StringBuilder lineSummary = new StringBuilder();
    for (SkillTreeService.SkillCategory category : SKILL_TREE_SERVICE.categories()) {
      if (category == null) continue;
      String categoryId = category.id == null ? "" : category.id.trim().toLowerCase(java.util.Locale.ROOT);
      if (categoryId.isBlank()) continue;
      int unlockedInLine = player == null ? 0 : SKILL_TREE_SERVICE.unlockedInCategory(player.getUuid(), categoryId);
      int nextTier = player == null ? SKILL_TREE_SERVICE.categoryMilestoneStep() : SKILL_TREE_SERVICE.nextCategoryMilestone(player.getUuid(), categoryId);
      String safeId = placeholderSafe(categoryId);
      out.put("skillTier_" + safeId, String.valueOf(unlockedInLine));
      out.put("skillNextTier_" + safeId, String.valueOf(nextTier));
      if (!lineSummary.isEmpty()) lineSummary.append(" &8| ");
      String displayName = category.name == null || category.name.isBlank() ? categoryId : category.name;
      lineSummary.append("&b").append(displayName).append("&7 ").append(unlockedInLine);
    }
    out.put("skillLineSummary", lineSummary.toString());
    out.putAll(TITLE_SERVICE.placeholders(
      player == null ? null : player.getUuid(),
      teamId,
      out
    ));
    return out;
  }

  private static String placeholderSafe(String raw) {
    if (raw == null || raw.isBlank()) return "line";
    return raw.trim().toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", "_");
  }

  private static String colorForTeam(String teamId) {
    if (teamId == null) return "gray";
    return switch (teamId.toLowerCase(java.util.Locale.ROOT)) {
      case "valor" -> "red";
      case "mystic" -> "blue";
      case "instinct" -> "yellow";
      default -> "gray";
    };
  }

  private static int teamSortOrder(ServerFeatureConfig cfg, String teamIdRaw) {
    String teamId = teamIdRaw == null ? "" : teamIdRaw.trim().toLowerCase(java.util.Locale.ROOT);
    if (cfg == null || cfg.teams == null || cfg.teams.list == null || cfg.teams.list.isEmpty()) return 99;
    int idx = 0;
    for (ServerFeatureConfig.TeamDefinition def : cfg.teams.list) {
      if (def == null) continue;
      String id = def.id == null ? "" : def.id.trim().toLowerCase(java.util.Locale.ROOT);
      if (id.equals(teamId)) return idx;
      idx++;
    }
    return 99;
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

  private static boolean isOreBlock(BlockState state) {
    if (state == null || state.isAir()) return false;
    Identifier id = Registries.BLOCK.getId(state.getBlock());
    if (id == null) return false;
    String path = id.getPath();
    if (path == null || path.isBlank()) return false;
    String normalized = path.toLowerCase(Locale.ROOT);
    return normalized.contains("_ore")
      || normalized.endsWith("ore")
      || normalized.contains("ore");
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
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load spawn.json: {}", e.getMessage());
      return null;
    }
  }

  private static boolean saveSpawn(SpawnPoint spawn) {
    try {
      FileWriteUtil.writeJsonAtomic(SPAWN_PATH, GSON, spawn);
      return true;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save spawn.json: {}", e.getMessage());
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
