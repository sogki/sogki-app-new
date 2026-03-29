package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TeamService {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Type ROOT_TYPE = new TypeToken<Map<String, PlayerTeamState>>() { }.getType();
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("team-player-data.json");
  private static final Path LEGACY_STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("teams.json");

  private final Map<String, PlayerTeamState> data = new HashMap<>();

  public void load() {
    try {
      if (Files.exists(STORE_PATH)) {
        String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
        Map<String, PlayerTeamState> parsed = GSON.fromJson(raw, ROOT_TYPE);
        if (parsed != null) {
          data.clear();
          data.putAll(parsed);
        }
        return;
      }

      // One-time migration from the old path that accidentally overlapped with config.
      if (Files.exists(LEGACY_STORE_PATH)) {
        String legacyRaw = Files.readString(LEGACY_STORE_PATH, StandardCharsets.UTF_8);
        Map<String, PlayerTeamState> parsedLegacy = GSON.fromJson(legacyRaw, ROOT_TYPE);
        if (parsedLegacy != null && !parsedLegacy.isEmpty() && looksLikePlayerStateMap(parsedLegacy)) {
          data.clear();
          data.putAll(parsedLegacy);
          save();
          try {
            Path migrated = LEGACY_STORE_PATH.resolveSibling("team-player-data.migrated.json");
            Files.move(LEGACY_STORE_PATH, migrated);
          } catch (Exception e) {
            LOGGER.warn("[SogkiCobblemon] Failed to archive legacy teams.json after migration: {}", e.getMessage());
          }
        }
      }
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load team player data: {}", e.getMessage());
    }
  }

  public void save() {
    try {
      FileWriteUtil.writeStringAtomic(STORE_PATH, GSON.toJson(data, ROOT_TYPE));
    } catch (IOException e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save team player data: {}", e.getMessage());
    }
  }

  public void onJoin(ServerPlayerEntity player, ServerFeatureConfig cfg) {
    if (player == null || cfg == null || cfg.teams == null || !cfg.teams.enabled) return;
    PlayerTeamState state = getOrCreate(player.getUuid());
    state.lastKnownName = safe(player.getGameProfile().getName());
    TeamId team = resolveTeam(player);
    if (team == null) {
      if (cfg.teams.requireSelectionOnJoin) {
        String msg = TemplateEngine.render(cfg.messages.teamPromptChoose, Map.of());
        player.sendMessage(Text.literal(msg));
      }
      return;
    }
    applyConfiguredBuffs(player, cfg, team);
    ClaimResult daily = grantDailyRewardIfEligible(player, cfg);
    if (daily.granted) {
      player.sendMessage(Text.literal(daily.message));
    }
    List<String> milestoneMessages = grantMilestoneRewards(player, cfg, team);
    for (String message : milestoneMessages) {
      player.sendMessage(Text.literal(message));
    }
    save();
  }

  public void tickApplyBuffs(MinecraftServer server, ServerFeatureConfig cfg, long tick) {
    if (server == null || cfg == null || cfg.teams == null || !cfg.teams.enabled) return;
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      TeamId team = getTeam(player.getUuid());
      if (team == null) continue;
      applyConfiguredBuffs(player, cfg, team);
    }
  }

  public TeamId getTeam(UUID uuid) {
    if (uuid == null) return null;
    PlayerTeamState state = data.get(uuid.toString());
    return state == null ? null : TeamId.parse(state.teamId);
  }

  public TeamId resolveTeam(ServerPlayerEntity player) {
    if (player == null) return null;
    TeamId direct = getTeam(player.getUuid());
    if (direct != null) return direct;
    String currentName = safe(player.getGameProfile().getName()).toLowerCase(Locale.ROOT);
    if (currentName.isBlank()) return null;
    for (Map.Entry<String, PlayerTeamState> entry : data.entrySet()) {
      PlayerTeamState state = entry.getValue();
      if (state == null) continue;
      String known = safe(state.lastKnownName).toLowerCase(Locale.ROOT);
      if (known.isBlank() || !known.equals(currentName)) continue;
      TeamId migrated = TeamId.parse(state.teamId);
      if (migrated == null) continue;
      data.put(player.getUuidAsString(), state);
      data.remove(entry.getKey());
      state.lastKnownName = safe(player.getGameProfile().getName());
      save();
      return migrated;
    }
    return null;
  }

  public String teamDisplay(ServerFeatureConfig cfg, TeamId team) {
    if (team == null) return "Unassigned";
    if (cfg == null || cfg.teams == null || cfg.teams.list == null) return capitalize(team.id());
    for (ServerFeatureConfig.TeamDefinition definition : cfg.teams.list) {
      if (definition == null) continue;
      if (team.id().equalsIgnoreCase(safe(definition.id))) {
        String display = safe(definition.displayName);
        return display.isBlank() ? capitalize(team.id()) : display;
      }
    }
    return capitalize(team.id());
  }

  public List<String> availableTeamIds(ServerFeatureConfig cfg) {
    List<String> out = new ArrayList<>();
    if (cfg != null && cfg.teams != null && cfg.teams.list != null) {
      for (ServerFeatureConfig.TeamDefinition definition : cfg.teams.list) {
        if (definition == null || definition.id == null || definition.id.isBlank()) continue;
        out.add(definition.id.trim().toLowerCase(Locale.ROOT));
      }
    }
    if (out.isEmpty()) {
      out.add("valor");
      out.add("mystic");
      out.add("instinct");
    }
    return out;
  }

  public boolean hasTeam(UUID uuid) {
    return getTeam(uuid) != null;
  }

  public CommandResult chooseTeam(ServerPlayerEntity player, ServerFeatureConfig cfg, TeamId requested) {
    if (player == null) return CommandResult.error("Player required.");
    if (cfg == null || cfg.teams == null || !cfg.teams.enabled) return CommandResult.error("Teams are disabled.");
    if (requested == null || !availableTeamIds(cfg).contains(requested.id())) {
      return CommandResult.error(cfg.messages.teamUnknown);
    }

    long today = epochDayUtc();
    PlayerTeamState state = getOrCreate(player.getUuid());
    state.lastKnownName = safe(player.getGameProfile().getName());
    TeamId current = TeamId.parse(state.teamId);
    if (current != null && current == requested) {
      String msg = TemplateEngine.render(
        cfg.messages.teamAlreadyAssigned,
        Map.of("teamDisplay", teamDisplay(cfg, current))
      );
      return CommandResult.error(msg);
    }

    if (current != null) {
      if (!cfg.teams.allowSwitching) {
        return CommandResult.error(cfg.messages.teamSwitchBlocked);
      }
      long cooldownDays = Math.max(0, cfg.teams.switchCooldownDays);
      long elapsed = today - Math.max(0, state.lastSwitchEpochDay);
      if (elapsed < cooldownDays) {
        long remaining = cooldownDays - elapsed;
        String msg = TemplateEngine.render(cfg.messages.teamSwitchCooldown, Map.of("days", String.valueOf(remaining)));
        return CommandResult.error(msg);
      }
    }

    state.teamId = requested.id();
    state.joinedEpochDay = today;
    state.lastSwitchEpochDay = today;
    state.lastDailyRewardEpochDay = -1;
    state.claimedMilestones = new ArrayList<>();
    applyConfiguredBuffs(player, cfg, requested);
    save();

    String msg = TemplateEngine.render(
      cfg.messages.teamChosen,
      Map.of("teamDisplay", teamDisplay(cfg, requested))
    );
    return CommandResult.success(msg);
  }

  public CommandResult status(ServerPlayerEntity player, ServerFeatureConfig cfg, TeamMissionService missions) {
    TeamId team = getTeam(player.getUuid());
    String display = teamDisplay(cfg, team);
    int points = missions == null || team == null ? 0 : missions.getTeamPoints(team);
    String message = TemplateEngine.render(
      cfg.messages.teamStatus,
      Map.of(
        "teamDisplay", display,
        "teamPoints", String.valueOf(points)
      )
    );
    return CommandResult.success(message);
  }

  public CommandResult leave(ServerPlayerEntity player, ServerFeatureConfig cfg) {
    if (player == null) return CommandResult.error("Player required.");
    if (cfg == null || cfg.teams == null || !cfg.teams.enabled) return CommandResult.error("Teams are disabled.");
    if (!cfg.teams.allowSwitching) return CommandResult.error(cfg.messages.teamSwitchBlocked);
    PlayerTeamState state = getOrCreate(player.getUuid());
    state.teamId = null;
    state.joinedEpochDay = 0L;
    state.lastSwitchEpochDay = epochDayUtc();
    state.lastDailyRewardEpochDay = -1L;
    state.claimedMilestones = new ArrayList<>();
    save();
    return CommandResult.success("You are now unassigned. Use /team choose <valor|mystic|instinct>.");
  }

  private ClaimResult grantDailyRewardIfEligible(ServerPlayerEntity player, ServerFeatureConfig cfg) {
    TeamId team = getTeam(player.getUuid());
    if (team == null) return ClaimResult.none();
    long today = epochDayUtc();
    PlayerTeamState state = getOrCreate(player.getUuid());
    if (state.lastDailyRewardEpochDay == today) return ClaimResult.none();
    ServerFeatureConfig.TeamRewardDefinition reward = dailyRewardFor(cfg, team);
    if (reward == null) {
      state.lastDailyRewardEpochDay = today;
      return ClaimResult.none();
    }

    List<ServerFeatureConfig.RewardItem> normalizedItems = normalizeItems(reward.items);
    for (ServerFeatureConfig.RewardItem item : normalizedItems) {
      grantRewardItem(player, item);
    }
    executeRewardCommands(player.getServer(), player, reward.commands, cfg, team);
    state.lastDailyRewardEpochDay = today;
    String text = TemplateEngine.render(
      cfg.messages.teamDailyReward,
      Map.of("rewards", summarizeRewards(normalizedItems))
    );
    return ClaimResult.granted(text);
  }

  private List<String> grantMilestoneRewards(ServerPlayerEntity player, ServerFeatureConfig cfg, TeamId team) {
    List<String> out = new ArrayList<>();
    PlayerTeamState state = getOrCreate(player.getUuid());
    long daysInTeam = Math.max(0, epochDayUtc() - Math.max(0, state.joinedEpochDay)) + 1;
    Set<String> claimed = new HashSet<>(state.claimedMilestones == null ? List.of() : state.claimedMilestones);
    if (cfg.teams.longTermRewards == null) return out;
    for (ServerFeatureConfig.TeamMilestoneReward reward : cfg.teams.longTermRewards) {
      if (reward == null || !team.id().equalsIgnoreCase(safe(reward.teamId))) continue;
      int requiredDays = Math.max(1, reward.daysInTeam);
      String claimKey = team.id() + ":" + requiredDays;
      if (daysInTeam < requiredDays || claimed.contains(claimKey)) continue;
      List<ServerFeatureConfig.RewardItem> items = normalizeItems(reward.items);
      for (ServerFeatureConfig.RewardItem item : items) {
        grantRewardItem(player, item);
      }
      executeRewardCommands(player.getServer(), player, reward.commands, cfg, team);
      claimed.add(claimKey);
      out.add(TemplateEngine.render(
        cfg.messages.teamMilestoneReward,
        Map.of(
          "days", String.valueOf(requiredDays),
          "rewards", summarizeRewards(items)
        )
      ));
    }
    state.claimedMilestones = new ArrayList<>(claimed);
    return out;
  }

  private void applyConfiguredBuffs(ServerPlayerEntity player, ServerFeatureConfig cfg, TeamId team) {
    if (cfg.teams.buffs == null) return;
    for (ServerFeatureConfig.TeamBuffDefinition buff : cfg.teams.buffs) {
      if (buff == null) continue;
      if (!team.id().equalsIgnoreCase(safe(buff.teamId))) continue;
      Identifier id = Identifier.tryParse(safe(buff.effectId));
      if (id == null || !Registries.STATUS_EFFECT.containsId(id)) continue;
      var effect = Registries.STATUS_EFFECT.getEntry(id).orElse(null);
      if (effect == null) continue;
      int amplifier = Math.max(0, buff.amplifier);
      var existing = player.getStatusEffect(effect);
      if (existing != null && existing.getAmplifier() == amplifier && existing.getDuration() >= (Integer.MAX_VALUE / 2)) {
        continue;
      }
      var instance = new net.minecraft.entity.effect.StatusEffectInstance(
        effect,
        Integer.MAX_VALUE,
        amplifier,
        buff.ambient,
        buff.showParticles,
        buff.showIcon
      );
      player.addStatusEffect(instance);
    }
  }

  private void executeRewardCommands(MinecraftServer server, ServerPlayerEntity player, List<String> commands,
                                     ServerFeatureConfig cfg, TeamId team) {
    if (server == null || commands == null || commands.isEmpty()) return;
    ServerCommandSource source = server.getCommandSource()
      .withSilent()
      .withLevel(4)
      .withEntity(player);
    Map<String, String> values = TemplateEngine.baseMap(server, player, cfg.brand);
    values.put("team", team.id());
    values.put("teamDisplay", teamDisplay(cfg, team));
    for (String command : commands) {
      if (command == null || command.isBlank()) continue;
      String rendered = TemplateEngine.render(command, values);
      String normalized = rendered.startsWith("/") ? rendered.substring(1) : rendered;
      try {
        server.getCommandManager().executeWithPrefix(source, normalized);
      } catch (Exception ignored) {
      }
    }
  }

  private List<ServerFeatureConfig.RewardItem> normalizeItems(List<ServerFeatureConfig.RewardItem> items) {
    List<ServerFeatureConfig.RewardItem> out = new ArrayList<>();
    if (items == null) return out;
    for (ServerFeatureConfig.RewardItem item : items) {
      if (item == null) continue;
      ServerFeatureConfig.RewardItem normalized = new ServerFeatureConfig.RewardItem();
      normalized.itemId = (item.itemId == null || item.itemId.isBlank()) ? "minecraft:experience_bottle" : item.itemId;
      normalized.count = Math.max(1, item.count);
      normalized.label = (item.label == null || item.label.isBlank()) ? normalized.itemId : item.label;
      out.add(normalized);
    }
    return out;
  }

  private void grantRewardItem(ServerPlayerEntity player, ServerFeatureConfig.RewardItem reward) {
    String rawId = reward.itemId == null ? "" : reward.itemId.trim();
    Identifier id = Identifier.tryParse(rawId);
    Item item = (id == null || !Registries.ITEM.containsId(id))
      ? net.minecraft.item.Items.EXPERIENCE_BOTTLE
      : Registries.ITEM.get(id);
    int remaining = Math.max(1, reward.count);
    int maxStack = Math.max(1, item.getMaxCount());
    while (remaining > 0) {
      int stackCount = Math.min(remaining, maxStack);
      ItemStack stack = new ItemStack(item, stackCount);
      boolean inserted = player.getInventory().insertStack(stack);
      if (!inserted && !stack.isEmpty()) {
        player.dropItem(stack, false);
      }
      remaining -= stackCount;
    }
  }

  private ServerFeatureConfig.TeamRewardDefinition dailyRewardFor(ServerFeatureConfig cfg, TeamId team) {
    if (cfg.teams.dailyRewards == null) return null;
    for (ServerFeatureConfig.TeamRewardDefinition reward : cfg.teams.dailyRewards) {
      if (reward == null) continue;
      if (team.id().equalsIgnoreCase(safe(reward.teamId))) return reward;
    }
    return null;
  }

  private String summarizeRewards(List<ServerFeatureConfig.RewardItem> items) {
    if (items == null || items.isEmpty()) return "Reward";
    StringBuilder builder = new StringBuilder();
    for (ServerFeatureConfig.RewardItem item : items) {
      if (item == null) continue;
      if (!builder.isEmpty()) builder.append(", ");
      String label = (item.label == null || item.label.isBlank()) ? item.itemId : item.label;
      builder.append(label == null ? "Reward" : label).append(" x").append(Math.max(1, item.count));
    }
    return builder.isEmpty() ? "Reward" : builder.toString();
  }

  private long epochDayUtc() {
    return LocalDate.now(ZoneOffset.UTC).toEpochDay();
  }

  private PlayerTeamState getOrCreate(UUID uuid) {
    return data.computeIfAbsent(uuid.toString(), ignored -> new PlayerTeamState());
  }

  private String safe(String value) {
    return value == null ? "" : value;
  }

  private String capitalize(String input) {
    if (input == null || input.isBlank()) return "";
    String lower = input.toLowerCase(Locale.ROOT);
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }

  private boolean looksLikePlayerStateMap(Map<String, PlayerTeamState> map) {
    for (Map.Entry<String, PlayerTeamState> entry : map.entrySet()) {
      String key = entry.getKey();
      PlayerTeamState value = entry.getValue();
      if (key == null || value == null) continue;
      try {
        UUID.fromString(key);
        if (value.teamId != null && !value.teamId.isBlank()) return true;
      } catch (Exception ignored) {
      }
    }
    return false;
  }

  private static final class PlayerTeamState {
    String teamId;
    String lastKnownName = "";
    long joinedEpochDay;
    long lastSwitchEpochDay;
    long lastDailyRewardEpochDay = -1L;
    List<String> claimedMilestones = new ArrayList<>();
  }

  private record ClaimResult(boolean granted, String message) {
    private static ClaimResult none() {
      return new ClaimResult(false, "");
    }

    private static ClaimResult granted(String message) {
      return new ClaimResult(true, message == null ? "" : message);
    }
  }

  public record CommandResult(boolean ok, String message) {
    public static CommandResult success(String message) {
      return new CommandResult(true, message);
    }

    public static CommandResult error(String message) {
      return new CommandResult(false, message);
    }
  }
}
