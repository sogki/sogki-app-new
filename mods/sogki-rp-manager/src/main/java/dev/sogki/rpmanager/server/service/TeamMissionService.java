package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TeamMissionService {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("team-metrics.json");

  private StoreData store = new StoreData();
  private long lastCatchSampleTick;

  public void load() {
    try {
      if (Files.notExists(STORE_PATH)) return;
      String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
      StoreData parsed = GSON.fromJson(raw, StoreData.class);
      if (parsed != null) {
        this.store = parsed;
      }
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load team mission metrics: {}", e.getMessage());
    }
    if (this.store == null) this.store = new StoreData();
    if (this.store.teams == null) this.store.teams = new HashMap<>();
    if (this.store.lastObservedCaught == null) this.store.lastObservedCaught = new HashMap<>();
  }

  public void save() {
    try {
      FileWriteUtil.writeJsonAtomic(STORE_PATH, GSON, store);
    } catch (IOException e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save team mission metrics: {}", e.getMessage());
    }
  }

  public void tick(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, SkillTreeService skills, long tick) {
    if (server == null || cfg == null || cfg.teams == null || !cfg.teams.enabled) return;
    resetPeriodsIfNeeded(cfg);
    if (cfg.teams.missions == null || !cfg.teams.missions.enabled) return;
    int sampleTicks = Math.max(1, cfg.teams.missions.catchSampleTicks);
    if (tick - lastCatchSampleTick < sampleTicks) return;
    lastCatchSampleTick = tick;
    sampleCatches(server, cfg, teams, skills);
  }

  public void onQuizWin(ServerPlayerEntity player, ServerFeatureConfig cfg, TeamService teams, SkillTreeService skills) {
    if (player == null || cfg == null || teams == null || cfg.teams == null || !cfg.teams.enabled) return;
    TeamId team = teams.getTeam(player.getUuid());
    if (team == null) return;
    TeamMetrics metrics = metrics(team);
    metrics.totalQuizzes++;
    int adjustedProgress = skills == null ? 1 : skills.adjustedProgress(player.getUuid(), "quiz_wins", 1);
    incrementMissions(team, "quiz_wins", Math.max(1, adjustedProgress), cfg);
    save();
  }

  public void resetAll() {
    this.store = new StoreData();
    save();
  }

  public int getTeamPoints(TeamId team) {
    if (team == null) return 0;
    return metrics(team).points;
  }

  public int getTeamTotalCatches(TeamId team) {
    if (team == null) return 0;
    return metrics(team).totalCatches;
  }

  public int getTeamTotalQuizzes(TeamId team) {
    if (team == null) return 0;
    return metrics(team).totalQuizzes;
  }

  public int getTeamMissionsCompleted(TeamId team) {
    if (team == null) return 0;
    return metrics(team).totalMissionsCompleted;
  }

  public List<TeamStanding> standings(ServerFeatureConfig cfg, TeamService teams) {
    List<TeamStanding> out = new ArrayList<>();
    for (String id : teams.availableTeamIds(cfg)) {
      TeamId team = TeamId.parse(id);
      if (team == null) continue;
      TeamMetrics metrics = metrics(team);
      out.add(new TeamStanding(team, metrics.points, metrics.totalCatches, metrics.totalQuizzes, metrics.totalMissionsCompleted));
    }
    out.sort(Comparator.comparingInt(TeamStanding::points).reversed().thenComparing(s -> s.team().id()));
    return out;
  }

  public List<MissionProgressLine> missionLines(TeamId team, ServerFeatureConfig cfg) {
    List<MissionProgressLine> lines = new ArrayList<>();
    if (team == null || cfg == null || cfg.teams == null || cfg.teams.missions == null) return lines;
    TeamMetrics metrics = metrics(team);
    addMissionLines(lines, cfg.teams.missions.daily, metrics.dailyProgress, "daily");
    addMissionLines(lines, cfg.teams.missions.weekly, metrics.weeklyProgress, "weekly");
    return lines;
  }

  private void addMissionLines(List<MissionProgressLine> lines,
                               List<ServerFeatureConfig.TeamMissionDefinition> definitions,
                               Map<String, Integer> progressMap,
                               String period) {
    if (definitions == null) return;
    for (ServerFeatureConfig.TeamMissionDefinition mission : definitions) {
      if (mission == null) continue;
      String id = safe(mission.id);
      if (id.isBlank()) continue;
      int target = Math.max(1, mission.target);
      int current = Math.max(0, progressMap.getOrDefault(id, 0));
      String display = safe(mission.displayName).isBlank() ? id : mission.displayName;
      lines.add(new MissionProgressLine(display, current, target, period));
    }
  }

  private void sampleCatches(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, SkillTreeService skills) {
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      TeamId team = teams.getTeam(player.getUuid());
      if (team == null) continue;
      int caught = parseInt(TemplateEngine.baseMap(server, player, cfg.brand).get("pokedexCaught"));
      String key = player.getUuid().toString();
      int previous = Math.max(0, store.lastObservedCaught.getOrDefault(key, caught));
      store.lastObservedCaught.put(key, caught);
      int delta = Math.max(0, caught - previous);
      if (delta <= 0) continue;
      TeamMetrics metrics = metrics(team);
      metrics.totalCatches += delta;
      int adjustedProgress = skills == null ? delta : skills.adjustedProgress(player.getUuid(), "catches", delta);
      incrementMissions(team, "catches", Math.max(0, adjustedProgress), cfg);
    }
    save();
  }

  private void incrementMissions(TeamId team, String type, int amount, ServerFeatureConfig cfg) {
    if (amount <= 0) return;
    if (cfg.teams.missions == null || !cfg.teams.missions.enabled) return;
    TeamMetrics metrics = metrics(team);
    applyMissionIncrement(metrics, cfg.teams.missions.daily, metrics.dailyProgress, type, amount);
    applyMissionIncrement(metrics, cfg.teams.missions.weekly, metrics.weeklyProgress, type, amount);
  }

  private void applyMissionIncrement(TeamMetrics metrics,
                                     List<ServerFeatureConfig.TeamMissionDefinition> missions,
                                     Map<String, Integer> progressMap,
                                     String type,
                                     int amount) {
    if (missions == null) return;
    for (ServerFeatureConfig.TeamMissionDefinition mission : missions) {
      if (mission == null) continue;
      String missionType = safe(mission.type).toLowerCase(Locale.ROOT);
      if (!missionType.equals(type)) continue;
      String missionId = safe(mission.id);
      if (missionId.isBlank()) continue;
      int target = Math.max(1, mission.target);
      int before = Math.max(0, progressMap.getOrDefault(missionId, 0));
      int after = before + amount;
      progressMap.put(missionId, after);
      if (before < target && after >= target) {
        metrics.points += Math.max(1, mission.points);
        metrics.totalMissionsCompleted++;
      }
    }
  }

  private TeamMetrics metrics(TeamId team) {
    return store.teams.computeIfAbsent(team.id(), ignored -> new TeamMetrics());
  }

  private void resetPeriodsIfNeeded(ServerFeatureConfig cfg) {
    long dailyKey = currentDailyKey(cfg);
    if (store.dailyKey != dailyKey) {
      store.dailyKey = dailyKey;
      for (TeamMetrics metrics : store.teams.values()) {
        if (metrics == null) continue;
        metrics.dailyProgress = new HashMap<>();
      }
      save();
    }
    long weeklyKey = currentWeeklyKey(cfg);
    if (store.weeklyKey != weeklyKey) {
      store.weeklyKey = weeklyKey;
      for (TeamMetrics metrics : store.teams.values()) {
        if (metrics == null) continue;
        metrics.weeklyProgress = new HashMap<>();
      }
      save();
    }
  }

  private long currentDailyKey(ServerFeatureConfig cfg) {
    int resetHour = cfg.teams.missions == null ? 0 : Math.max(0, Math.min(23, cfg.teams.missions.dailyResetHourUtc));
    LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
    LocalDate date = now.toLocalDate();
    if (now.getHour() < resetHour) {
      date = date.minusDays(1);
    }
    return date.toEpochDay();
  }

  private long currentWeeklyKey(ServerFeatureConfig cfg) {
    int resetDay = cfg.teams.missions == null ? 1 : Math.max(1, Math.min(7, cfg.teams.missions.weeklyResetDay));
    int resetHour = cfg.teams.missions == null ? 0 : Math.max(0, Math.min(23, cfg.teams.missions.dailyResetHourUtc));
    LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
    LocalDate date = now.toLocalDate();
    int today = now.getDayOfWeek().getValue();
    int diff = today - resetDay;
    if (diff < 0) diff += 7;
    LocalDate anchor = date.minusDays(diff);
    if (today == resetDay && now.getHour() < resetHour) {
      anchor = anchor.minusDays(7);
    }
    return anchor.toEpochDay();
  }

  private int parseInt(String value) {
    if (value == null || value.isBlank()) return 0;
    try {
      return Integer.parseInt(value.trim());
    } catch (Exception ignored) {
      return 0;
    }
  }

  private String safe(String value) {
    return value == null ? "" : value;
  }

  public record TeamStanding(TeamId team, int points, int catches, int quizzes, int missionsCompleted) {
  }

  public record MissionProgressLine(String mission, int current, int target, String period) {
  }

  private static final class StoreData {
    long dailyKey = -1L;
    long weeklyKey = -1L;
    Map<String, TeamMetrics> teams = new HashMap<>();
    Map<String, Integer> lastObservedCaught = new HashMap<>();
  }

  private static final class TeamMetrics {
    int points;
    int totalCatches;
    int totalQuizzes;
    int totalMissionsCompleted;
    Map<String, Integer> dailyProgress = new HashMap<>();
    Map<String, Integer> weeklyProgress = new HashMap<>();
  }
}
