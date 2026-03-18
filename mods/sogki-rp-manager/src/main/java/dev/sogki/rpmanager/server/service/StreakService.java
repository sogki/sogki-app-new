package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.MutableText;
import net.minecraft.text.Style;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class StreakService {
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Type ROOT_TYPE = new TypeToken<Map<String, PlayerStreak>>() { }.getType();
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("streaks.json");

  private final Map<String, PlayerStreak> data = new HashMap<>();

  public void load() {
    try {
      if (Files.notExists(STORE_PATH)) return;
      String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
      Map<String, PlayerStreak> parsed = GSON.fromJson(raw, ROOT_TYPE);
      if (parsed != null) {
        data.clear();
        data.putAll(parsed);
      }
    } catch (Exception ignored) {
    }
  }

  public void save() {
    try {
      Files.createDirectories(STORE_PATH.getParent());
      Files.writeString(STORE_PATH, GSON.toJson(data, ROOT_TYPE), StandardCharsets.UTF_8);
    } catch (IOException ignored) {
    }
  }

  public void onJoin(ServerPlayerEntity player, ServerFeatureConfig config) {
    if (!config.streak.enabled || !config.streak.autoNotifyOnJoin) return;
    PlayerStreak streak = get(player.getUuid());
    long today = epochDayUtc();

    if (streak.lastSeenDay > 0 && today - streak.lastSeenDay > config.streak.graceDays + 1L) {
      streak.currentStreak = 0;
    }
    streak.lastSeenDay = today;
    save();

    boolean claimedToday = streak.lastClaimDay == today;
    String status = claimedToday ? config.messages.streakStatusClaimed : config.messages.streakStatusAvailable;
    Map<String, String> values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("streak", String.valueOf(streak.currentStreak));
    values.put("status", status);
    player.sendMessage(Text.literal(TemplateEngine.render(config.messages.streakJoinStatus, values)));
    if (!claimedToday) {
      MutableText click = Text.literal(TemplateEngine.render(config.messages.streakJoinClaimHint, values))
        .setStyle(Style.EMPTY
          .withColor(0x8CF0FF)
          .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/claim"))
          .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Run /claim"))));
      player.sendMessage(click);
    }
  }

  public ClaimResult claim(ServerPlayerEntity player, ServerFeatureConfig config) {
    if (!config.streak.enabled) return ClaimResult.error(config.messages.claimDisabled);
    PlayerStreak streak = get(player.getUuid());
    long today = epochDayUtc();

    if (streak.lastClaimDay == today) {
      return ClaimResult.error(config.messages.claimAlreadyClaimed);
    }

    if (streak.lastClaimDay <= 0) {
      streak.currentStreak = 1;
    } else if (today - streak.lastClaimDay > config.streak.graceDays + 1L) {
      streak.currentStreak = 1;
    } else {
      streak.currentStreak++;
    }
    streak.lastSeenDay = today;
    streak.lastClaimDay = today;

    ServerFeatureConfig.RewardRule reward = pickReward(config.streak.rewards, streak.currentStreak);
    Map<String, String> values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("day", String.valueOf(streak.currentStreak));
    if (reward == null) {
      save();
      return ClaimResult.success(TemplateEngine.render(config.messages.claimNoRewardRule, values));
    }
    List<ServerFeatureConfig.RewardItem> rewardItems = resolveRewardItems(reward);
    if (rewardItems.isEmpty()) {
      save();
      return ClaimResult.success(TemplateEngine.render(config.messages.claimNoRewardRule, values));
    }
    for (ServerFeatureConfig.RewardItem rewardItem : rewardItems) {
      grantRewardItem(player, rewardItem);
    }
    save();
    ServerFeatureConfig.RewardItem primary = rewardItems.get(0);
    values.put("label", primary.label == null ? "Reward" : primary.label);
    values.put("count", String.valueOf(Math.max(1, primary.count)));
    values.put("rewards", summarizeRewards(rewardItems));
    return ClaimResult.success(TemplateEngine.render(config.messages.claimSuccess, values));
  }

  public Text menuText(ServerPlayerEntity player, ServerFeatureConfig config) {
    PlayerStreak streak = get(player.getUuid());
    long today = epochDayUtc();
    boolean claimedToday = streak.lastClaimDay == today;
    Map<String, String> values = TemplateEngine.baseMap(player.getServer(), player, config.brand);
    values.put("streak", String.valueOf(streak.currentStreak));
    String line1 = TemplateEngine.render(config.messages.streakMenuTitle, values);
    String line2 = TemplateEngine.render(config.messages.streakMenuCurrent, values);
    String statusTemplate = claimedToday ? config.messages.streakMenuStatusClaimed : config.messages.streakMenuStatusAvailable;
    String line3 = TemplateEngine.render(statusTemplate, values);
    return Text.literal(line1 + "\n" + line2 + "\n" + line3);
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

  private List<ServerFeatureConfig.RewardItem> resolveRewardItems(ServerFeatureConfig.RewardRule reward) {
    List<ServerFeatureConfig.RewardItem> out = new ArrayList<>();
    if (reward.items != null) {
      for (ServerFeatureConfig.RewardItem item : reward.items) {
        if (item == null) continue;
        ServerFeatureConfig.RewardItem normalized = new ServerFeatureConfig.RewardItem();
        normalized.itemId = (item.itemId == null || item.itemId.isBlank()) ? "minecraft:experience_bottle" : item.itemId;
        normalized.count = Math.max(1, item.count);
        normalized.label = (item.label == null || item.label.isBlank()) ? normalized.itemId : item.label;
        out.add(normalized);
      }
    }
    if (!out.isEmpty()) return out;

    ServerFeatureConfig.RewardItem legacy = new ServerFeatureConfig.RewardItem();
    legacy.itemId = (reward.itemId == null || reward.itemId.isBlank()) ? "minecraft:experience_bottle" : reward.itemId;
    legacy.count = Math.max(1, reward.count);
    legacy.label = (reward.label == null || reward.label.isBlank()) ? legacy.itemId : reward.label;
    out.add(legacy);
    return out;
  }

  private String summarizeRewards(List<ServerFeatureConfig.RewardItem> items) {
    if (items == null || items.isEmpty()) return "Reward";
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < items.size(); i++) {
      ServerFeatureConfig.RewardItem item = items.get(i);
      if (item == null) continue;
      if (!builder.isEmpty()) builder.append(", ");
      String label = (item.label == null || item.label.isBlank()) ? item.itemId : item.label;
      builder.append(label == null ? "Reward" : label).append(" x").append(Math.max(1, item.count));
    }
    return builder.isEmpty() ? "Reward" : builder.toString();
  }

  private ServerFeatureConfig.RewardRule pickReward(List<ServerFeatureConfig.RewardRule> rules, int streakDay) {
    if (rules == null || rules.isEmpty()) return null;
    int maxDay = 1;
    for (ServerFeatureConfig.RewardRule rule : rules) {
      if (rule != null) maxDay = Math.max(maxDay, Math.max(1, rule.day));
    }
    int normalized = ((streakDay - 1) % maxDay) + 1;
    for (ServerFeatureConfig.RewardRule rule : rules) {
      if (rule != null && Math.max(1, rule.day) == normalized) return rule;
    }
    return rules.get(0);
  }

  private PlayerStreak get(UUID uuid) {
    return data.computeIfAbsent(uuid.toString(), ignored -> new PlayerStreak());
  }

  private long epochDayUtc() {
    return LocalDate.now(ZoneOffset.UTC).toEpochDay();
  }

  private static final class PlayerStreak {
    long lastSeenDay;
    long lastClaimDay;
    int currentStreak;
  }

  public record ClaimResult(boolean ok, String message) {
    public static ClaimResult success(String message) {
      return new ClaimResult(true, message);
    }

    public static ClaimResult error(String message) {
      return new ClaimResult(false, message);
    }
  }
}
