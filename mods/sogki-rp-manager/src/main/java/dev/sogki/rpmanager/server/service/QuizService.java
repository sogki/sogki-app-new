package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public final class QuizService {
  private final Random random = new Random();

  private ActiveQuiz active;
  private long nextQuizAtTick = -1L;

  public void tick(MinecraftServer server, ServerFeatureConfig cfg, long tick) {
    if (cfg == null || cfg.quiz == null || !cfg.quiz.enabled) {
      active = null;
      nextQuizAtTick = -1L;
      return;
    }

    int minPlayers = Math.max(1, cfg.quiz.minOnlinePlayers);
    if (server.getCurrentPlayerCount() < minPlayers) return;

    if (active != null && tick >= active.endsAtTick) {
      onTimeout(server, cfg);
    }

    if (nextQuizAtTick < 0) {
      nextQuizAtTick = tick + Math.max(30, cfg.quiz.intervalSeconds) * 20L;
      return;
    }

    if (active == null && tick >= nextQuizAtTick) {
      startQuiz(server, cfg, tick);
      nextQuizAtTick = tick + Math.max(30, cfg.quiz.intervalSeconds) * 20L;
    }
  }

  public boolean forceStart(MinecraftServer server, ServerFeatureConfig cfg, long tick) {
    if (server == null || cfg == null || cfg.quiz == null || !cfg.quiz.enabled) return false;
    if (active != null) return false;
    startQuiz(server, cfg, tick);
    if (active != null) {
      nextQuizAtTick = tick + Math.max(30, cfg.quiz.intervalSeconds) * 20L;
      return true;
    }
    return false;
  }

  public boolean skipActive(MinecraftServer server, ServerFeatureConfig cfg) {
    if (server == null || cfg == null || cfg.quiz == null || !cfg.quiz.enabled || active == null) return false;
    onTimeout(server, cfg);
    return true;
  }

  public String status(long tick) {
    if (active != null) {
      long remainTicks = Math.max(0, active.endsAtTick - tick);
      return "Quiz active: \"" + active.question + "\" | timeRemaining=" + (remainTicks / 20) + "s";
    }
    if (nextQuizAtTick < 0) return "Quiz idle: next question not scheduled yet.";
    long remainTicks = Math.max(0, nextQuizAtTick - tick);
    return "Quiz idle: next question in " + (remainTicks / 20) + "s";
  }

  public boolean onPlayerChat(MinecraftServer server, ServerPlayerEntity player, String rawMessage, ServerFeatureConfig cfg) {
    if (server == null || player == null || rawMessage == null || cfg == null || cfg.quiz == null || !cfg.quiz.enabled) return false;
    if (active == null) return false;

    String answer = normalizeOneWord(rawMessage);
    if (answer == null) return false;
    if (!active.answers.contains(answer)) return false;

    List<ServerFeatureConfig.RewardItem> granted = grantRewards(player, active.rewards);
    Map<String, String> values = TemplateEngine.baseMap(server, player, cfg.brand);
    values.put("answer", answer);
    values.put("rewards", summarizeRewards(granted));
    String msg = TemplateEngine.render(cfg.messages.quizWinner, values);
    server.getPlayerManager().broadcast(Text.literal(msg), false);
    active = null;
    return true;
  }

  private void startQuiz(MinecraftServer server, ServerFeatureConfig cfg, long tick) {
    List<PreparedQuestion> pool = prepareQuestions(cfg.quiz.questions);
    if (pool.isEmpty()) return;
    PreparedQuestion pick = pool.get(random.nextInt(pool.size()));
    long seconds = Math.max(5, cfg.quiz.timeLimitSeconds);
    active = new ActiveQuiz(
      pick.question,
      pick.answers,
      pick.rewards,
      pick.primaryAnswer,
      tick + (seconds * 20L)
    );

    Map<String, String> values = Map.of(
      "question", pick.question,
      "seconds", String.valueOf(seconds)
    );
    String msg = TemplateEngine.render(cfg.messages.quizStart, values);
    server.getPlayerManager().broadcast(Text.literal(msg), false);
  }

  private void onTimeout(MinecraftServer server, ServerFeatureConfig cfg) {
    if (active == null) return;
    String msg = TemplateEngine.render(cfg.messages.quizNoWinner, Map.of("answer", active.primaryAnswer));
    server.getPlayerManager().broadcast(Text.literal(msg), false);
    active = null;
  }

  private List<PreparedQuestion> prepareQuestions(List<ServerFeatureConfig.QuizQuestion> questions) {
    List<PreparedQuestion> out = new ArrayList<>();
    if (questions == null) return out;

    for (ServerFeatureConfig.QuizQuestion question : questions) {
      if (question == null || question.question == null || question.question.isBlank()) continue;
      if (question.answers == null || question.answers.isEmpty()) continue;

      Set<String> normalized = new HashSet<>();
      String primary = null;
      for (String answer : question.answers) {
        String oneWord = normalizeOneWord(answer);
        if (oneWord == null) continue;
        normalized.add(oneWord);
        if (primary == null) primary = oneWord;
      }
      if (normalized.isEmpty() || primary == null) continue;

      List<ServerFeatureConfig.RewardItem> rewards = normalizeRewards(question.rewards);
      out.add(new PreparedQuestion(question.question.trim(), normalized, rewards, primary));
    }
    return out;
  }

  private List<ServerFeatureConfig.RewardItem> normalizeRewards(List<ServerFeatureConfig.RewardItem> rewards) {
    List<ServerFeatureConfig.RewardItem> out = new ArrayList<>();
    if (rewards != null) {
      for (ServerFeatureConfig.RewardItem reward : rewards) {
        if (reward == null) continue;
        ServerFeatureConfig.RewardItem fixed = new ServerFeatureConfig.RewardItem();
        fixed.itemId = reward.itemId == null || reward.itemId.isBlank() ? "minecraft:experience_bottle" : reward.itemId;
        fixed.count = Math.max(1, reward.count);
        fixed.label = reward.label == null || reward.label.isBlank() ? fixed.itemId : reward.label;
        out.add(fixed);
      }
    }
    if (!out.isEmpty()) return out;

    ServerFeatureConfig.RewardItem fallback = new ServerFeatureConfig.RewardItem();
    fallback.itemId = "minecraft:experience_bottle";
    fallback.count = 8;
    fallback.label = "EXP Bottles";
    out.add(fallback);
    return out;
  }

  private List<ServerFeatureConfig.RewardItem> grantRewards(ServerPlayerEntity player, List<ServerFeatureConfig.RewardItem> rewards) {
    List<ServerFeatureConfig.RewardItem> granted = new ArrayList<>();
    for (ServerFeatureConfig.RewardItem reward : normalizeRewards(rewards)) {
      giveItem(player, reward);
      granted.add(reward);
    }
    return granted;
  }

  private void giveItem(ServerPlayerEntity player, ServerFeatureConfig.RewardItem reward) {
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

  private String summarizeRewards(List<ServerFeatureConfig.RewardItem> items) {
    if (items == null || items.isEmpty()) return "Reward";
    StringBuilder builder = new StringBuilder();
    for (ServerFeatureConfig.RewardItem item : items) {
      if (item == null) continue;
      if (!builder.isEmpty()) builder.append(", ");
      String label = item.label == null || item.label.isBlank() ? item.itemId : item.label;
      builder.append(label == null ? "Reward" : label).append(" x").append(Math.max(1, item.count));
    }
    return builder.isEmpty() ? "Reward" : builder.toString();
  }

  private String normalizeOneWord(String raw) {
    if (raw == null) return null;
    String cleaned = raw.trim().toLowerCase(Locale.ROOT);
    if (cleaned.isEmpty()) return null;
    if (cleaned.contains(" ")) return null;
    if (!cleaned.matches("[a-z0-9_-]+")) return null;
    return cleaned;
  }

  private record PreparedQuestion(
    String question,
    Set<String> answers,
    List<ServerFeatureConfig.RewardItem> rewards,
    String primaryAnswer
  ) {
  }

  private record ActiveQuiz(
    String question,
    Set<String> answers,
    List<ServerFeatureConfig.RewardItem> rewards,
    String primaryAnswer,
    long endsAtTick
  ) {
  }
}
