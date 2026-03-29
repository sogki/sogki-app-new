package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.entity.effect.StatusEffectInstance;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.network.packet.Packet;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.sound.SoundCategory;
import net.minecraft.sound.SoundEvent;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class SkillTreeService {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path TREE_PATH = BASE_DIR.resolve("skill-tree.json");
  private static final Path POINTS_YML_PATH = BASE_DIR.resolve("skill-points.yml");
  private static final Path DATA_PATH = BASE_DIR.resolve("skill-data.json");
  private static final Path TOOLTIPS_YML_PATH = BASE_DIR.resolve("skill-tooltips.yml");
  private static final Path PLAYERDATA_YML_PATH = BASE_DIR.resolve("skill-playerdata.yml");

  private SkillTreeConfig config = defaults();
  private SkillDataStore store = new SkillDataStore();
  private SkillTooltipConfig tooltipConfig = tooltipDefaults();
  private long lastPassiveTick;
  private Map<String, Double> eventChanceAddBySource = new HashMap<>();
  private Map<String, Double> eventChanceMultiplierBySource = new HashMap<>();
  private Map<String, Integer> eventFlatPointsBySource = new HashMap<>();

  public SkillUiConfig ui() {
    return config.ui == null ? new SkillUiConfig() : config.ui;
  }

  public SkillTooltipConfig tooltips() {
    return tooltipConfig == null ? tooltipDefaults() : tooltipConfig;
  }

  public void load() {
    try {
      Files.createDirectories(BASE_DIR);
      if (Files.notExists(TREE_PATH)) {
        FileWriteUtil.writeJsonAtomic(TREE_PATH, GSON, defaults());
      }
      String rawTree = Files.readString(TREE_PATH, StandardCharsets.UTF_8);
      SkillTreeConfig parsedTree = GSON.fromJson(rawTree, SkillTreeConfig.class);
      this.config = parsedTree == null ? defaults() : parsedTree;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load skill tree config, using defaults: {}", e.getMessage());
      this.config = defaults();
    }
    ensureConfigDefaults(this.config);
    loadPointGainConfig();
    loadTooltipConfig();

    try {
      if (Files.notExists(DATA_PATH)) {
        this.store = new SkillDataStore();
        save();
      } else {
        String rawData = Files.readString(DATA_PATH, StandardCharsets.UTF_8);
        SkillDataStore parsed = GSON.fromJson(rawData, SkillDataStore.class);
        this.store = parsed == null ? new SkillDataStore() : parsed;
      }
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load skill data store, resetting store: {}", e.getMessage());
      this.store = new SkillDataStore();
    }
    if (this.store.players == null) this.store.players = new HashMap<>();
    normalizePlayerStatePools();
    writePlayerDataYaml();
  }

  public void save() {
    try {
      FileWriteUtil.writeJsonAtomic(DATA_PATH, GSON, store);
    } catch (IOException e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save skill data store: {}", e.getMessage());
    }
    writePlayerDataYaml();
  }

  public void tick(MinecraftServer server, long tick) {
    if (server == null || config == null || !config.enabled) return;
    if (tick - lastPassiveTick < 20) return;
    lastPassiveTick = tick;
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      applyPassiveEffects(player);
      applyPerkEffects(player);
    }
  }

  public int points(UUID uuid) {
    return availablePoints(state(uuid));
  }

  public int totalUnlocked(UUID uuid) {
    return state(uuid).unlocked.size();
  }

  public int unusedPoints(UUID uuid) {
    return availablePoints(state(uuid));
  }

  public List<String> unlocked(UUID uuid) {
    return new ArrayList<>(state(uuid).unlocked);
  }

  public List<SkillNode> nodes() {
    return new ArrayList<>(config.nodes);
  }

  public List<SkillCategory> categories() {
    List<SkillCategory> out = new ArrayList<>(config.categories == null ? List.of() : config.categories);
    out.sort(Comparator.comparingInt(c -> Math.max(1, c.row)));
    return out;
  }

  public int unlockedInCategory(UUID uuid, String categoryRaw) {
    if (uuid == null) return 0;
    String category = normalize(categoryRaw);
    if (category.isBlank()) return 0;
    PlayerSkillState state = state(uuid);
    int total = 0;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (normalize(node.category).equals(category)) {
        total++;
      }
    }
    return total;
  }

  public int categoryMilestoneStep() {
    return config == null || config.milestones == null ? 10 : Math.max(1, config.milestones.everyNodes);
  }

  public int nextCategoryMilestone(UUID uuid, String categoryRaw) {
    int current = unlockedInCategory(uuid, categoryRaw);
    int step = categoryMilestoneStep();
    if (current <= 0) return step;
    int mod = current % step;
    return mod == 0 ? current + step : current + (step - mod);
  }

  public int tiersPerPage() {
    return Math.max(1, config.tiersPerPage);
  }

  public int pageUnlockRequirement() {
    return Math.max(0, config.pageUnlockRequirement);
  }

  public void setEventPointChanceModifiers(Map<String, Double> chanceAdds,
                                           Map<String, Double> chanceMultipliers,
                                           Map<String, Integer> flatPointBonuses) {
    eventChanceAddBySource = new HashMap<>();
    eventChanceMultiplierBySource = new HashMap<>();
    eventFlatPointsBySource = new HashMap<>();
    if (chanceAdds != null) {
      for (Map.Entry<String, Double> e : chanceAdds.entrySet()) {
        String key = normalize(e.getKey());
        if (key.isBlank()) continue;
        double value = e.getValue() == null ? 0.0D : e.getValue();
        if (value != 0.0D) eventChanceAddBySource.put(key, value);
      }
    }
    if (chanceMultipliers != null) {
      for (Map.Entry<String, Double> e : chanceMultipliers.entrySet()) {
        String key = normalize(e.getKey());
        if (key.isBlank()) continue;
        double value = e.getValue() == null ? 1.0D : e.getValue();
        if (value != 1.0D) eventChanceMultiplierBySource.put(key, Math.max(0.0D, value));
      }
    }
    if (flatPointBonuses != null) {
      for (Map.Entry<String, Integer> e : flatPointBonuses.entrySet()) {
        String key = normalize(e.getKey());
        if (key.isBlank()) continue;
        int value = e.getValue() == null ? 0 : e.getValue();
        if (value != 0) eventFlatPointsBySource.put(key, value);
      }
    }
  }

  public void onQuizWin(UUID uuid) {
    awardMilestonePoints(uuid, 0, 1, 0, null);
    awardChancePoints(uuid, null, "quiz_win", config.pointGains.quizWinChance);
  }

  public void onQuizWin(ServerPlayerEntity player) {
    if (player == null) return;
    UUID uuid = player.getUuid();
    awardMilestonePoints(uuid, 0, 1, 0, player);
    awardChancePoints(uuid, player, "quiz_win", config.pointGains.quizWinChance);
  }

  public void onDailyClaim(UUID uuid) {
    awardMilestonePoints(uuid, 0, 0, 1, null);
    awardChancePoints(uuid, null, "daily_claim", config.pointGains.dailyClaimChance);
  }

  public void onDailyClaim(ServerPlayerEntity player) {
    if (player == null) return;
    UUID uuid = player.getUuid();
    awardMilestonePoints(uuid, 0, 0, 1, player);
    awardChancePoints(uuid, player, "daily_claim", config.pointGains.dailyClaimChance);
  }

  public void onPokemonCaptured(UUID uuid, boolean shiny, boolean legendary) {
    awardMilestonePoints(uuid, 1, 0, 0, null);
    awardChancePoints(uuid, null, "capture", config.pointGains.captureChance);
    if (shiny) {
      awardChancePoints(uuid, null, "shiny_capture", config.pointGains.shinyCaptureChance);
    }
    if (legendary) {
      awardChancePoints(uuid, null, "legendary_capture", config.pointGains.legendaryCaptureChance);
    }
    if (uuid == null) return;
    PlayerSkillState state = state(uuid);
    int bonus = 0;
    if (shiny) bonus += Math.max(0, config.pointGains.shinyBonusPoints);
    if (legendary) bonus += Math.max(0, config.pointGains.legendaryBonusPoints);
    if (bonus > 0) {
      int spent = spentPoints(state);
      state.totalPoints = Math.max(spent, state.totalPoints + bonus);
      state.points = Math.max(0, Math.min(state.totalPoints - spent, state.points + bonus));
      save();
    }
  }

  public void onPokemonCaptured(ServerPlayerEntity player, boolean shiny, boolean legendary) {
    if (player == null) return;
    UUID uuid = player.getUuid();
    awardMilestonePoints(uuid, 1, 0, 0, player);
    awardChancePoints(uuid, player, "capture", config.pointGains.captureChance);
    if (shiny) {
      awardChancePoints(uuid, player, "shiny_capture", config.pointGains.shinyCaptureChance);
    }
    if (legendary) {
      awardChancePoints(uuid, player, "legendary_capture", config.pointGains.legendaryCaptureChance);
    }
    if (uuid == null) return;
    PlayerSkillState state = state(uuid);
    int bonus = 0;
    if (shiny) bonus += Math.max(0, config.pointGains.shinyBonusPoints);
    if (legendary) bonus += Math.max(0, config.pointGains.legendaryBonusPoints);
    if (bonus > 0) {
      int spent = spentPoints(state);
      state.totalPoints = Math.max(spent, state.totalPoints + bonus);
      state.points = Math.max(0, Math.min(state.totalPoints - spent, state.points + bonus));
      save();
      notifyPointGain(player, bonus, "capture_bonus", state);
    }
  }

  public void onMiningOreBreak(UUID uuid) {
    awardChancePoints(uuid, null, "mining_ore", config.pointGains.miningOreChance);
  }

  public void onMiningOreBreak(ServerPlayerEntity player) {
    if (player == null) return;
    awardChancePoints(player.getUuid(), player, "mining_ore", config.pointGains.miningOreChance);
  }

  public void onMobKill(UUID uuid) {
    awardChancePoints(uuid, null, "mob_kill", config.pointGains.mobKillChance);
  }

  public void onMobKill(ServerPlayerEntity player) {
    if (player == null) return;
    awardChancePoints(player.getUuid(), player, "mob_kill", config.pointGains.mobKillChance);
  }

  public int adjustedProgress(UUID uuid, String progressType, int baseAmount) {
    if (uuid == null || baseAmount <= 0) return Math.max(0, baseAmount);
    String type = normalize(progressType);
    if (type.isBlank()) return Math.max(0, baseAmount);
    PlayerSkillState state = state(uuid);
    if (state.unlocked.isEmpty()) return Math.max(0, baseAmount);

    double percent = 0.0D;
    int flat = 0;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (!"progress_bonus".equalsIgnoreCase(normalize(node.effectType))) continue;
      if (!type.equals(normalize(node.progressType))) continue;
      String mode = normalize(node.progressMode);
      if ("percent".equals(mode)) {
        percent += node.value;
      } else {
        flat += (int) Math.round(node.value);
      }
    }

    double adjusted = (baseAmount * (1.0D + (percent / 100.0D))) + flat;
    return Math.max(0, (int) Math.round(adjusted));
  }

  public double perkPercent(UUID uuid, String perkTypeRaw) {
    if (uuid == null) return 0.0D;
    String perkType = normalize(perkTypeRaw);
    if (perkType.isBlank()) return 0.0D;
    PlayerSkillState state = state(uuid);
    if (state.unlocked.isEmpty()) return 0.0D;
    double out = 0.0D;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (!"perk_bonus".equalsIgnoreCase(normalize(node.effectType))) continue;
      if (!perkType.equals(normalize(node.perkType))) continue;
      if ("percent".equals(normalize(node.perkMode))) {
        out += node.value;
      }
    }
    return Math.max(0.0D, out);
  }

  public int perkFlat(UUID uuid, String perkTypeRaw) {
    if (uuid == null) return 0;
    String perkType = normalize(perkTypeRaw);
    if (perkType.isBlank()) return 0;
    PlayerSkillState state = state(uuid);
    if (state.unlocked.isEmpty()) return 0;
    int out = 0;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (!"perk_bonus".equalsIgnoreCase(normalize(node.effectType))) continue;
      if (!perkType.equals(normalize(node.perkType))) continue;
      if (!"percent".equals(normalize(node.perkMode))) {
        out += (int) Math.round(node.value);
      }
    }
    return Math.max(0, out);
  }

  public double cobblemonFirstTryCatchBonusPercent(UUID uuid) {
    return perkPercent(uuid, "cobblemon_first_try_catch");
  }

  public SkillNode node(String nodeIdRaw) {
    String nodeId = normalize(nodeIdRaw);
    return nodeById(nodeId);
  }

  public List<String> unmetRequirements(UUID uuid, String nodeIdRaw) {
    List<String> out = new ArrayList<>();
    SkillNode node = nodeById(normalize(nodeIdRaw));
    if (node == null || node.requires == null || node.requires.isEmpty()) return out;
    PlayerSkillState state = state(uuid);
    for (String required : node.requires) {
      String req = normalize(required);
      if (!state.unlocked.contains(req)) {
        out.add(req);
      }
    }
    return out;
  }

  public List<String> treeLines(UUID uuid) {
    PlayerSkillState state = state(uuid);
    List<SkillNode> nodes = new ArrayList<>(config.nodes);
    nodes.sort(Comparator
      .comparing((SkillNode n) -> safe(n.category))
      .thenComparing(n -> safe(n.id)));
    List<String> out = new ArrayList<>();
    out.add("&bSkill Tree &7(Points: &f" + availablePoints(state) + "&7)");
    String currentCategory = "";
    for (SkillNode node : nodes) {
      String category = safe(node.category);
      if (!category.equalsIgnoreCase(currentCategory)) {
        currentCategory = category;
        out.add("&8- &d" + capitalize(category));
      }
      boolean unlocked = state.unlocked.contains(node.id);
      boolean prereqsMet = prerequisitesMet(state, node);
      String status = unlocked ? "&aUNLOCKED" : (prereqsMet ? "&eAVAILABLE" : "&cLOCKED");
      out.add("&7  " + safe(node.id) + " &8| " + status + " &8| &f" + Math.max(1, node.cost) + " pts");
      out.add("&8    " + safe(node.name) + " &7- " + safe(node.description));
    }
    return out;
  }

  public CommandResult unlock(UUID uuid, String nodeIdRaw) {
    if (uuid == null) return CommandResult.error("Player required.");
    if (!config.enabled) return CommandResult.error("Skill tree is disabled.");
    String nodeId = normalize(nodeIdRaw);
    if (nodeId.isBlank()) return CommandResult.error("Provide a node id.");

    SkillNode node = nodeById(nodeId);
    if (node == null) return CommandResult.error("Unknown node: " + nodeId);

    PlayerSkillState state = state(uuid);
    if (state.unlocked.contains(node.id)) {
      return CommandResult.error("Node already unlocked: " + node.id);
    }
    if (!prerequisitesMet(state, node)) {
      return CommandResult.error("Requirements not met. Needed: " + String.join(", ", node.requires));
    }
    int cost = Math.max(1, node.cost);
    int availableBefore = availablePoints(state);
    if (availableBefore < cost) {
      return CommandResult.error("Not enough skill points. Need " + cost + ", have " + availableBefore + ".");
    }

    state.unlocked.add(node.id);
    state.points = availablePoints(state);
    save();
    return CommandResult.success(render(ui().chatUnlockSuccess, Map.of(
      "nodeId", node.id,
      "nodeName", safe(node.name),
      "points", String.valueOf(availablePoints(state))
    )));
  }

  public CommandResult unlock(ServerPlayerEntity player, String nodeIdRaw) {
    if (player == null) return CommandResult.error("Player required.");
    CommandResult result = unlock(player.getUuid(), nodeIdRaw);
    if (!result.ok()) return result;
    SkillNode node = nodeById(normalize(nodeIdRaw));
    if (node != null) {
      applyUnlockRewards(player, node);
      triggerMilestone(player, node);
    }
    return result;
  }

  public CommandResult reset(UUID uuid) {
    if (uuid == null) return CommandResult.error("Player required.");
    PlayerSkillState state = state(uuid);
    int spent = spentPoints(state);
    int resetCost = Math.max(0, config.resetCostPoints);
    state.totalPoints = Math.max(spent, state.totalPoints);
    int availableBefore = Math.max(0, state.totalPoints - spent);
    if (availableBefore < resetCost) {
      return CommandResult.error(render(ui().chatResetNeedPoints, Map.of(
        "cost", String.valueOf(resetCost),
        "points", String.valueOf(availableBefore)
      )));
    }
    state.totalPoints = Math.max(0, state.totalPoints - resetCost);
    state.unlocked = new ArrayList<>();
    state.points = Math.max(0, state.totalPoints);
    save();
    return CommandResult.success(render(ui().chatResetSuccess, Map.of(
      "points", String.valueOf(state.points)
    )));
  }

  public CommandResult grantPoints(UUID uuid, int delta) {
    if (uuid == null) return CommandResult.error("Player required.");
    if (delta == 0) return CommandResult.error("Points delta cannot be 0.");
    PlayerSkillState state = state(uuid);
    int spent = spentPoints(state);
    state.totalPoints = Math.max(spent, state.totalPoints + delta);
    state.points = Math.max(0, Math.min(state.totalPoints - spent, state.points + delta));
    save();
    return CommandResult.success("Skill points updated. New total: " + state.points + ".");
  }

  private void applyPassiveEffects(ServerPlayerEntity player) {
    PlayerSkillState state = state(player.getUuid());
    if (state.unlocked.isEmpty()) return;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (!"passive_status_effect".equalsIgnoreCase(normalize(node.effectType))) continue;
      Identifier effectId = Identifier.tryParse(safe(node.statusEffectId));
      if (effectId == null || !Registries.STATUS_EFFECT.containsId(effectId)) continue;
      var effect = Registries.STATUS_EFFECT.getEntry(effectId).orElse(null);
      if (effect == null) continue;
      int amplifier = Math.max(0, node.amplifier);
      var existing = player.getStatusEffect(effect);
      if (existing != null && existing.getAmplifier() == amplifier && existing.getDuration() >= (Integer.MAX_VALUE / 2)) {
        continue;
      }
      var instance = new StatusEffectInstance(
        effect,
        Integer.MAX_VALUE,
        amplifier,
        node.ambient,
        node.showParticles,
        node.showIcon
      );
      player.addStatusEffect(instance);
    }
  }

  private void applyPerkEffects(ServerPlayerEntity player) {
    if (player == null) return;
    if (player.getMainHandStack().getItem() != Items.FISHING_ROD
      && player.getOffHandStack().getItem() != Items.FISHING_ROD) {
      return;
    }
    double fishingPercent = perkPercent(player.getUuid(), "fishing_good_loot");
    int fishingFlat = perkFlat(player.getUuid(), "fishing_good_loot");
    int total = (int) Math.round(fishingPercent) + fishingFlat;
    if (total <= 0) return;
    int amplifier = Math.max(0, Math.min(4, (total / 10)));
    Identifier luckId = Identifier.tryParse("minecraft:luck");
    if (luckId == null || !Registries.STATUS_EFFECT.containsId(luckId)) return;
    var effect = Registries.STATUS_EFFECT.getEntry(luckId).orElse(null);
    if (effect == null) return;
    var existing = player.getStatusEffect(effect);
    if (existing != null && existing.getAmplifier() >= amplifier && existing.getDuration() > 40) {
      return;
    }
    player.addStatusEffect(new StatusEffectInstance(effect, 60, amplifier, true, false, false));
  }

  private void applyUnlockRewards(ServerPlayerEntity player, SkillNode node) {
    if (player == null || node == null) return;
    PlayerSkillState state = state(player.getUuid());
    if (state.rewardedNodes.contains(node.id)) return;
    if (node.oneTimeRewards != null) {
      for (RewardGrant reward : node.oneTimeRewards) {
        if (reward == null) continue;
        int count = Math.max(1, reward.count);
        Identifier itemId = resolveRewardItemId(reward);
        if (itemId == null || !Registries.ITEM.containsId(itemId)) continue;
        ItemStack stack = new ItemStack(Registries.ITEM.get(itemId), count);
        boolean inserted = player.getInventory().insertStack(stack);
        if (!inserted || !stack.isEmpty()) {
          player.dropItem(stack, false);
        }
      }
    }
    if (node.onUnlockCommands != null && !node.onUnlockCommands.isEmpty() && player.getServer() != null) {
      for (String cmdTemplate : node.onUnlockCommands) {
        String command = safe(cmdTemplate);
        if (command.isBlank()) continue;
        command = command
          .replace("{player}", player.getName().getString())
          .replace("{uuid}", player.getUuidAsString())
          .replace("{nodeId}", safe(node.id));
        try {
          var server = player.getServer();
          if (server != null) {
            var source = server.getCommandSource().withLevel(2);
            server.getCommandManager().executeWithPrefix(source, command);
          }
        } catch (Exception ignored) {
        }
      }
    }
    state.rewardedNodes.add(node.id);
    save();
  }

  private Identifier resolveRewardItemId(RewardGrant reward) {
    if (reward == null) return null;
    if (reward.itemIds != null && !reward.itemIds.isEmpty()) {
      for (String raw : reward.itemIds) {
        Identifier id = Identifier.tryParse(safe(raw));
        if (id != null && Registries.ITEM.containsId(id)) return id;
      }
    }
    Identifier single = Identifier.tryParse(safe(reward.itemId));
    if (single != null && Registries.ITEM.containsId(single)) return single;
    return null;
  }

  private boolean prerequisitesMet(PlayerSkillState state, SkillNode node) {
    if (node.requires == null || node.requires.isEmpty()) return true;
    for (String required : node.requires) {
      if (!state.unlocked.contains(normalize(required))) return false;
    }
    return true;
  }

  private SkillNode nodeById(String id) {
    String normalized = normalize(id);
    for (SkillNode node : config.nodes) {
      if (normalize(node.id).equals(normalized)) {
        return node;
      }
    }
    return null;
  }

  private PlayerSkillState state(UUID uuid) {
    String key = uuid == null ? "" : uuid.toString();
    PlayerSkillState state = store.players.computeIfAbsent(key, ignored -> {
      PlayerSkillState created = new PlayerSkillState();
      created.points = Math.max(0, config.startingPoints);
      created.totalPoints = Math.max(0, config.startingPoints);
      created.unlocked = new ArrayList<>();
      return created;
    });
    state.points = availablePoints(state);
    return state;
  }

  private int spentPoints(PlayerSkillState state) {
    if (state == null || state.unlocked == null) return 0;
    int spent = 0;
    for (String id : state.unlocked) {
      SkillNode node = nodeById(id);
      if (node == null) continue;
      spent += Math.max(1, node.cost);
    }
    return Math.max(0, spent);
  }

  private int availablePoints(PlayerSkillState state) {
    if (state == null) return 0;
    int spent = spentPoints(state);
    state.totalPoints = Math.max(spent, state.totalPoints);
    return Math.max(0, state.totalPoints - spent);
  }

  private boolean availableNode(PlayerSkillState state, SkillNode node) {
    if (state == null || node == null) return false;
    if (state.unlocked.contains(node.id)) return false;
    if (!prerequisitesMet(state, node)) return false;
    return availablePoints(state) >= Math.max(1, node.cost);
  }

  private void writePlayerDataYaml() {
    try {
      Files.createDirectories(BASE_DIR);
      StringBuilder out = new StringBuilder();
      out.append("skillPlayerData:\n");
      out.append("  generatedAtEpochMs: ").append(System.currentTimeMillis()).append("\n");
      out.append("  tierMilestoneStep: ").append(categoryMilestoneStep()).append("\n");
      out.append("  players:\n");

      List<String> playerIds = new ArrayList<>(store.players == null ? List.of() : store.players.keySet());
      playerIds.sort(String::compareToIgnoreCase);
      for (String playerId : playerIds) {
        PlayerSkillState state = store.players.get(playerId);
        if (state == null) continue;
        if (state.unlocked == null) state.unlocked = new ArrayList<>();

        Map<String, Integer> tiers = nodeTierMap();
        List<String> unlockedNodes = new ArrayList<>();
        List<String> availableNodes = new ArrayList<>();
        List<String> lockedNodes = new ArrayList<>();
        for (SkillNode node : config.nodes) {
          if (node == null) continue;
          if (state.unlocked.contains(node.id)) {
            unlockedNodes.add(node.id);
          } else if (availableNode(state, node)) {
            availableNodes.add(node.id);
          } else {
            lockedNodes.add(node.id);
          }
        }
        unlockedNodes.sort(String::compareToIgnoreCase);
        availableNodes.sort(String::compareToIgnoreCase);
        lockedNodes.sort(String::compareToIgnoreCase);

        int spent = spentPoints(state);
        out.append("    \"").append(escapeYaml(playerId)).append("\":\n");
        out.append("      points: ").append(availablePoints(state)).append("\n");
        out.append("      totalPoints: ").append(Math.max(0, state.totalPoints)).append("\n");
        out.append("      spentPoints: ").append(spent).append("\n");
        out.append("      unlockedTotal: ").append(unlockedNodes.size()).append("\n");
        out.append("      availableTotal: ").append(availableNodes.size()).append("\n");
        out.append("      lockedTotal: ").append(lockedNodes.size()).append("\n");
        out.append("      chanceDayEpoch: ").append(state.chanceDayEpoch).append("\n");
        out.append("      chanceAwardedTotalToday: ").append(chanceTotalToday(state)).append("\n");
        out.append("      chanceAwardedBySourceToday:\n");
        List<String> chanceSources = new ArrayList<>(state.chanceAwardedToday == null ? List.of() : state.chanceAwardedToday.keySet());
        chanceSources.sort(String::compareToIgnoreCase);
        for (String source : chanceSources) {
          int awarded = Math.max(0, state.chanceAwardedToday.getOrDefault(source, 0));
          out.append("        \"").append(escapeYaml(source)).append("\": ").append(awarded).append("\n");
        }

        out.append("      categories:\n");
        for (SkillCategory category : categories()) {
          if (category == null) continue;
          String categoryId = normalize(category.id);
          if (categoryId.isBlank()) continue;
          out.append("        - id: \"").append(escapeYaml(categoryId)).append("\"\n");
          out.append("          name: \"").append(escapeYaml(safe(category.name))).append("\"\n");
          out.append("          unlocked: ").append(unlockedInCategory(parseUuid(playerId), categoryId)).append("\n");
          out.append("          nextMilestone: ").append(nextCategoryMilestone(parseUuid(playerId), categoryId)).append("\n");
        }

        out.append("      unlockedNodes:\n");
        for (String id : unlockedNodes) {
          out.append("        - \"").append(escapeYaml(id)).append("\"\n");
        }
        out.append("      availableNodes:\n");
        for (String id : availableNodes) {
          out.append("        - \"").append(escapeYaml(id)).append("\"\n");
        }
        out.append("      lockedNodes:\n");
        for (String id : lockedNodes) {
          out.append("        - \"").append(escapeYaml(id)).append("\"\n");
        }

        out.append("      nodes:\n");
        List<SkillNode> orderedNodes = new ArrayList<>(config.nodes);
        orderedNodes.sort(Comparator.comparing(n -> safe(n.id)));
        for (SkillNode node : orderedNodes) {
          if (node == null) continue;
          String status = state.unlocked.contains(node.id) ? "unlocked" : (availableNode(state, node) ? "available" : "locked");
          out.append("        - id: \"").append(escapeYaml(safe(node.id))).append("\"\n");
          out.append("          name: \"").append(escapeYaml(safe(node.name))).append("\"\n");
          out.append("          category: \"").append(escapeYaml(normalize(node.category))).append("\"\n");
          out.append("          tier: ").append(Math.max(1, tiers.getOrDefault(safe(node.id), 1))).append("\n");
          out.append("          cost: ").append(Math.max(1, node.cost)).append("\n");
          out.append("          status: \"").append(status).append("\"\n");
        }
      }
      FileWriteUtil.writeStringAtomic(PLAYERDATA_YML_PATH, out.toString());
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to export skill-playerdata.yml: {}", e.getMessage());
    }
  }

  private Map<String, Integer> nodeTierMap() {
    Map<String, SkillNode> byId = new HashMap<>();
    for (SkillNode node : config.nodes) {
      if (node == null) continue;
      byId.put(safe(node.id), node);
    }
    Map<String, Integer> tierById = new HashMap<>();
    for (SkillNode node : config.nodes) {
      if (node == null) continue;
      computeTier(node, byId, tierById, new ArrayList<>());
    }
    return tierById;
  }

  private int computeTier(SkillNode node,
                          Map<String, SkillNode> byId,
                          Map<String, Integer> tierById,
                          List<String> stack) {
    String id = safe(node.id);
    if (tierById.containsKey(id)) return tierById.get(id);
    if (stack.contains(id)) return 1;
    stack.add(id);
    int tier = 1;
    if (node.requires != null) {
      for (String req : node.requires) {
        SkillNode parent = byId.get(safe(req));
        if (parent == null) continue;
        tier = Math.max(tier, computeTier(parent, byId, tierById, stack) + 1);
      }
    }
    stack.remove(id);
    tierById.put(id, tier);
    return tier;
  }

  private UUID parseUuid(String raw) {
    try {
      return raw == null ? null : UUID.fromString(raw);
    } catch (Exception ignored) {
      return null;
    }
  }

  private void normalizePlayerStatePools() {
    if (store == null || store.players == null) return;
    for (PlayerSkillState state : store.players.values()) {
      if (state == null) continue;
      if (state.unlocked == null) state.unlocked = new ArrayList<>();
      if (state.rewardedNodes == null) state.rewardedNodes = new ArrayList<>();
      if (state.chanceAwardedToday == null) state.chanceAwardedToday = new HashMap<>();
      if (state.chanceDayEpoch <= 0L) state.chanceDayEpoch = currentEpochDay();
      int spent = spentPoints(state);
      int inferredPool = Math.max(0, state.points) + spent;
      state.totalPoints = Math.max(spent, Math.max(state.totalPoints, inferredPool));
      state.points = availablePoints(state);
    }
    save();
  }

  private String normalize(String value) {
    return safe(value).toLowerCase(Locale.ROOT);
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private String capitalize(String input) {
    if (input == null || input.isBlank()) return "";
    String lower = input.toLowerCase(Locale.ROOT);
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }

  private SkillTreeConfig defaults() {
    SkillTreeConfig cfg = new SkillTreeConfig();
    cfg.enabled = true;
    cfg.startingPoints = 3;
    cfg.resetCostPoints = 3;
    cfg.tiersPerPage = 4;
    cfg.pageUnlockRequirement = 2;
    cfg.autoGenerateLanes = true;
    cfg.maxLevelPerDirection = 100;
    cfg.majorNodeEvery = 10;
    cfg.categories = new ArrayList<>(List.of(
      category("recon", "Recon", 1, "minecraft:compass"),
      category("survival", "Survival", 2, "minecraft:shield"),
      category("tactics", "Tactics", 3, "minecraft:crossbow"),
      category("creature_ops", "Creature Ops", 4, "minecraft:lead")
    ));
    cfg.nodes = generateLaneNodes(cfg);
    return cfg;
  }

  private SkillTooltipConfig tooltipDefaults() {
    SkillTooltipConfig cfg = new SkillTooltipConfig();
    cfg.titleUnlocked = "&a{nodeName}";
    cfg.titleAvailable = "&e{nodeName}";
    cfg.titleLocked = "&c{nodeName}";
    cfg.statusUnlockedText = "&aUnlocked";
    cfg.statusAvailableText = "&eAvailable";
    cfg.statusLockedText = "&cLocked";
    cfg.requiresTemplate = "&cRequires: &f{requires}";
    cfg.actionUnlockedText = "&aUnlocked";
    cfg.actionAvailableText = "&eClick to unlock";
    cfg.actionLockedText = "";
    cfg.lore = new ArrayList<>(List.of(
      "&7Effect",
      "&f{description}",
      "",
      "&8&m----------------",
      "&7Path: &f{path}",
      "&7Cost: &f{cost} &8| {status}",
      "{requiresLine}",
      "{actionLine}"
    ));
    return cfg;
  }

  private SkillCategory category(String id, String name, int row, String iconItemId) {
    SkillCategory category = new SkillCategory();
    category.id = normalize(id);
    category.name = safe(name).isBlank() ? id : name;
    category.row = Math.max(1, row);
    category.iconItemId = safe(iconItemId).isBlank() ? "minecraft:book" : iconItemId;
    return category;
  }

  private SkillNode statusNode(String id, String name, String description, int cost, String category,
                               String statusEffectId, int amplifier, List<String> requires) {
    SkillNode node = new SkillNode();
    node.id = normalize(id);
    node.name = name;
    node.description = description;
    node.cost = Math.max(1, cost);
    node.category = normalize(category);
    node.effectType = "passive_status_effect";
    node.statusEffectId = statusEffectId;
    node.amplifier = Math.max(0, amplifier);
    node.requires = new ArrayList<>(requires == null ? List.of() : requires);
    return node;
  }

  private SkillNode progressNode(String id, String name, String description, int cost, String category,
                                 String progressType, String progressMode, double value, List<String> requires) {
    SkillNode node = new SkillNode();
    node.id = normalize(id);
    node.name = name;
    node.description = description;
    node.cost = Math.max(1, cost);
    node.category = normalize(category);
    node.effectType = "progress_bonus";
    node.progressType = normalize(progressType);
    node.progressMode = normalize(progressMode);
    node.value = value;
    node.requires = new ArrayList<>(requires == null ? List.of() : requires);
    return node;
  }

  private SkillNode perkNode(String id, String name, String description, int cost, String category,
                             String perkType, String perkMode, double value, List<String> requires) {
    SkillNode node = new SkillNode();
    node.id = normalize(id);
    node.name = name;
    node.description = description;
    node.cost = Math.max(1, cost);
    node.category = normalize(category);
    node.effectType = "perk_bonus";
    node.perkType = normalize(perkType);
    node.perkMode = normalize(perkMode);
    node.value = value;
    node.requires = new ArrayList<>(requires == null ? List.of() : requires);
    return node;
  }

  private void ensureConfigDefaults(SkillTreeConfig cfg) {
    if (cfg.ui == null) cfg.ui = new SkillUiConfig();
    if (cfg.milestones == null) cfg.milestones = new SkillMilestoneConfig();
    if (cfg.pointGains == null) cfg.pointGains = new SkillPointGainConfig();
    if (cfg.categories == null || cfg.categories.isEmpty()) {
      cfg.categories = defaults().categories;
    }
    if (cfg.nodes == null) cfg.nodes = new ArrayList<>();
    cfg.startingPoints = Math.max(0, cfg.startingPoints);
    if (cfg.startingPoints == 0) cfg.startingPoints = 3;
    cfg.resetCostPoints = Math.max(0, cfg.resetCostPoints);
    cfg.tiersPerPage = Math.max(1, cfg.tiersPerPage);
    cfg.pageUnlockRequirement = Math.max(0, cfg.pageUnlockRequirement);
    cfg.maxLevelPerDirection = Math.max(10, cfg.maxLevelPerDirection);
    cfg.majorNodeEvery = Math.max(2, cfg.majorNodeEvery);
    cfg.milestones.everyNodes = Math.max(1, cfg.milestones.everyNodes);
    cfg.pointGains.catchesPerPoint = Math.max(1, cfg.pointGains.catchesPerPoint);
    cfg.pointGains.quizWinsPerPoint = Math.max(1, cfg.pointGains.quizWinsPerPoint);
    cfg.pointGains.dailyClaimsPerPoint = Math.max(1, cfg.pointGains.dailyClaimsPerPoint);
    cfg.pointGains.shinyBonusPoints = Math.max(0, cfg.pointGains.shinyBonusPoints);
    cfg.pointGains.legendaryBonusPoints = Math.max(0, cfg.pointGains.legendaryBonusPoints);
    cfg.pointGains.globalChanceDailyCap = Math.max(0, cfg.pointGains.globalChanceDailyCap);
    cfg.pointGains.chanceOutOf = Math.max(1, cfg.pointGains.chanceOutOf);
    if (cfg.pointGains.captureChance == null) cfg.pointGains.captureChance = new ChanceSourceConfig();
    if (cfg.pointGains.quizWinChance == null) cfg.pointGains.quizWinChance = new ChanceSourceConfig();
    if (cfg.pointGains.dailyClaimChance == null) cfg.pointGains.dailyClaimChance = new ChanceSourceConfig();
    if (cfg.pointGains.shinyCaptureChance == null) cfg.pointGains.shinyCaptureChance = new ChanceSourceConfig();
    if (cfg.pointGains.legendaryCaptureChance == null) cfg.pointGains.legendaryCaptureChance = new ChanceSourceConfig();
    if (cfg.pointGains.miningOreChance == null) cfg.pointGains.miningOreChance = new ChanceSourceConfig();
    if (cfg.pointGains.mobKillChance == null) cfg.pointGains.mobKillChance = new ChanceSourceConfig();
    normalizeChanceSource(cfg.pointGains.captureChance, 4.0D, 1, 1, 3);
    normalizeChanceSource(cfg.pointGains.quizWinChance, 12.0D, 1, 2, 4);
    normalizeChanceSource(cfg.pointGains.dailyClaimChance, 15.0D, 1, 1, 1);
    normalizeChanceSource(cfg.pointGains.shinyCaptureChance, 35.0D, 1, 2, 3);
    normalizeChanceSource(cfg.pointGains.legendaryCaptureChance, 60.0D, 1, 3, 4);
    normalizeChanceSource(cfg.pointGains.miningOreChance, 3.0D, 1, 1, 2);
    normalizeChanceSource(cfg.pointGains.mobKillChance, 2.5D, 1, 1, 3);
    cfg.pointGains.captureChance.chancePercent = Math.min(cfg.pointGains.captureChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.quizWinChance.chancePercent = Math.min(cfg.pointGains.quizWinChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.dailyClaimChance.chancePercent = Math.min(cfg.pointGains.dailyClaimChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.shinyCaptureChance.chancePercent = Math.min(cfg.pointGains.shinyCaptureChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.legendaryCaptureChance.chancePercent = Math.min(cfg.pointGains.legendaryCaptureChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.miningOreChance.chancePercent = Math.min(cfg.pointGains.miningOreChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.pointGains.mobKillChance.chancePercent = Math.min(cfg.pointGains.mobKillChance.chancePercent, cfg.pointGains.chanceOutOf);
    cfg.milestones.soundVolume = clamp(cfg.milestones.soundVolume, 0.0F, 2.0F);
    cfg.milestones.soundPitch = clamp(cfg.milestones.soundPitch, 0.1F, 2.0F);
    cfg.milestones.particleCount = Math.max(1, cfg.milestones.particleCount);
    if (safe(cfg.milestones.titleText).isBlank()) cfg.milestones.titleText = "&bSkill Upgrade";
    if (safe(cfg.milestones.subtitleText).isBlank()) cfg.milestones.subtitleText = "&7{lineName} Tier {tier}";
    if (safe(cfg.milestones.chatAnnouncement).isBlank()) cfg.milestones.chatAnnouncement = "&6{player}&e has achieved tier &f{tier} &eof &f{lineName}&e.";
    if (safe(cfg.milestones.soundId).isBlank()) cfg.milestones.soundId = "minecraft:entity.player.levelup";
    if (safe(cfg.milestones.particleId).isBlank()) cfg.milestones.particleId = "minecraft:totem_of_undying";
    if (safe(cfg.ui.nodeTitleUnlockedColor).isBlank()) cfg.ui.nodeTitleUnlockedColor = "&a";
    if (safe(cfg.ui.nodeTitleAvailableColor).isBlank()) cfg.ui.nodeTitleAvailableColor = "&e";
    if (safe(cfg.ui.nodeTitleLockedColor).isBlank()) cfg.ui.nodeTitleLockedColor = "&c";
    if (safe(cfg.ui.nodeMetaColor).isBlank()) cfg.ui.nodeMetaColor = "&7";
    if (safe(cfg.ui.nodeDescColor).isBlank()) cfg.ui.nodeDescColor = "&8";
    if (safe(cfg.ui.nodeHintColor).isBlank()) cfg.ui.nodeHintColor = "&e";
    if (safe(cfg.ui.nodeRequirementColor).isBlank()) cfg.ui.nodeRequirementColor = "&c";
    if (safe(cfg.ui.nodeStatusUnlocked).isBlank()) cfg.ui.nodeStatusUnlocked = "Unlocked";
    if (safe(cfg.ui.nodeStatusAvailable).isBlank()) cfg.ui.nodeStatusAvailable = "Available";
    if (safe(cfg.ui.nodeStatusLocked).isBlank()) cfg.ui.nodeStatusLocked = "Locked";
    if (safe(cfg.ui.chatUnlockSuccess).isBlank()) cfg.ui.chatUnlockSuccess = "&aUnlocked {nodeName}&7. Remaining points: &f{points}&7.";
    if (safe(cfg.ui.chatResetSuccess).isBlank()) cfg.ui.chatResetSuccess = "&eSkills reset. Points available: &f{points}&e.";
    if (safe(cfg.ui.chatResetNeedPoints).isBlank()) cfg.ui.chatResetNeedPoints = "&cNeed &f{cost} &cunused points to reset. Current: &f{points}&c.";
    if (safe(cfg.ui.chatPointGain).isBlank()) cfg.ui.chatPointGain = "&b+{points} Skill Point(s) &7from &f{source}&7. Unused: &f{unusedPoints}";
    Map<String, SkillCategory> categoryMap = new LinkedHashMap<>();
    for (SkillCategory category : cfg.categories) {
      if (category == null) continue;
      category.id = normalize(category.id);
      if (category.id.isBlank()) continue;
      category.name = safe(category.name).isBlank() ? capitalize(category.id) : category.name;
      category.row = Math.max(1, category.row);
      category.iconItemId = safe(category.iconItemId).isBlank() ? "minecraft:book" : category.iconItemId;
      categoryMap.put(category.id, category);
    }
    cfg.categories = new ArrayList<>(categoryMap.values());
    if (cfg.categories.isEmpty()) {
      cfg.categories = defaults().categories;
    }
    Map<String, SkillNode> dedup = new LinkedHashMap<>();
    for (SkillNode node : cfg.nodes) {
      if (node == null) continue;
      node.id = normalize(node.id);
      if (node.id.isBlank()) continue;
      node.name = safe(node.name).isBlank() ? node.id : node.name;
      node.description = safe(node.description);
      node.category = safe(node.category).isBlank() ? "general" : normalize(node.category);
      node.effectType = normalize(node.effectType);
      if (node.effectType.isBlank()) node.effectType = "passive_status_effect";
      node.cost = Math.max(1, node.cost);
      node.amplifier = Math.max(0, node.amplifier);
      node.iconItemId = safe(node.iconItemId);
      node.statusEffectId = safe(node.statusEffectId);
      node.progressType = normalize(node.progressType);
      node.progressMode = normalize(node.progressMode);
      if (node.progressMode.isBlank()) node.progressMode = "flat";
      node.perkType = normalize(node.perkType);
      node.perkMode = normalize(node.perkMode);
      if (node.perkMode.isBlank()) node.perkMode = "percent";
      node.requires = node.requires == null ? new ArrayList<>() : new ArrayList<>(node.requires);
      if (node.oneTimeRewards == null) node.oneTimeRewards = new ArrayList<>();
      for (RewardGrant reward : node.oneTimeRewards) {
        if (reward == null) continue;
        reward.itemId = safe(reward.itemId);
        reward.count = Math.max(1, reward.count);
        reward.itemIds = reward.itemIds == null ? new ArrayList<>() : new ArrayList<>(reward.itemIds);
      }
      node.onUnlockCommands = node.onUnlockCommands == null ? new ArrayList<>() : new ArrayList<>(node.onUnlockCommands);
      dedup.put(node.id, node);
    }
    cfg.nodes = new ArrayList<>(dedup.values());
    if (cfg.autoGenerateLanes || cfg.nodes.isEmpty()) {
      cfg.nodes = generateLaneNodes(cfg);
    }
  }

  private void normalizeChanceSource(ChanceSourceConfig cfg,
                                     double chancePercent,
                                     int minPoints,
                                     int maxPoints,
                                     int dailyCap) {
    if (cfg == null) return;
    cfg.chancePercent = Math.max(0.0D, Math.min(100.0D, cfg.chancePercent <= 0.0D ? chancePercent : cfg.chancePercent));
    cfg.pointsMin = Math.max(1, cfg.pointsMin <= 0 ? minPoints : cfg.pointsMin);
    cfg.pointsMax = Math.max(cfg.pointsMin, cfg.pointsMax <= 0 ? maxPoints : cfg.pointsMax);
    cfg.dailyCap = Math.max(0, cfg.dailyCap <= 0 ? dailyCap : cfg.dailyCap);
  }

  private void loadPointGainConfig() {
    try {
      Files.createDirectories(BASE_DIR);
      SkillPointGainConfig defaults = config == null ? new SkillPointGainConfig() : config.pointGains;
      if (defaults == null) defaults = new SkillPointGainConfig();
      if (Files.notExists(POINTS_YML_PATH)) {
        FileWriteUtil.writeStringAtomic(POINTS_YML_PATH, pointGainsYaml(defaults));
      }
      String raw = Files.readString(POINTS_YML_PATH, StandardCharsets.UTF_8);
      SkillPointGainConfig loaded = parsePointGainsYaml(raw);
      if (config == null) config = defaults();
      config.pointGains = loaded == null ? defaults : loaded;
      ensureConfigDefaults(config);
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load skill-points.yml, using defaults: {}", e.getMessage());
      if (config == null) config = defaults();
      if (config.pointGains == null) config.pointGains = new SkillPointGainConfig();
      ensureConfigDefaults(config);
    }
  }

  private String pointGainsYaml(SkillPointGainConfig cfg) {
    StringBuilder out = new StringBuilder();
    out.append("skillPoints:\n");
    SkillUiConfig ui = config == null || config.ui == null ? new SkillUiConfig() : config.ui;
    out.append("  messages:\n");
    out.append("    pointGainMessagesEnabled: ").append(ui.pointGainMessagesEnabled).append("\n");
    out.append("    pointGain: \"").append(escapeYaml(safe(ui.chatPointGain))).append("\"\n");
    out.append("  chanceOutOf: ").append(Math.max(1, cfg.chanceOutOf)).append("\n");
    out.append("  catchesPerPoint: ").append(Math.max(1, cfg.catchesPerPoint)).append("\n");
    out.append("  quizWinsPerPoint: ").append(Math.max(1, cfg.quizWinsPerPoint)).append("\n");
    out.append("  dailyClaimsPerPoint: ").append(Math.max(1, cfg.dailyClaimsPerPoint)).append("\n");
    out.append("  shinyBonusPoints: ").append(Math.max(0, cfg.shinyBonusPoints)).append("\n");
    out.append("  legendaryBonusPoints: ").append(Math.max(0, cfg.legendaryBonusPoints)).append("\n");
    out.append("  globalChanceDailyCap: ").append(Math.max(0, cfg.globalChanceDailyCap)).append("\n");
    appendChanceBlock(out, "captureChance", cfg.captureChance);
    appendChanceBlock(out, "shinyCaptureChance", cfg.shinyCaptureChance);
    appendChanceBlock(out, "legendaryCaptureChance", cfg.legendaryCaptureChance);
    appendChanceBlock(out, "miningOreChance", cfg.miningOreChance);
    appendChanceBlock(out, "mobKillChance", cfg.mobKillChance);
    appendChanceBlock(out, "quizWinChance", cfg.quizWinChance);
    appendChanceBlock(out, "dailyClaimChance", cfg.dailyClaimChance);
    return out.toString();
  }

  private void appendChanceBlock(StringBuilder out, String key, ChanceSourceConfig cfg) {
    ChanceSourceConfig source = cfg == null ? new ChanceSourceConfig() : cfg;
    out.append("  ").append(key).append(":\n");
    out.append("    enabled: ").append(source.enabled).append("\n");
    out.append("    chancePercent: ").append(source.chancePercent).append("\n");
    out.append("    pointsMin: ").append(Math.max(1, source.pointsMin)).append("\n");
    out.append("    pointsMax: ").append(Math.max(Math.max(1, source.pointsMin), source.pointsMax)).append("\n");
    out.append("    dailyCap: ").append(Math.max(0, source.dailyCap)).append("\n");
  }

  private SkillPointGainConfig parsePointGainsYaml(String raw) {
    SkillPointGainConfig cfg = new SkillPointGainConfig();
    if (raw == null || raw.isBlank()) return cfg;
    String[] lines = raw.split("\\r?\\n");
    boolean inRoot = false;
    int rootIndent = -1;
    for (int i = 0; i < lines.length; i++) {
      String line = lines[i];
      String trimmed = line.trim();
      if (!inRoot) {
        if (trimmed.equals("skillPoints:")) {
          inRoot = true;
          rootIndent = indentCount(line);
        }
        continue;
      }
      if (trimmed.isBlank()) continue;
      int indent = indentCount(line);
      if (indent <= rootIndent) break;
      if (indent == rootIndent + 2 && trimmed.equals("messages:")) {
        i = parsePointMessagesBlock(lines, i + 1, rootIndent + 2);
      } else
      if (indent == rootIndent + 2 && trimmed.startsWith("chanceOutOf:")) {
        cfg.chanceOutOf = parseIntValue(trimmed, "chanceOutOf", cfg.chanceOutOf);
      } else
      if (indent == rootIndent + 2 && trimmed.startsWith("catchesPerPoint:")) {
        cfg.catchesPerPoint = parseIntValue(trimmed, "catchesPerPoint", cfg.catchesPerPoint);
      } else if (indent == rootIndent + 2 && trimmed.startsWith("quizWinsPerPoint:")) {
        cfg.quizWinsPerPoint = parseIntValue(trimmed, "quizWinsPerPoint", cfg.quizWinsPerPoint);
      } else if (indent == rootIndent + 2 && trimmed.startsWith("dailyClaimsPerPoint:")) {
        cfg.dailyClaimsPerPoint = parseIntValue(trimmed, "dailyClaimsPerPoint", cfg.dailyClaimsPerPoint);
      } else if (indent == rootIndent + 2 && trimmed.startsWith("shinyBonusPoints:")) {
        cfg.shinyBonusPoints = parseIntValue(trimmed, "shinyBonusPoints", cfg.shinyBonusPoints);
      } else if (indent == rootIndent + 2 && trimmed.startsWith("legendaryBonusPoints:")) {
        cfg.legendaryBonusPoints = parseIntValue(trimmed, "legendaryBonusPoints", cfg.legendaryBonusPoints);
      } else if (indent == rootIndent + 2 && trimmed.startsWith("globalChanceDailyCap:")) {
        cfg.globalChanceDailyCap = parseIntValue(trimmed, "globalChanceDailyCap", cfg.globalChanceDailyCap);
      } else if (indent == rootIndent + 2 && trimmed.equals("captureChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.captureChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("shinyCaptureChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.shinyCaptureChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("legendaryCaptureChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.legendaryCaptureChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("miningOreChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.miningOreChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("mobKillChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.mobKillChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("quizWinChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.quizWinChance);
      } else if (indent == rootIndent + 2 && trimmed.equals("dailyClaimChance:")) {
        i = parseChanceBlock(lines, i + 1, rootIndent + 2, cfg.dailyClaimChance);
      }
    }
    return cfg;
  }

  private int parsePointMessagesBlock(String[] lines, int start, int parentIndent) {
    int i = Math.max(0, start);
    SkillUiConfig ui = config == null ? new SkillUiConfig() : (config.ui == null ? new SkillUiConfig() : config.ui);
    for (; i < lines.length; i++) {
      String line = lines[i];
      String trimmed = line.trim();
      if (trimmed.isBlank()) continue;
      int indent = indentCount(line);
      if (indent <= parentIndent) break;
      if (trimmed.startsWith("pointGainMessagesEnabled:")) {
        ui.pointGainMessagesEnabled = parseBoolean(cleanYamlScalar(trimmed.substring("pointGainMessagesEnabled:".length()).trim()), ui.pointGainMessagesEnabled);
      } else if (trimmed.startsWith("pointGain:")) {
        ui.chatPointGain = cleanYamlScalar(trimmed.substring("pointGain:".length()).trim());
      }
    }
    if (config != null) config.ui = ui;
    return Math.max(start - 1, i - 1);
  }

  private int parseChanceBlock(String[] lines, int start, int parentIndent, ChanceSourceConfig target) {
    if (target == null) return Math.max(start - 1, 0);
    int i = Math.max(0, start);
    for (; i < lines.length; i++) {
      String line = lines[i];
      String trimmed = line.trim();
      if (trimmed.isBlank()) continue;
      int indent = indentCount(line);
      if (indent <= parentIndent) break;
      if (trimmed.startsWith("enabled:")) {
        target.enabled = parseBoolean(cleanYamlScalar(trimmed.substring("enabled:".length()).trim()), target.enabled);
      } else if (trimmed.startsWith("chancePercent:")) {
        target.chancePercent = parseDouble(cleanYamlScalar(trimmed.substring("chancePercent:".length()).trim()), target.chancePercent);
      } else if (trimmed.startsWith("pointsMin:")) {
        target.pointsMin = parseInt(cleanYamlScalar(trimmed.substring("pointsMin:".length()).trim()), target.pointsMin);
      } else if (trimmed.startsWith("pointsMax:")) {
        target.pointsMax = parseInt(cleanYamlScalar(trimmed.substring("pointsMax:".length()).trim()), target.pointsMax);
      } else if (trimmed.startsWith("dailyCap:")) {
        target.dailyCap = parseInt(cleanYamlScalar(trimmed.substring("dailyCap:".length()).trim()), target.dailyCap);
      }
    }
    return Math.max(start - 1, i - 1);
  }

  private int parseIntValue(String trimmed, String key, int fallback) {
    String value = cleanYamlScalar(trimmed.substring((key + ":").length()).trim());
    return parseInt(value, fallback);
  }

  private int parseInt(String value, int fallback) {
    try {
      return Integer.parseInt(value);
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private double parseDouble(String value, double fallback) {
    try {
      return Double.parseDouble(value);
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private boolean parseBoolean(String value, boolean fallback) {
    if (value == null || value.isBlank()) return fallback;
    if ("true".equalsIgnoreCase(value)) return true;
    if ("false".equalsIgnoreCase(value)) return false;
    return fallback;
  }

  private void loadTooltipConfig() {
    try {
      Files.createDirectories(BASE_DIR);
      SkillTooltipConfig defaults = tooltipDefaults();
      if (Files.notExists(TOOLTIPS_YML_PATH)) {
        String yaml = "skillTooltips:\n"
          + "  titleUnlocked: \"" + escapeYaml(defaults.titleUnlocked) + "\"\n"
          + "  titleAvailable: \"" + escapeYaml(defaults.titleAvailable) + "\"\n"
          + "  titleLocked: \"" + escapeYaml(defaults.titleLocked) + "\"\n"
          + "  statusUnlockedText: \"" + escapeYaml(defaults.statusUnlockedText) + "\"\n"
          + "  statusAvailableText: \"" + escapeYaml(defaults.statusAvailableText) + "\"\n"
          + "  statusLockedText: \"" + escapeYaml(defaults.statusLockedText) + "\"\n"
          + "  requiresTemplate: \"" + escapeYaml(defaults.requiresTemplate) + "\"\n"
          + "  actionUnlockedText: \"" + escapeYaml(defaults.actionUnlockedText) + "\"\n"
          + "  actionAvailableText: \"" + escapeYaml(defaults.actionAvailableText) + "\"\n"
          + "  actionLockedText: \"" + escapeYaml(defaults.actionLockedText) + "\"\n"
          + "  lore:\n" + yamlLines(defaults.lore);
        FileWriteUtil.writeStringAtomic(TOOLTIPS_YML_PATH, yaml);
      }
      String raw = Files.readString(TOOLTIPS_YML_PATH, StandardCharsets.UTF_8);
      SkillTooltipConfig loaded = tooltipDefaults();
      String titleUnlocked = valueForKey(raw, "titleUnlocked");
      if (titleUnlocked != null) loaded.titleUnlocked = titleUnlocked;
      String titleAvailable = valueForKey(raw, "titleAvailable");
      if (titleAvailable != null) loaded.titleAvailable = titleAvailable;
      String titleLocked = valueForKey(raw, "titleLocked");
      if (titleLocked != null) loaded.titleLocked = titleLocked;
      String statusUnlockedText = valueForKey(raw, "statusUnlockedText");
      if (statusUnlockedText != null) loaded.statusUnlockedText = statusUnlockedText;
      String statusAvailableText = valueForKey(raw, "statusAvailableText");
      if (statusAvailableText != null) loaded.statusAvailableText = statusAvailableText;
      String statusLockedText = valueForKey(raw, "statusLockedText");
      if (statusLockedText != null) loaded.statusLockedText = statusLockedText;
      String requiresTemplate = valueForKey(raw, "requiresTemplate");
      if (requiresTemplate != null) loaded.requiresTemplate = requiresTemplate;
      String actionUnlockedText = valueForKey(raw, "actionUnlockedText");
      if (actionUnlockedText != null) loaded.actionUnlockedText = actionUnlockedText;
      String actionAvailableText = valueForKey(raw, "actionAvailableText");
      if (actionAvailableText != null) loaded.actionAvailableText = actionAvailableText;
      String actionLockedText = valueForKey(raw, "actionLockedText");
      if (actionLockedText != null) loaded.actionLockedText = actionLockedText;
      List<String> lore = listForKey(raw, "lore");
      if (!lore.isEmpty()) loaded.lore = lore;
      if (loaded.lore == null || loaded.lore.isEmpty()) loaded.lore = tooltipDefaults().lore;
      this.tooltipConfig = loaded;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load skill-tooltips.yml, using defaults: {}", e.getMessage());
      this.tooltipConfig = tooltipDefaults();
    }
  }

  private String yamlLines(List<String> lines) {
    StringBuilder builder = new StringBuilder();
    for (String line : lines) {
      builder.append("    - \"").append(escapeYaml(line)).append("\"\n");
    }
    return builder.toString();
  }

  private String escapeYaml(String value) {
    if (value == null) return "";
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n");
  }

  private String valueForKey(String raw, String key) {
    String[] lines = raw.split("\\r?\\n");
    String prefix = key + ":";
    for (String line : lines) {
      String trimmed = line.trim();
      if (!trimmed.startsWith(prefix)) continue;
      String value = trimmed.substring(prefix.length()).trim();
      return cleanYamlScalar(value);
    }
    return null;
  }

  private List<String> listForKey(String raw, String key) {
    List<String> out = new ArrayList<>();
    String[] lines = raw.split("\\r?\\n");
    boolean inList = false;
    int listIndent = -1;
    for (String line : lines) {
      String trimmed = line.trim();
      if (!inList) {
        if (trimmed.equals(key + ":")) {
          inList = true;
          listIndent = indentCount(line);
        }
        continue;
      }
      if (trimmed.isEmpty()) continue;
      int indent = indentCount(line);
      if (indent <= listIndent) break;
      if (!trimmed.startsWith("-")) continue;
      String value = trimmed.substring(1).trim();
      out.add(cleanYamlScalar(value));
    }
    return out;
  }

  private int indentCount(String line) {
    int i = 0;
    while (i < line.length() && Character.isWhitespace(line.charAt(i))) i++;
    return i;
  }

  private String cleanYamlScalar(String value) {
    if (value == null) return "";
    String out = value.trim();
    if ((out.startsWith("\"") && out.endsWith("\"")) || (out.startsWith("'") && out.endsWith("'"))) {
      out = out.substring(1, out.length() - 1);
    }
    return out
      .replace("\\n", "\n")
      .replace("\\\"", "\"")
      .replace("\\\\", "\\");
  }

  private ArrayList<SkillNode> generateLaneNodes(SkillTreeConfig cfg) {
    ArrayList<SkillNode> out = new ArrayList<>();
    int max = Math.max(10, cfg.maxLevelPerDirection);
    int majorEvery = Math.max(2, cfg.majorNodeEvery);
    for (SkillCategory category : cfg.categories) {
      if (category == null) continue;
      String lane = normalize(category.id);
      if (lane.isBlank()) continue;
      for (int level = 1; level <= max; level++) {
        boolean major = (level % majorEvery) == 0;
        String id = lane + "_" + String.format(java.util.Locale.ROOT, "%03d", level);
        String previous = level <= 1 ? "" : lane + "_" + String.format(java.util.Locale.ROOT, "%03d", level - 1);
        List<String> requires = previous.isBlank() ? List.of() : List.of(previous);
        int decade = ((level - 1) / majorEvery) + 1;
        int step = ((level - 1) % majorEvery) + 1;

        SkillNode node = major
          ? laneMajorNode(id, lane, level, decade, requires)
          : laneMinorNode(id, lane, level, step, requires);
        addGeneratedRewards(node, lane, level, step, major);
        node.iconItemId = laneIcon(lane, major, level);
        out.add(node);
      }
    }
    return out;
  }

  private SkillNode laneMajorNode(String id, String lane, int level, int decade, List<String> requires) {
    int cost = Math.min(6, 2 + decade);
    if ("recon".equals(lane)) {
      return progressNode(id, laneMajorName(lane, level),
        laneMajorDescription(lane, level), cost, lane, "quiz_wins", "flat", 2, requires);
    }
    if ("survival".equals(lane)) {
      return perkNode(id, laneMajorName(lane, level),
        laneMajorDescription(lane, level), cost, lane, "fishing_good_loot", "percent", 6, requires);
    }
    if ("tactics".equals(lane)) {
      return progressNode(id, laneMajorName(lane, level),
        laneMajorDescription(lane, level), cost, lane, "catches", "flat", 2, requires);
    }
    return perkNode(id, laneMajorName(lane, level),
      laneMajorDescription(lane, level), cost, lane, "cobblemon_first_try_catch", "percent", 3, requires);
  }

  private SkillNode laneMinorNode(String id, String lane, int level, int step, List<String> requires) {
    int cost = 1 + ((level - 1) / 30);
    String name = laneMinorName(lane, level, step);
    String description = laneMinorDescription(lane, level, step);
    if ("recon".equals(lane)) {
      return switch (step % 4) {
        case 1 -> progressNode(id, name, description, cost, lane, "quiz_wins", "percent", 1, requires);
        case 2 -> statusNode(id, name, description, cost, lane, "minecraft:night_vision", 0, requires);
        case 3 -> progressNode(id, name, description, cost, lane, "quiz_wins", "flat", 1, requires);
        default -> progressNode(id, name, description, cost, lane, "catches", "percent", 1, requires);
      };
    }
    if ("survival".equals(lane)) {
      return switch (step % 4) {
        case 1 -> progressNode(id, name, description, cost, lane, "catches", "percent", 1, requires);
        case 2 -> statusNode(id, name, description, cost, lane, "minecraft:water_breathing", 0, requires);
        case 3 -> perkNode(id, name, description, cost, lane, "fishing_good_loot", "percent", 1, requires);
        default -> statusNode(id, name, description, cost, lane, "minecraft:fire_resistance", 0, requires);
      };
    }
    if ("tactics".equals(lane)) {
      return switch (step % 4) {
        case 1 -> progressNode(id, name, description, cost, lane, "catches", "percent", 1, requires);
        case 2 -> progressNode(id, name, description, cost, lane, "quiz_wins", "percent", 1, requires);
        case 3 -> statusNode(id, name, description, cost, lane, "minecraft:haste", 0, requires);
        default -> progressNode(id, name, description, cost, lane, "catches", "flat", 1, requires);
      };
    }
    return switch (step % 4) {
      case 1 -> progressNode(id, name, description, cost, lane, "catches", "percent", 1, requires);
      case 2 -> perkNode(id, name, description, cost, lane, "cobblemon_first_try_catch", "percent", 1, requires);
      case 3 -> statusNode(id, name, description, cost, lane, "minecraft:luck", 0, requires);
      default -> progressNode(id, name, description, cost, lane, "quiz_wins", "percent", 1, requires);
    };
  }

  private String laneIcon(String lane, boolean major, int level) {
    int cycle = Math.floorMod(level - 1, 20);
    int majorCycle = Math.floorMod((level - 1) / 10, 10);
    return switch (lane) {
      case "recon" -> major
        ? iconPickGroup(new String[][]{
        {"cobblemon:ultra_ball", "minecraft:ender_eye"},
        {"cobblemon:timer_ball", "minecraft:clock"},
        {"cobblemon:quick_ball", "minecraft:compass"},
        {"cobblemon:dusk_ball", "minecraft:spyglass"},
        {"waystones:warp_scroll", "minecraft:map"},
        {"cobblemon:luxury_ball", "minecraft:gold_ingot"},
        {"cobblemon:exp_candy_l", "minecraft:experience_bottle"},
        {"cobblemon:rare_candy", "minecraft:diamond"},
        {"cobblemon:premier_ball", "minecraft:paper"},
        {"cobblemon:dive_ball", "minecraft:heart_of_the_sea"}
      }, majorCycle, "minecraft:ender_eye")
        : iconPickGroup(new String[][]{
        {"cobblemon:poke_ball", "minecraft:snowball"},
        {"minecraft:spyglass", "minecraft:compass"},
        {"cobblemon:great_ball", "minecraft:lapis_lazuli"},
        {"minecraft:map", "minecraft:paper"},
        {"cobblemon:quick_ball", "minecraft:clock"},
        {"minecraft:book", "minecraft:writable_book"},
        {"cobblemon:dusk_ball", "minecraft:black_dye"},
        {"waystones:blank_scroll", "minecraft:paper"},
        {"cobblemon:exp_candy_s", "minecraft:experience_bottle"},
        {"cobbledgacha:gacha_coin", "minecraft:gold_nugget"},
        {"cobblemon:premier_ball", "minecraft:white_dye"},
        {"minecraft:compass", "minecraft:recovery_compass"},
        {"cobblemon:lure_ball", "minecraft:prismarine_shard"},
        {"minecraft:cartography_table", "minecraft:oak_sign"},
        {"cobblemon:friend_ball", "minecraft:emerald"},
        {"minecraft:amethyst_shard", "minecraft:glass_bottle"},
        {"cobblemon:level_ball", "minecraft:copper_ingot"},
        {"minecraft:lantern", "minecraft:torch"},
        {"cobblemon:net_ball", "minecraft:string"},
        {"minecraft:ender_pearl", "minecraft:ender_eye"}
      }, cycle, "minecraft:spyglass");
      case "survival" -> major
        ? iconPickGroup(new String[][]{
        {"cobblemon:rare_candy", "minecraft:totem_of_undying"},
        {"cobblemon:sitrus_berry", "minecraft:golden_carrot"},
        {"cobblemon:lum_berry", "minecraft:golden_apple"},
        {"cobblemon:heal_ball", "minecraft:pink_dye"},
        {"cobblemon:dive_ball", "minecraft:water_bucket"},
        {"cobblemon:heavy_ball", "minecraft:anvil"},
        {"cobblemon:exp_candy_l", "minecraft:experience_bottle"},
        {"waystones:attuned_shard", "minecraft:ender_pearl"},
        {"cobblemon:leppa_berry", "minecraft:beetroot_soup"},
        {"cobblemon:nest_ball", "minecraft:oak_sapling"}
      }, majorCycle, "minecraft:totem_of_undying")
        : iconPickGroup(new String[][]{
        {"minecraft:fishing_rod", "minecraft:salmon"},
        {"cobblemon:oran_berry", "minecraft:sweet_berries"},
        {"minecraft:rabbit_foot", "minecraft:leather"},
        {"cobblemon:sitrus_berry", "minecraft:golden_carrot"},
        {"minecraft:bread", "minecraft:baked_potato"},
        {"cobblemon:cheri_berry", "minecraft:red_dye"},
        {"minecraft:campfire", "minecraft:coal"},
        {"cobblemon:rawst_berry", "minecraft:orange_dye"},
        {"minecraft:water_bucket", "minecraft:kelp"},
        {"cobblemon:aspear_berry", "minecraft:light_blue_dye"},
        {"minecraft:shield", "minecraft:iron_ingot"},
        {"cobblemon:pecha_berry", "minecraft:pink_dye"},
        {"minecraft:leather", "minecraft:rabbit_hide"},
        {"cobblemon:chesto_berry", "minecraft:blue_dye"},
        {"minecraft:cooked_beef", "minecraft:cooked_mutton"},
        {"cobblemon:persim_berry", "minecraft:purple_dye"},
        {"minecraft:salmon", "minecraft:cod"},
        {"cobblemon:lum_berry", "minecraft:glow_berries"},
        {"minecraft:torch", "minecraft:lantern"},
        {"cobblemon:heal_ball", "minecraft:potion"}
      }, cycle, "minecraft:rabbit_foot");
      case "tactics" -> major
        ? iconPickGroup(new String[][]{
        {"tmcraft:egg_swordsdance", "minecraft:enchanted_book"},
        {"tmcraft:egg_dragondance", "minecraft:netherite_scrap"},
        {"cobblemon:exp_candy_l", "minecraft:experience_bottle"},
        {"cobblemon:pp_up", "minecraft:amethyst_shard"},
        {"minecraft:crossbow", "minecraft:bow"},
        {"cobblemon:ultra_ball", "minecraft:ender_pearl"},
        {"minecraft:comparator", "minecraft:repeater"},
        {"cobblemon:level_ball", "minecraft:copper_ingot"},
        {"cobblemon:master_ball", "minecraft:nether_star"},
        {"minecraft:redstone_block", "minecraft:redstone"}
      }, majorCycle, "minecraft:crossbow")
        : iconPickGroup(new String[][]{
        {"minecraft:clock", "minecraft:compass"},
        {"cobblemon:great_ball", "minecraft:lapis_lazuli"},
        {"minecraft:comparator", "minecraft:repeater"},
        {"cobblemon:timer_ball", "minecraft:clock"},
        {"minecraft:redstone", "minecraft:copper_ingot"},
        {"cobblemon:exp_candy_s", "minecraft:experience_bottle"},
        {"minecraft:target", "minecraft:oak_button"},
        {"tmcraft:copper_blank_disc", "minecraft:iron_nugget"},
        {"minecraft:feather", "minecraft:paper"},
        {"cobblemon:quick_ball", "minecraft:yellow_dye"},
        {"minecraft:book", "minecraft:writable_book"},
        {"cobblemon:friend_ball", "minecraft:emerald"},
        {"minecraft:spyglass", "minecraft:glass_pane"},
        {"cobblemon:lure_ball", "minecraft:prismarine_shard"},
        {"minecraft:chainmail_chestplate", "minecraft:iron_chestplate"},
        {"cobblemon:dusk_ball", "minecraft:black_dye"},
        {"minecraft:crossbow", "minecraft:bow"},
        {"cobblemon:heavy_ball", "minecraft:anvil"},
        {"minecraft:flint", "minecraft:arrow"},
        {"cobblemon:poke_ball", "minecraft:snowball"}
      }, cycle, "minecraft:clock");
      case "creature_ops" -> major
        ? iconPickGroup(new String[][]{
        {"cobblemon:master_ball", "minecraft:nether_star"},
        {"cobblemon:ultra_ball", "minecraft:ender_pearl"},
        {"cobblemon:rare_candy", "minecraft:diamond"},
        {"cobblemon:pp_up", "minecraft:amethyst_shard"},
        {"cobbledgacha:gacha_ball_1", "minecraft:echo_shard"},
        {"cobblemon:luxury_ball", "minecraft:gold_ingot"},
        {"cobblemon:timer_ball", "minecraft:clock"},
        {"cobblemon:heal_ball", "minecraft:pink_dye"},
        {"cobblemon:beast_ball", "minecraft:ender_eye"},
        {"cobblemon:friend_ball", "minecraft:emerald"}
      }, majorCycle, "minecraft:nether_star")
        : iconPickGroup(new String[][]{
        {"cobblemon:poke_ball", "minecraft:snowball"},
        {"minecraft:lead", "minecraft:string"},
        {"cobblemon:great_ball", "minecraft:lapis_lazuli"},
        {"minecraft:name_tag", "minecraft:paper"},
        {"cobblemon:ultra_ball", "minecraft:ender_pearl"},
        {"minecraft:book", "minecraft:writable_book"},
        {"cobblemon:premier_ball", "minecraft:white_dye"},
        {"minecraft:gold_nugget", "minecraft:iron_nugget"},
        {"cobblemon:dusk_ball", "minecraft:black_dye"},
        {"minecraft:amethyst_shard", "minecraft:quartz"},
        {"cobblemon:quick_ball", "minecraft:yellow_dye"},
        {"cobbledgacha:gacha_coin", "minecraft:gold_nugget"},
        {"cobblemon:friend_ball", "minecraft:emerald"},
        {"minecraft:ender_pearl", "minecraft:eye_armor_trim_smithing_template"},
        {"cobblemon:net_ball", "minecraft:string"},
        {"minecraft:clock", "minecraft:compass"},
        {"cobblemon:nest_ball", "minecraft:oak_sapling"},
        {"minecraft:feather", "minecraft:phantom_membrane"},
        {"cobblemon:exp_candy_s", "minecraft:experience_bottle"},
        {"minecraft:nautilus_shell", "minecraft:prismarine_crystals"}
      }, cycle, "minecraft:lead");
      default -> "minecraft:book";
    };
  }

  private String iconPickGroup(String[][] groups, int index, String fallback) {
    if (groups == null || groups.length == 0) return fallback;
    int idx = Math.floorMod(index, groups.length);
    String[] candidates = groups[idx];
    if (candidates != null) {
      for (String raw : candidates) {
        Identifier id = Identifier.tryParse(safe(raw));
        if (id != null && Registries.ITEM.containsId(id)) {
          return id.toString();
        }
      }
    }
    Identifier fallbackId = Identifier.tryParse(safe(fallback));
    if (fallbackId != null && Registries.ITEM.containsId(fallbackId)) {
      return fallbackId.toString();
    }
    return "minecraft:book";
  }

  private String laneMinorName(String lane, int level, int step) {
    String roman = toRoman(level);
    int variant = Math.max(1, Math.floorMod(step - 1, 4) + 1);
    return switch (lane) {
      case "recon" -> switch (variant) {
        case 1 -> "Signal Scan " + roman;
        case 2 -> "Survey Discipline " + roman;
        case 3 -> "Intel Routing " + roman;
        default -> "Trail Mapping " + roman;
      };
      case "survival" -> switch (variant) {
        case 1 -> "Fieldcraft " + roman;
        case 2 -> "Harsh Weathering " + roman;
        case 3 -> "Forager's Routine " + roman;
        default -> "Camp Protocol " + roman;
      };
      case "tactics" -> switch (variant) {
        case 1 -> "Battle Plan " + roman;
        case 2 -> "Pressure Cycle " + roman;
        case 3 -> "Tempo Control " + roman;
        default -> "Counterline " + roman;
      };
      case "creature_ops" -> switch (variant) {
        case 1 -> "Capture Method " + roman;
        case 2 -> "Charm Timing " + roman;
        case 3 -> "Containment Prep " + roman;
        default -> "Bond Handling " + roman;
      };
      default -> capitalize(lane) + " " + roman;
    };
  }

  private String laneMinorDescription(String lane, int level, int step) {
    int variant = Math.max(1, Math.floorMod(step - 1, 4) + 1);
    return switch (lane) {
      case "recon" -> switch (variant) {
        case 1 -> "+1% quiz mission progress per correct quiz answer.";
        case 2 -> "Grants Night Vision I while online.";
        case 3 -> "+1 flat quiz mission progress per correct quiz answer.";
        default -> "+1% catch mission progress from scouting prep.";
      };
      case "survival" -> switch (variant) {
        case 1 -> "+1% catch mission progress while leveling this lane.";
        case 2 -> "Grants Water Breathing I while online.";
        case 3 -> "+1% better chance at valuable fishing loot.";
        default -> "Grants Fire Resistance I while online.";
      };
      case "tactics" -> switch (variant) {
        case 1 -> "+1% catch mission progress from tactical routing.";
        case 2 -> "+1% quiz mission progress from tactical analysis.";
        case 3 -> "Grants Haste I while online.";
        default -> "+1 flat catch mission progress per sample.";
      };
      case "creature_ops" -> switch (variant) {
        case 1 -> "+1% catch mission progress for creature handling.";
        case 2 -> "+1% first-throw catch chance in Cobblemon encounters.";
        case 3 -> "Grants Luck I while online.";
        default -> "+1% quiz mission progress from field study.";
      };
      default -> "Minor skill improvement.";
    };
  }

  private String laneMajorName(String lane, int level) {
    String roman = toRoman(level);
    return switch (lane) {
      case "recon" -> "Recon Breakpoint " + roman;
      case "survival" -> "Survival Breakpoint " + roman;
      case "tactics" -> "Tactics Breakpoint " + roman;
      case "creature_ops" -> "Creature Ops Breakpoint " + roman;
      default -> capitalize(lane) + " Breakpoint " + roman;
    };
  }

  private String laneMajorDescription(String lane, int level) {
    return switch (lane) {
      case "recon" -> "Major node: +2 flat quiz mission progress per correct quiz answer.";
      case "survival" -> "Major node: +6% chance at valuable fishing loot.";
      case "tactics" -> "Major node: +2 flat catch mission progress per sample.";
      case "creature_ops" -> "Major node: +3% first-throw catch chance in Cobblemon encounters.";
      default -> "Major skill breakpoint upgrade.";
    };
  }

  private void addGeneratedRewards(SkillNode node, String lane, int level, int step, boolean major) {
    if (node == null) return;
    node.oneTimeRewards = new ArrayList<>();
    if ("recon".equals(lane)) {
      if (major) {
        node.oneTimeRewards.add(rewardGrant(1, "waystones:warp_stone", "waystones:warp_scroll", "minecraft:ender_pearl"));
        node.oneTimeRewards.add(rewardGrant(8, "cobbledgacha:gacha_coin", "pokeblocks:poke_coin", "minecraft:gold_nugget"));
      } else if (step % 2 == 0) {
        node.oneTimeRewards.add(rewardGrant(1, "waystones:blank_scroll", "minecraft:map"));
      } else {
        node.oneTimeRewards.add(rewardGrant(3, "cobbledgacha:gacha_coin", "pokeblocks:poke_coin", "minecraft:gold_nugget"));
      }
    } else if ("survival".equals(lane)) {
      if (major) {
        node.oneTimeRewards.add(rewardGrant(2, "waystones:attuned_shard", "waystones:warp_dust", "minecraft:ender_pearl"));
        node.oneTimeRewards.add(rewardGrant(12, "cobblemon:oran_berry", "minecraft:cooked_beef"));
      } else if (step % 2 == 0) {
        node.oneTimeRewards.add(rewardGrant(4, "cobblemon:sitrus_berry", "cobblemon:oran_berry", "minecraft:bread"));
      } else {
        node.oneTimeRewards.add(rewardGrant(2, "waystones:warp_dust", "minecraft:ender_pearl"));
      }
    } else if ("tactics".equals(lane)) {
      if (major) {
        node.oneTimeRewards.add(rewardGrant(1, "tmcraft:egg_swordsdance", "tmcraft:egg_dragondance", "minecraft:enchanted_book"));
        node.oneTimeRewards.add(rewardGrant(6, "cobblemon:exp_candy_m", "cobblemon:exp_candy_s", "minecraft:experience_bottle"));
      } else if (step % 2 == 0) {
        node.oneTimeRewards.add(rewardGrant(2, "cobblemon:exp_candy_s", "minecraft:experience_bottle"));
      } else {
        node.oneTimeRewards.add(rewardGrant(1, "tmcraft:copper_blank_disc", "minecraft:book"));
      }
    } else {
      if (major) {
        node.oneTimeRewards.add(rewardGrant(10, "cobblemon:ultra_ball", "cobblemon:great_ball", "cobblemon:poke_ball"));
        node.oneTimeRewards.add(rewardGrant(2, "cobbledgacha:gacha_ball_1", "cobbledgacha:rocket_ball", "minecraft:ender_pearl"));
      } else if (step % 2 == 0) {
        node.oneTimeRewards.add(rewardGrant(4, "cobblemon:great_ball", "cobblemon:poke_ball"));
      } else {
        node.oneTimeRewards.add(rewardGrant(1, "cobbledgacha:gacha_coin", "pokeblocks:dime", "minecraft:gold_nugget"));
      }
    }
    if (major && level % 20 == 0) {
      node.oneTimeRewards.add(rewardGrant(1, "cobblemon:rare_candy", "cobblemon:pp_up", "minecraft:diamond"));
    } else if (level % 5 == 0) {
      node.oneTimeRewards.add(rewardGrant(1, "cobblemon:exp_candy_m", "cobblemon:exp_candy_s", "minecraft:experience_bottle"));
    }
  }

  private RewardGrant rewardGrant(int count, String... candidates) {
    RewardGrant reward = new RewardGrant();
    reward.count = Math.max(1, count);
    reward.itemIds = new ArrayList<>();
    if (candidates != null) {
      for (String candidate : candidates) {
        String id = safe(candidate);
        if (!id.isBlank()) reward.itemIds.add(id);
      }
    }
    reward.itemId = reward.itemIds.isEmpty() ? "" : reward.itemIds.get(0);
    return reward;
  }

  private String toRoman(int number) {
    int value = Math.max(1, number);
    int[] nums = {1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1};
    String[] romans = {"M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"};
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < nums.length; i++) {
      while (value >= nums[i]) {
        out.append(romans[i]);
        value -= nums[i];
      }
    }
    return out.toString();
  }

  private void awardMilestonePoints(UUID uuid, int catches, int quizWins, int dailyClaims, ServerPlayerEntity player) {
    if (uuid == null) return;
    PlayerSkillState state = state(uuid);
    int granted = 0;
    if (catches > 0) {
      state.catchesTracked += catches;
      int every = Math.max(1, config.pointGains.catchesPerPoint);
      int fromCatch = state.catchesTracked / every;
      if (fromCatch > 0) {
        granted += fromCatch;
        state.catchesTracked = state.catchesTracked % every;
      }
    }
    if (quizWins > 0) {
      state.quizWinsTracked += quizWins;
      int every = Math.max(1, config.pointGains.quizWinsPerPoint);
      int fromQuiz = state.quizWinsTracked / every;
      if (fromQuiz > 0) {
        granted += fromQuiz;
        state.quizWinsTracked = state.quizWinsTracked % every;
      }
    }
    if (dailyClaims > 0) {
      state.dailyClaimsTracked += dailyClaims;
      int every = Math.max(1, config.pointGains.dailyClaimsPerPoint);
      int fromClaim = state.dailyClaimsTracked / every;
      if (fromClaim > 0) {
        granted += fromClaim;
        state.dailyClaimsTracked = state.dailyClaimsTracked % every;
      }
    }
    if (granted > 0) {
      int spent = spentPoints(state);
      state.totalPoints = Math.max(spent, state.totalPoints + granted);
      state.points = Math.max(0, Math.min(state.totalPoints - spent, state.points + granted));
      save();
      notifyPointGain(player, granted, "milestone", state);
    }
  }

  private void awardChancePoints(UUID uuid, ServerPlayerEntity player, String sourceKey, ChanceSourceConfig sourceCfg) {
    if (uuid == null || sourceCfg == null || !sourceCfg.enabled) return;
    if (sourceCfg.chancePercent <= 0.0D) return;
    PlayerSkillState state = state(uuid);
    resetChanceDayIfNeeded(state);

    int globalCap = Math.max(0, config.pointGains.globalChanceDailyCap);
    int globalToday = chanceTotalToday(state);
    if (globalCap > 0 && globalToday >= globalCap) return;

    String source = normalize(sourceKey);
    int sourceToday = Math.max(0, state.chanceAwardedToday.getOrDefault(source, 0));
    int sourceCap = Math.max(0, sourceCfg.dailyCap);
    if (sourceCap > 0 && sourceToday >= sourceCap) return;

    double chanceOutOf = Math.max(1.0D, config.pointGains.chanceOutOf);
    double chancePercent = Math.max(0.0D, sourceCfg.chancePercent);
    chancePercent += eventChanceAddBySource.getOrDefault(source, 0.0D);
    chancePercent *= eventChanceMultiplierBySource.getOrDefault(source, 1.0D);
    chancePercent = Math.max(0.0D, Math.min(chanceOutOf, chancePercent));
    if (chancePercent <= 0.0D) return;

    double roll = ThreadLocalRandom.current().nextDouble(chanceOutOf);
    if (roll > chancePercent) return;

    int min = Math.max(1, sourceCfg.pointsMin);
    int max = Math.max(min, sourceCfg.pointsMax);
    int points = min == max
      ? min
      : ThreadLocalRandom.current().nextInt(min, max + 1);
    points += eventFlatPointsBySource.getOrDefault(source, 0);
    points = Math.max(0, points);
    if (points <= 0) return;

    int sourceRoom = sourceCap <= 0 ? Integer.MAX_VALUE : Math.max(0, sourceCap - sourceToday);
    int globalRoom = globalCap <= 0 ? Integer.MAX_VALUE : Math.max(0, globalCap - globalToday);
    int granted = Math.min(points, Math.min(sourceRoom, globalRoom));
    if (granted <= 0) return;

    addPoints(state, granted);
    state.chanceAwardedToday.put(source, sourceToday + granted);
    save();
    notifyPointGain(player, granted, source, state);
  }

  private void notifyPointGain(ServerPlayerEntity player, int points, String sourceKey, PlayerSkillState state) {
    if (player == null || points <= 0) return;
    SkillUiConfig ui = ui();
    if (ui == null || !ui.pointGainMessagesEnabled) return;
    String template = safe(ui.chatPointGain);
    if (template.isBlank()) return;
    String sourceId = normalize(sourceKey);
    String source = sourceDisplay(sourceId);
    int unused = state == null ? points(player.getUuid()) : availablePoints(state);
    String message = render(template, Map.of(
      "points", String.valueOf(points),
      "source", source,
      "sourceId", sourceId,
      "unusedPoints", String.valueOf(unused)
    ));
    player.sendMessage(Text.literal(message), false);
  }

  private String sourceDisplay(String sourceIdRaw) {
    String sourceId = normalize(sourceIdRaw);
    return switch (sourceId) {
      case "capture" -> "Pokemon Catch";
      case "shiny_capture" -> "Shiny Catch";
      case "legendary_capture" -> "Legendary Catch";
      case "capture_bonus" -> "Capture Bonus";
      case "quiz_win" -> "Quiz Win";
      case "daily_claim" -> "Daily Claim";
      case "mining_ore" -> "Mining Ore";
      case "mob_kill" -> "Mob Kill";
      case "milestone" -> "Milestone";
      default -> capitalize(sourceId.replace('_', ' '));
    };
  }

  private int chanceTotalToday(PlayerSkillState state) {
    if (state == null || state.chanceAwardedToday == null || state.chanceAwardedToday.isEmpty()) return 0;
    int total = 0;
    for (int value : state.chanceAwardedToday.values()) {
      total += Math.max(0, value);
    }
    return Math.max(0, total);
  }

  private void resetChanceDayIfNeeded(PlayerSkillState state) {
    if (state == null) return;
    long today = currentEpochDay();
    if (state.chanceDayEpoch == today) return;
    state.chanceDayEpoch = today;
    state.chanceAwardedToday = new HashMap<>();
  }

  private long currentEpochDay() {
    return java.time.LocalDate.now(java.time.ZoneOffset.UTC).toEpochDay();
  }

  private void addPoints(PlayerSkillState state, int points) {
    if (state == null || points <= 0) return;
    int spent = spentPoints(state);
    state.totalPoints = Math.max(spent, state.totalPoints + points);
    state.points = Math.max(0, Math.min(state.totalPoints - spent, state.points + points));
  }

  private float clamp(float value, float min, float max) {
    return Math.max(min, Math.min(max, value));
  }

  private void triggerMilestone(ServerPlayerEntity player, SkillNode unlockedNode) {
    if (player == null || unlockedNode == null || config == null || config.milestones == null) return;
    if (!config.milestones.enabled) return;
    int every = Math.max(1, config.milestones.everyNodes);
    PlayerSkillState state = state(player.getUuid());
    int lineUnlocked = unlockedInLine(state, unlockedNode.category);
    if (lineUnlocked <= 0 || (lineUnlocked % every) != 0) return;
    String lineName = categoryDisplayName(unlockedNode.category);
    Map<String, String> values = new HashMap<>();
    values.put("player", player.getName().getString());
    values.put("tier", String.valueOf(lineUnlocked));
    values.put("line", normalize(unlockedNode.category));
    values.put("lineName", lineName);

    sendTitle(player,
      render(config.milestones.titleText, values),
      render(config.milestones.subtitleText, values)
    );
    spawnMilestoneParticles(player);
    playMilestoneSound(player);

    String announcement = render(config.milestones.chatAnnouncement, values);
    MinecraftServer server = player.getServer();
    if (server != null) {
      for (ServerPlayerEntity online : server.getPlayerManager().getPlayerList()) {
        online.sendMessage(Text.literal(announcement), false);
      }
    } else {
      player.sendMessage(Text.literal(announcement), false);
    }
  }

  private int unlockedInLine(PlayerSkillState state, String categoryRaw) {
    String category = normalize(categoryRaw);
    int total = 0;
    for (String unlockedId : state.unlocked) {
      SkillNode node = nodeById(unlockedId);
      if (node == null) continue;
      if (normalize(node.category).equals(category)) {
        total++;
      }
    }
    return total;
  }

  private String categoryDisplayName(String categoryRaw) {
    String category = normalize(categoryRaw);
    for (SkillCategory c : config.categories) {
      if (c == null) continue;
      if (normalize(c.id).equals(category)) {
        String n = safe(c.name);
        return n.isBlank() ? capitalize(category) : n;
      }
    }
    return capitalize(category);
  }

  private void spawnMilestoneParticles(ServerPlayerEntity player) {
    Identifier id = Identifier.tryParse(safe(config.milestones.particleId));
    if (id == null || !Registries.PARTICLE_TYPE.containsId(id)) return;
    var particleType = Registries.PARTICLE_TYPE.get(id);
    if (!(particleType instanceof net.minecraft.particle.ParticleEffect effect)) return;
    player.getServerWorld().spawnParticles(
      effect,
      player.getX(),
      player.getBodyY(0.6D),
      player.getZ(),
      Math.max(1, config.milestones.particleCount),
      0.45D,
      0.65D,
      0.45D,
      0.01D
    );
  }

  private void playMilestoneSound(ServerPlayerEntity player) {
    Identifier id = Identifier.tryParse(safe(config.milestones.soundId));
    SoundEvent fallback = SoundEvents.ENTITY_PLAYER_LEVELUP;
    SoundEvent chosen = fallback;
    if (id != null && Registries.SOUND_EVENT.containsId(id)) {
      chosen = Registries.SOUND_EVENT.get(id);
    }
    player.playSoundToPlayer(
      chosen,
      SoundCategory.PLAYERS,
      config.milestones.soundVolume,
      config.milestones.soundPitch
    );
  }

  private void sendTitle(ServerPlayerEntity player, String titleText, String subtitleText) {
    Text title = Text.literal(safe(titleText));
    Text subtitle = Text.literal(safe(subtitleText));
    try {
      Class<?> fadeClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleFadeS2CPacket");
      Object fadePacket = fadeClass.getDeclaredConstructor(int.class, int.class, int.class)
        .newInstance(10, 50, 10);
      player.networkHandler.sendPacket((Packet<?>) fadePacket);
    } catch (Throwable ignored) {
    }
    try {
      Class<?> titleClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleS2CPacket");
      Object titlePacket = titleClass.getDeclaredConstructor(Text.class).newInstance(title);
      player.networkHandler.sendPacket((Packet<?>) titlePacket);
    } catch (Throwable ignored) {
    }
    try {
      Class<?> subtitleClass = Class.forName("net.minecraft.network.packet.s2c.play.SubtitleS2CPacket");
      Object subtitlePacket = subtitleClass.getDeclaredConstructor(Text.class).newInstance(subtitle);
      player.networkHandler.sendPacket((Packet<?>) subtitlePacket);
    } catch (Throwable ignored) {
    }
  }

  private String render(String template, Map<String, String> values) {
    return TemplateEngine.render(safe(template), values == null ? Map.of() : values);
  }

  public static final class SkillTreeConfig {
    public boolean enabled = true;
    public int startingPoints = 3;
    public int resetCostPoints = 3;
    public int tiersPerPage = 4;
    public int pageUnlockRequirement = 2;
    public boolean autoGenerateLanes = true;
    public int maxLevelPerDirection = 100;
    public int majorNodeEvery = 10;
    public List<SkillCategory> categories = new ArrayList<>();
    public List<SkillNode> nodes = new ArrayList<>();
    public SkillUiConfig ui = new SkillUiConfig();
    public SkillMilestoneConfig milestones = new SkillMilestoneConfig();
    public SkillPointGainConfig pointGains = new SkillPointGainConfig();
  }

  public static final class SkillUiConfig {
    public String nodeTitleUnlockedColor = "&a";
    public String nodeTitleAvailableColor = "&e";
    public String nodeTitleLockedColor = "&c";
    public String nodeMetaColor = "&7";
    public String nodeDescColor = "&8";
    public String nodeHintColor = "&e";
    public String nodeRequirementColor = "&c";
    public String nodeStatusUnlocked = "Unlocked";
    public String nodeStatusAvailable = "Available";
    public String nodeStatusLocked = "Locked";
    public String chatUnlockSuccess = "&aUnlocked {nodeName}&7. Remaining points: &f{points}&7.";
    public String chatResetSuccess = "&eSkills reset. Points available: &f{points}&e.";
    public String chatResetNeedPoints = "&cNeed &f{cost} &cunused points to reset. Current: &f{points}&c.";
    public boolean pointGainMessagesEnabled = true;
    public String chatPointGain = "&b+{points} Skill Point(s) &7from &f{source}&7. Unused: &f{unusedPoints}";
  }

  public static final class SkillPointGainConfig {
    public int chanceOutOf = 300;
    public int catchesPerPoint = 25;
    public int quizWinsPerPoint = 3;
    public int dailyClaimsPerPoint = 1;
    public int shinyBonusPoints = 1;
    public int legendaryBonusPoints = 2;
    public int globalChanceDailyCap = 8;
    public ChanceSourceConfig captureChance = chance(4.0D, 1, 1, 3);
    public ChanceSourceConfig quizWinChance = chance(12.0D, 1, 2, 4);
    public ChanceSourceConfig dailyClaimChance = chance(15.0D, 1, 1, 1);
    public ChanceSourceConfig shinyCaptureChance = chance(35.0D, 1, 2, 3);
    public ChanceSourceConfig legendaryCaptureChance = chance(60.0D, 1, 3, 4);
    public ChanceSourceConfig miningOreChance = chance(3.0D, 1, 1, 2);
    public ChanceSourceConfig mobKillChance = chance(2.5D, 1, 1, 3);

    private static ChanceSourceConfig chance(double percent, int min, int max, int dailyCap) {
      ChanceSourceConfig cfg = new ChanceSourceConfig();
      cfg.enabled = true;
      cfg.chancePercent = percent;
      cfg.pointsMin = min;
      cfg.pointsMax = max;
      cfg.dailyCap = dailyCap;
      return cfg;
    }
  }

  public static final class ChanceSourceConfig {
    public boolean enabled = true;
    public double chancePercent = 0.0D;
    public int pointsMin = 1;
    public int pointsMax = 1;
    public int dailyCap = 0;
  }

  public static final class SkillMilestoneConfig {
    public boolean enabled = true;
    public int everyNodes = 10;
    public String titleText = "&bSkill Upgrade";
    public String subtitleText = "&7{lineName} Tier {tier}";
    public String chatAnnouncement = "&6{player}&e has achieved tier &f{tier} &eof &f{lineName}&e.";
    public String soundId = "minecraft:entity.player.levelup";
    public float soundVolume = 1.0F;
    public float soundPitch = 1.0F;
    public String particleId = "minecraft:totem_of_undying";
    public int particleCount = 24;
  }

  public static final class SkillTooltipConfig {
    public String titleUnlocked = "&a{nodeName}";
    public String titleAvailable = "&e{nodeName}";
    public String titleLocked = "&c{nodeName}";
    public String statusUnlockedText = "&aUnlocked";
    public String statusAvailableText = "&eAvailable";
    public String statusLockedText = "&cLocked";
    public String requiresTemplate = "&cRequires: &f{requires}";
    public String actionUnlockedText = "&aUnlocked";
    public String actionAvailableText = "&eClick to unlock";
    public String actionLockedText = "";
    public List<String> lore = new ArrayList<>();
  }

  public static final class SkillCategory {
    public String id = "recon";
    public String name = "Recon";
    public int row = 1;
    public String iconItemId = "minecraft:compass";
  }

  public static final class SkillNode {
    public String id = "recon_i";
    public String name = "Recon I";
    public String description = "";
    public String category = "recon";
    public int cost = 1;
    public List<String> requires = new ArrayList<>();
    public String effectType = "passive_status_effect";
    public String iconItemId = "";
    public String statusEffectId = "minecraft:night_vision";
    public String progressType = "";
    public String progressMode = "flat";
    public String perkType = "";
    public String perkMode = "percent";
    public double value = 0.0D;
    public int amplifier = 0;
    public boolean ambient = true;
    public boolean showParticles = false;
    public boolean showIcon = false;
    public List<RewardGrant> oneTimeRewards = new ArrayList<>();
    public List<String> onUnlockCommands = new ArrayList<>();
  }

  public static final class RewardGrant {
    public String itemId = "";
    public int count = 1;
    public List<String> itemIds = new ArrayList<>();
  }

  private static final class SkillDataStore {
    Map<String, PlayerSkillState> players = new HashMap<>();
  }

  private static final class PlayerSkillState {
    int points = 0;
    int totalPoints = 0;
    List<String> unlocked = new ArrayList<>();
    List<String> rewardedNodes = new ArrayList<>();
    int catchesTracked = 0;
    int quizWinsTracked = 0;
    int dailyClaimsTracked = 0;
    long chanceDayEpoch = -1L;
    Map<String, Integer> chanceAwardedToday = new HashMap<>();
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
