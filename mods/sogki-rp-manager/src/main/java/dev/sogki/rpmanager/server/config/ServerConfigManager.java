package dev.sogki.rpmanager.server.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class ServerConfigManager {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path JSON_PATH = BASE_DIR.resolve("features.json");
  private static final Path CHAT_YML_PATH = BASE_DIR.resolve("chat.yml");
  private static final Path TABLIST_YML_PATH = BASE_DIR.resolve("tablist.yml");
  private static final Path SIDEBAR_YML_PATH = BASE_DIR.resolve("sidebar.yml");
  private static final Path TEAM_MESSAGES_YML_PATH = BASE_DIR.resolve("team-messages.yml");
  private static final Path TEAM_SCOREBOARD_YML_PATH = BASE_DIR.resolve("team-scoreboard.yml");
  private static final Path ANNOUNCEMENTS_JSON_PATH = BASE_DIR.resolve("announcements.json");
  private static final Path AREA_JSON_PATH = BASE_DIR.resolve("area.json");
  private static final Path STREAK_JSON_PATH = BASE_DIR.resolve("streak.json");
  private static final Path QUIZ_JSON_PATH = BASE_DIR.resolve("quiz.json");
  private static final Path DISCORD_JSON_PATH = BASE_DIR.resolve("discord.json");
  private static final Path REGIONS_JSON_PATH = BASE_DIR.resolve("regions.json");
  private static final Path COBBLETOWN_JSON_PATH = BASE_DIR.resolve("cobbletown.json");
  private static final Path TEAMS_JSON_PATH = BASE_DIR.resolve("teams.json");
  private static final Path MESSAGES_JSON_PATH = BASE_DIR.resolve("messages.json");

  private ServerFeatureConfig config;

  public ServerConfigManager() {
    this.config = new ServerFeatureConfig();
  }

  public synchronized ServerFeatureConfig get() {
    return config;
  }

  public synchronized ServerFeatureConfig reload() {
    ServerFeatureConfig loaded = loadJson();
    applyFeatureSections(loaded);
    TemplateConfig templates = loadTemplates();
    applyTemplates(loaded, templates);
    loaded = applyRemoteOverrides(loaded);
    ensureDefaults(loaded);
    this.config = loaded;
    return loaded;
  }

  private ServerFeatureConfig loadJson() {
    try {
      Files.createDirectories(BASE_DIR);
      if (Files.notExists(JSON_PATH)) {
        ServerFeatureConfig defaults = defaultsWithRewards();
        FileWriteUtil.writeStringAtomic(
          JSON_PATH,
          GSON.toJson(Map.of("remoteConfig", defaults.remoteConfig), Map.class)
        );
        return defaults;
      }
      String raw = Files.readString(JSON_PATH, StandardCharsets.UTF_8);
      ServerFeatureConfig parsed = GSON.fromJson(raw, ServerFeatureConfig.class);
      return parsed == null ? defaultsWithRewards() : parsed;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load features.json, using defaults: {}", e.getMessage());
      return defaultsWithRewards();
    }
  }

  private void applyFeatureSections(ServerFeatureConfig cfg) {
    ServerFeatureConfig defaults = defaultsWithRewards();
    cfg.announcements = loadJsonSection(ANNOUNCEMENTS_JSON_PATH, defaults.announcements, ServerFeatureConfig.AnnouncementConfig.class);
    cfg.area = loadJsonSection(AREA_JSON_PATH, defaults.area, ServerFeatureConfig.AreaConfig.class);
    cfg.streak = loadJsonSection(STREAK_JSON_PATH, defaults.streak, ServerFeatureConfig.StreakConfig.class);
    cfg.quiz = loadJsonSection(QUIZ_JSON_PATH, defaults.quiz, ServerFeatureConfig.QuizConfig.class);
    cfg.discord = loadJsonSection(DISCORD_JSON_PATH, defaults.discord, ServerFeatureConfig.DiscordConfig.class);
    cfg.regions = loadJsonSection(REGIONS_JSON_PATH, defaults.regions, ServerFeatureConfig.RegionConfig.class);
    cfg.cobbletown = loadJsonSection(COBBLETOWN_JSON_PATH, defaults.cobbletown, ServerFeatureConfig.CobbletownConfig.class);
    cfg.teams = loadJsonSection(TEAMS_JSON_PATH, defaults.teams, ServerFeatureConfig.TeamsConfig.class);
    cfg.messages = loadJsonSection(MESSAGES_JSON_PATH, defaults.messages, ServerFeatureConfig.MessagesConfig.class);
  }

  private <T> T loadJsonSection(Path path, T defaults, Class<T> type) {
    try {
      createJsonIfMissing(path, defaults);
      String raw = Files.readString(path, StandardCharsets.UTF_8);
      T parsed = GSON.fromJson(raw, type);
      return parsed == null ? defaults : parsed;
    } catch (Exception ignored) {
      return defaults;
    }
  }

  private void createJsonIfMissing(Path path, Object defaults) throws IOException {
    if (Files.exists(path)) return;
    FileWriteUtil.writeStringAtomic(path, GSON.toJson(defaults));
  }

  private TemplateConfig loadTemplates() {
    TemplateConfig templates = new TemplateConfig();
    try {
      Files.createDirectories(BASE_DIR);
      createYamlIfMissing(
        CHAT_YML_PATH,
        "chat:\n  includePlayerInFormat: " + templates.chat.includePlayerInFormat + "\n  format: \"" + escapeYaml(templates.chat.format) + "\"\n"
      );
      createYamlIfMissing(
        TABLIST_YML_PATH,
        "tablist:\n  realtimeCoordinates: " + templates.tablist.realtimeCoordinates + "\n"
          + "  sortByTeam: " + templates.tablist.sortByTeam + "\n"
          + "  sortAlphabetically: " + templates.tablist.sortAlphabetically + "\n"
          + "  playerFormat: \"" + escapeYaml(templates.tablist.playerFormat) + "\"\n"
          + "  header:\n" + yamlLines(templates.tablist.header) + "  footer:\n" + yamlLines(templates.tablist.footer)
      );
      createYamlIfMissing(
        SIDEBAR_YML_PATH,
        "sidebar:\n  realtimeCoordinates: " + templates.sidebar.realtimeCoordinates + "\n  title: \""
          + escapeYaml(templates.sidebar.title) + "\"\n  lines:\n" + yamlLines(templates.sidebar.lines)
      );
      createYamlIfMissing(
        TEAM_MESSAGES_YML_PATH,
        "teamMessages:\n"
          + "  promptChoose: \"" + escapeYaml(templates.teamMessages.promptChoose) + "\"\n"
          + "  alreadyAssigned: \"" + escapeYaml(templates.teamMessages.alreadyAssigned) + "\"\n"
          + "  chosen: \"" + escapeYaml(templates.teamMessages.chosen) + "\"\n"
          + "  switchBlocked: \"" + escapeYaml(templates.teamMessages.switchBlocked) + "\"\n"
          + "  switchCooldown: \"" + escapeYaml(templates.teamMessages.switchCooldown) + "\"\n"
          + "  unknown: \"" + escapeYaml(templates.teamMessages.unknown) + "\"\n"
          + "  playerOnly: \"" + escapeYaml(templates.teamMessages.playerOnly) + "\"\n"
          + "  status: \"" + escapeYaml(templates.teamMessages.status) + "\"\n"
          + "  dailyReward: \"" + escapeYaml(templates.teamMessages.dailyReward) + "\"\n"
          + "  milestoneReward: \"" + escapeYaml(templates.teamMessages.milestoneReward) + "\"\n"
          + "  missionsHeader: \"" + escapeYaml(templates.teamMessages.missionsHeader) + "\"\n"
          + "  missionLine: \"" + escapeYaml(templates.teamMessages.missionLine) + "\"\n"
          + "  topHeader: \"" + escapeYaml(templates.teamMessages.topHeader) + "\"\n"
          + "  topLine: \"" + escapeYaml(templates.teamMessages.topLine) + "\"\n"
          + "  helpLine: \"" + escapeYaml(templates.teamMessages.helpLine) + "\"\n"
          + "  menuTitle: \"" + escapeYaml(templates.teamMessages.menuTitle) + "\"\n"
          + "  commandUnavailable: \"" + escapeYaml(templates.teamMessages.commandUnavailable) + "\"\n"
          + "  scoreboardSetupSuccess: \"" + escapeYaml(templates.teamMessages.scoreboardSetupSuccess) + "\"\n"
          + "  scoreboardRefreshSuccess: \"" + escapeYaml(templates.teamMessages.scoreboardRefreshSuccess) + "\"\n"
          + "  scoreboardClearSuccess: \"" + escapeYaml(templates.teamMessages.scoreboardClearSuccess) + "\"\n"
          + "  scoreboardResetConfirm: \"" + escapeYaml(templates.teamMessages.scoreboardResetConfirm) + "\"\n"
          + "  scoreboardResetSuccess: \"" + escapeYaml(templates.teamMessages.scoreboardResetSuccess) + "\"\n"
          + "  missionRerollSuccess: \"" + escapeYaml(templates.teamMessages.missionRerollSuccess) + "\"\n"
          + "  scoreboardAdminHelp: \"" + escapeYaml(templates.teamMessages.scoreboardAdminHelp) + "\"\n"
          + "  scoreboardPlayerOnlySetup: \"" + escapeYaml(templates.teamMessages.scoreboardPlayerOnlySetup) + "\"\n"
      );
      createYamlIfMissing(
        TEAM_SCOREBOARD_YML_PATH,
        "teamScoreboard:\n"
          + "  title: \"" + escapeYaml(templates.teamScoreboard.title) + "\"\n"
          + "  blankLineAfterTitle: " + templates.teamScoreboard.blankLineAfterTitle + "\n"
          + "  rankLine: \"" + escapeYaml(templates.teamScoreboard.rankLine) + "\"\n"
          + "  detailLine: \"" + escapeYaml(templates.teamScoreboard.detailLine) + "\"\n"
          + "  showDetailLine: " + templates.teamScoreboard.showDetailLine + "\n"
          + "  lineSpacing: " + templates.teamScoreboard.lineSpacing + "\n"
      );

      String chatRaw = Files.readString(CHAT_YML_PATH, StandardCharsets.UTF_8);
      String tabRaw = Files.readString(TABLIST_YML_PATH, StandardCharsets.UTF_8);
      String sideRaw = Files.readString(SIDEBAR_YML_PATH, StandardCharsets.UTF_8);
      String teamRaw = Files.readString(TEAM_MESSAGES_YML_PATH, StandardCharsets.UTF_8);
      String teamScoreboardRaw = Files.readString(TEAM_SCOREBOARD_YML_PATH, StandardCharsets.UTF_8);

      String chatFmt = valueForKey(chatRaw, "format");
      if (chatFmt != null && !chatFmt.isBlank()) templates.chat.format = chatFmt;
      String includePlayer = valueForKey(chatRaw, "includePlayerInFormat");
      if (includePlayer != null) templates.chat.includePlayerInFormat = Boolean.parseBoolean(includePlayer.trim());

      List<String> headerList = listForKey(tabRaw, "header");
      if (!headerList.isEmpty()) {
        templates.tablist.header = headerList;
      } else {
        String header = valueForKey(tabRaw, "header");
        if (header != null) templates.tablist.header = List.of(header);
      }

      List<String> footerList = listForKey(tabRaw, "footer");
      if (!footerList.isEmpty()) {
        templates.tablist.footer = footerList;
      } else {
        String footer = valueForKey(tabRaw, "footer");
        if (footer != null) templates.tablist.footer = List.of(footer);
      }
      String tabRealtime = valueForKey(tabRaw, "realtimeCoordinates");
      if (tabRealtime != null) templates.tablist.realtimeCoordinates = Boolean.parseBoolean(tabRealtime);
      String sortByTeam = valueForKey(tabRaw, "sortByTeam");
      if (sortByTeam != null) templates.tablist.sortByTeam = Boolean.parseBoolean(sortByTeam);
      String sortAlphabetically = valueForKey(tabRaw, "sortAlphabetically");
      if (sortAlphabetically != null) templates.tablist.sortAlphabetically = Boolean.parseBoolean(sortAlphabetically);
      String playerFormat = valueForKey(tabRaw, "playerFormat");
      if (playerFormat != null && !playerFormat.isBlank()) templates.tablist.playerFormat = playerFormat;

      String title = valueForKey(sideRaw, "title");
      if (title != null && !title.isBlank()) templates.sidebar.title = title;
      String sidebarRealtime = valueForKey(sideRaw, "realtimeCoordinates");
      if (sidebarRealtime != null) templates.sidebar.realtimeCoordinates = Boolean.parseBoolean(sidebarRealtime);
      List<String> parsedLines = listForKey(sideRaw, "lines");
      if (!parsedLines.isEmpty()) templates.sidebar.lines = parsedLines;

      String promptChoose = valueForKey(teamRaw, "promptChoose");
      if (promptChoose != null) templates.teamMessages.promptChoose = promptChoose;
      String alreadyAssigned = valueForKey(teamRaw, "alreadyAssigned");
      if (alreadyAssigned != null) templates.teamMessages.alreadyAssigned = alreadyAssigned;
      String chosen = valueForKey(teamRaw, "chosen");
      if (chosen != null) templates.teamMessages.chosen = chosen;
      String switchBlocked = valueForKey(teamRaw, "switchBlocked");
      if (switchBlocked != null) templates.teamMessages.switchBlocked = switchBlocked;
      String switchCooldown = valueForKey(teamRaw, "switchCooldown");
      if (switchCooldown != null) templates.teamMessages.switchCooldown = switchCooldown;
      String unknown = valueForKey(teamRaw, "unknown");
      if (unknown != null) templates.teamMessages.unknown = unknown;
      String playerOnly = valueForKey(teamRaw, "playerOnly");
      if (playerOnly != null) templates.teamMessages.playerOnly = playerOnly;
      String status = valueForKey(teamRaw, "status");
      if (status != null) templates.teamMessages.status = status;
      String dailyReward = valueForKey(teamRaw, "dailyReward");
      if (dailyReward != null) templates.teamMessages.dailyReward = dailyReward;
      String milestoneReward = valueForKey(teamRaw, "milestoneReward");
      if (milestoneReward != null) templates.teamMessages.milestoneReward = milestoneReward;
      String missionsHeader = valueForKey(teamRaw, "missionsHeader");
      if (missionsHeader != null) templates.teamMessages.missionsHeader = missionsHeader;
      String missionLine = valueForKey(teamRaw, "missionLine");
      if (missionLine != null) templates.teamMessages.missionLine = missionLine;
      String topHeader = valueForKey(teamRaw, "topHeader");
      if (topHeader != null) templates.teamMessages.topHeader = topHeader;
      String topLine = valueForKey(teamRaw, "topLine");
      if (topLine != null) templates.teamMessages.topLine = topLine;
      String helpLine = valueForKey(teamRaw, "helpLine");
      if (helpLine != null) templates.teamMessages.helpLine = helpLine;
      String menuTitle = valueForKey(teamRaw, "menuTitle");
      if (menuTitle != null) templates.teamMessages.menuTitle = menuTitle;
      String commandUnavailable = valueForKey(teamRaw, "commandUnavailable");
      if (commandUnavailable != null) templates.teamMessages.commandUnavailable = commandUnavailable;
      String scoreboardSetupSuccess = valueForKey(teamRaw, "scoreboardSetupSuccess");
      if (scoreboardSetupSuccess != null) templates.teamMessages.scoreboardSetupSuccess = scoreboardSetupSuccess;
      String scoreboardRefreshSuccess = valueForKey(teamRaw, "scoreboardRefreshSuccess");
      if (scoreboardRefreshSuccess != null) templates.teamMessages.scoreboardRefreshSuccess = scoreboardRefreshSuccess;
      String scoreboardClearSuccess = valueForKey(teamRaw, "scoreboardClearSuccess");
      if (scoreboardClearSuccess != null) templates.teamMessages.scoreboardClearSuccess = scoreboardClearSuccess;
      String scoreboardResetConfirm = valueForKey(teamRaw, "scoreboardResetConfirm");
      if (scoreboardResetConfirm != null) templates.teamMessages.scoreboardResetConfirm = scoreboardResetConfirm;
      String scoreboardResetSuccess = valueForKey(teamRaw, "scoreboardResetSuccess");
      if (scoreboardResetSuccess != null) templates.teamMessages.scoreboardResetSuccess = scoreboardResetSuccess;
      String missionRerollSuccess = valueForKey(teamRaw, "missionRerollSuccess");
      if (missionRerollSuccess != null) templates.teamMessages.missionRerollSuccess = missionRerollSuccess;
      String scoreboardAdminHelp = valueForKey(teamRaw, "scoreboardAdminHelp");
      if (scoreboardAdminHelp != null) templates.teamMessages.scoreboardAdminHelp = scoreboardAdminHelp;
      String scoreboardPlayerOnlySetup = valueForKey(teamRaw, "scoreboardPlayerOnlySetup");
      if (scoreboardPlayerOnlySetup != null) templates.teamMessages.scoreboardPlayerOnlySetup = scoreboardPlayerOnlySetup;

      String teamScoreboardTitle = valueForKey(teamScoreboardRaw, "title");
      if (teamScoreboardTitle != null) templates.teamScoreboard.title = teamScoreboardTitle;
      String blankLineAfterTitle = valueForKey(teamScoreboardRaw, "blankLineAfterTitle");
      if (blankLineAfterTitle != null) templates.teamScoreboard.blankLineAfterTitle = Boolean.parseBoolean(blankLineAfterTitle);
      String rankLine = valueForKey(teamScoreboardRaw, "rankLine");
      if (rankLine != null) templates.teamScoreboard.rankLine = rankLine;
      String detailLine = valueForKey(teamScoreboardRaw, "detailLine");
      if (detailLine != null) templates.teamScoreboard.detailLine = detailLine;
      String showDetailLine = valueForKey(teamScoreboardRaw, "showDetailLine");
      if (showDetailLine != null) templates.teamScoreboard.showDetailLine = Boolean.parseBoolean(showDetailLine);
      String lineSpacing = valueForKey(teamScoreboardRaw, "lineSpacing");
      if (lineSpacing != null) {
        try {
          templates.teamScoreboard.lineSpacing = Double.parseDouble(lineSpacing);
        } catch (Exception ignored) {
        }
      }
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load one or more template YAML files, keeping defaults: {}", e.getMessage());
    }
    return templates;
  }

  private void createYamlIfMissing(Path path, String defaults) throws IOException {
    if (Files.exists(path)) return;
    FileWriteUtil.writeStringAtomic(path, defaults);
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
      String clean = cleanYamlScalar(value);
      out.add(clean);
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

  private void applyTemplates(ServerFeatureConfig cfg, TemplateConfig templates) {
    cfg.chat.format = templates.chat.format;
    cfg.chat.includePlayerInFormat = templates.chat.includePlayerInFormat;
    cfg.tablist.header = templates.tablist.header;
    cfg.tablist.footer = templates.tablist.footer;
    cfg.tablist.realtimeCoordinates = templates.tablist.realtimeCoordinates;
    cfg.tablist.sortByTeam = templates.tablist.sortByTeam;
    cfg.tablist.sortAlphabetically = templates.tablist.sortAlphabetically;
    cfg.tablist.playerFormat = templates.tablist.playerFormat;
    cfg.sidebar.title = templates.sidebar.title;
    cfg.sidebar.lines = templates.sidebar.lines;
    cfg.sidebar.realtimeCoordinates = templates.sidebar.realtimeCoordinates;
    cfg.messages.teamPromptChoose = templates.teamMessages.promptChoose;
    cfg.messages.teamAlreadyAssigned = templates.teamMessages.alreadyAssigned;
    cfg.messages.teamChosen = templates.teamMessages.chosen;
    cfg.messages.teamSwitchBlocked = templates.teamMessages.switchBlocked;
    cfg.messages.teamSwitchCooldown = templates.teamMessages.switchCooldown;
    cfg.messages.teamUnknown = templates.teamMessages.unknown;
    cfg.messages.teamPlayerOnly = templates.teamMessages.playerOnly;
    cfg.messages.teamStatus = templates.teamMessages.status;
    cfg.messages.teamDailyReward = templates.teamMessages.dailyReward;
    cfg.messages.teamMilestoneReward = templates.teamMessages.milestoneReward;
    cfg.messages.teamMissionsHeader = templates.teamMessages.missionsHeader;
    cfg.messages.teamMissionLine = templates.teamMessages.missionLine;
    cfg.messages.teamTopHeader = templates.teamMessages.topHeader;
    cfg.messages.teamTopLine = templates.teamMessages.topLine;
    cfg.messages.teamHelpLine = templates.teamMessages.helpLine;
    cfg.messages.teamMenuTitle = templates.teamMessages.menuTitle;
    cfg.messages.teamCommandUnavailable = templates.teamMessages.commandUnavailable;
    cfg.messages.teamScoreboardSetupSuccess = templates.teamMessages.scoreboardSetupSuccess;
    cfg.messages.teamScoreboardRefreshSuccess = templates.teamMessages.scoreboardRefreshSuccess;
    cfg.messages.teamScoreboardClearSuccess = templates.teamMessages.scoreboardClearSuccess;
    cfg.messages.teamScoreboardResetConfirm = templates.teamMessages.scoreboardResetConfirm;
    cfg.messages.teamScoreboardResetSuccess = templates.teamMessages.scoreboardResetSuccess;
    cfg.messages.teamMissionRerollSuccess = templates.teamMessages.missionRerollSuccess;
    cfg.messages.teamScoreboardAdminHelp = templates.teamMessages.scoreboardAdminHelp;
    cfg.messages.teamScoreboardPlayerOnlySetup = templates.teamMessages.scoreboardPlayerOnlySetup;
    cfg.teams.scoreboard.hologramTitle = templates.teamScoreboard.title;
    cfg.teams.scoreboard.hologramBlankLineAfterTitle = templates.teamScoreboard.blankLineAfterTitle;
    cfg.teams.scoreboard.hologramRankLine = templates.teamScoreboard.rankLine;
    cfg.teams.scoreboard.hologramDetailLine = templates.teamScoreboard.detailLine;
    cfg.teams.scoreboard.hologramShowDetailLine = templates.teamScoreboard.showDetailLine;
    cfg.teams.scoreboard.hologramLineSpacing = templates.teamScoreboard.lineSpacing;
  }

  private ServerFeatureConfig applyRemoteOverrides(ServerFeatureConfig cfg) {
    if (cfg.remoteConfig == null || !cfg.remoteConfig.enabled) return cfg;
    if (cfg.remoteConfig.url == null || cfg.remoteConfig.url.isBlank()) return cfg;

    try {
      HttpURLConnection conn = (HttpURLConnection) URI.create(cfg.remoteConfig.url).toURL().openConnection();
      conn.setRequestMethod("GET");
      conn.setConnectTimeout(Math.max(500, cfg.remoteConfig.timeoutMs));
      conn.setReadTimeout(Math.max(1000, cfg.remoteConfig.timeoutMs * 2));
      conn.setRequestProperty("Accept", "application/json");
      int code = conn.getResponseCode();
      InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
      if (stream == null || code < 200 || code >= 300) {
        return cfg.remoteConfig.failOpen ? cfg : defaultsWithRewards();
      }
      String body = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      ServerFeatureConfig remote = GSON.fromJson(body, ServerFeatureConfig.class);
      if (remote == null) return cfg;
      return merge(cfg, remote);
    } catch (Exception ignored) {
      return cfg.remoteConfig.failOpen ? cfg : defaultsWithRewards();
    }
  }

  private ServerFeatureConfig merge(ServerFeatureConfig base, ServerFeatureConfig remote) {
    // Merge via map patching to avoid writing boilerplate for every field.
    Map<String, Object> baseMap = GSON.fromJson(GSON.toJson(base), LinkedHashMap.class);
    Map<String, Object> remoteMap = GSON.fromJson(GSON.toJson(remote), LinkedHashMap.class);
    patch(baseMap, remoteMap);
    return GSON.fromJson(GSON.toJson(baseMap), ServerFeatureConfig.class);
  }

  @SuppressWarnings("unchecked")
  private void patch(Map<String, Object> target, Map<String, Object> src) {
    for (Map.Entry<String, Object> entry : src.entrySet()) {
      String key = entry.getKey();
      Object value = entry.getValue();
      if (value == null) continue;
      Object old = target.get(key);
      if (value instanceof Map<?, ?> vm && old instanceof Map<?, ?> om) {
        patch((Map<String, Object>) om, (Map<String, Object>) vm);
      } else {
        target.put(key, value);
      }
    }
  }

  private ServerFeatureConfig defaultsWithRewards() {
    ServerFeatureConfig cfg = new ServerFeatureConfig();
    cfg.streak.rewards.add(reward(1, "minecraft:experience_bottle", 8, "EXP Bottles"));
    cfg.streak.rewards.add(reward(2, "minecraft:experience_bottle", 12, "EXP Bottles"));
    cfg.streak.rewards.add(reward(3, "minecraft:sugar", 16, "Rare Candy (themed)"));
    cfg.streak.rewards.add(reward(4, "minecraft:amethyst_shard", 6, "Evolution Shards"));
    cfg.streak.rewards.add(reward(5, "minecraft:glowstone_dust", 12, "Training Dust"));
    cfg.streak.rewards.add(reward(6, "minecraft:lapis_lazuli", 20, "Move Tutor Dust"));
    cfg.streak.rewards.add(reward(7, "minecraft:diamond", 2, "Weekly Bonus"));
    cfg.quiz.questions.add(defaultQuiz("What's the evolution of Squirtle?", List.of("wartortle"), List.of(
      rewardItem("cobblemon:poke_ball", 8, "Pokeballs"),
      rewardItem("minecraft:experience_bottle", 6, "EXP Bottles")
    )));
    cfg.quiz.questions.add(defaultQuiz("What's the evolution of Charmander?", List.of("charmeleon"), List.of(
      rewardItem("cobblemon:exp_candy_s", 2, "EXP Candy S"),
      rewardItem("cobblemon:poke_ball", 6, "Pokeballs")
    )));
    cfg.quiz.questions.add(defaultQuiz("What's the evolution of Bulbasaur?", List.of("ivysaur"), List.of(
      rewardItem("cobblemon:oran_berry", 6, "Oran Berries"),
      rewardItem("cobblemon:poke_ball", 6, "Pokeballs")
    )));
    return cfg;
  }

  private ServerFeatureConfig.RewardRule reward(int day, String itemId, int count, String label) {
    ServerFeatureConfig.RewardRule rule = new ServerFeatureConfig.RewardRule();
    rule.day = day;
    rule.itemId = itemId;
    rule.count = count;
    rule.label = label;
    ServerFeatureConfig.RewardItem single = new ServerFeatureConfig.RewardItem();
    single.itemId = itemId;
    single.count = count;
    single.label = label;
    rule.items = new java.util.ArrayList<>(java.util.List.of(single));
    return rule;
  }

  private ServerFeatureConfig.QuizQuestion defaultQuiz(String question, List<String> answers, List<ServerFeatureConfig.RewardItem> rewards) {
    ServerFeatureConfig.QuizQuestion quiz = new ServerFeatureConfig.QuizQuestion();
    quiz.question = question;
    quiz.answers = new ArrayList<>(answers);
    quiz.rewards = new ArrayList<>(rewards);
    return quiz;
  }

  private ServerFeatureConfig.RewardItem rewardItem(String itemId, int count, String label) {
    ServerFeatureConfig.RewardItem item = new ServerFeatureConfig.RewardItem();
    item.itemId = itemId;
    item.count = count;
    item.label = label;
    return item;
  }

  private void ensureDefaults(ServerFeatureConfig cfg) {
    if (cfg.brand == null) cfg.brand = "";
    if (cfg.announcements == null) cfg.announcements = new ServerFeatureConfig.AnnouncementConfig();
    if (cfg.area == null) cfg.area = new ServerFeatureConfig.AreaConfig();
    if (cfg.streak == null) cfg.streak = new ServerFeatureConfig.StreakConfig();
    if (cfg.quiz == null) cfg.quiz = new ServerFeatureConfig.QuizConfig();
    if (cfg.discord == null) cfg.discord = new ServerFeatureConfig.DiscordConfig();
    if (cfg.regions == null) cfg.regions = new ServerFeatureConfig.RegionConfig();
    if (cfg.cobbletown == null) cfg.cobbletown = new ServerFeatureConfig.CobbletownConfig();
    if (cfg.teams == null) cfg.teams = new ServerFeatureConfig.TeamsConfig();
    if (cfg.chat == null) cfg.chat = new ServerFeatureConfig.ChatConfig();
    if (cfg.tablist == null) cfg.tablist = new ServerFeatureConfig.TablistConfig();
    if (cfg.sidebar == null) cfg.sidebar = new ServerFeatureConfig.SidebarConfig();
    if (cfg.messages == null) cfg.messages = new ServerFeatureConfig.MessagesConfig();
    if (cfg.remoteConfig == null) cfg.remoteConfig = new ServerFeatureConfig.RemoteConfig();
    if (cfg.streak.rewards == null) cfg.streak.rewards = new java.util.ArrayList<>();
    if (cfg.streak.rewards.isEmpty()) cfg.streak.rewards = defaultsWithRewards().streak.rewards;
    for (ServerFeatureConfig.RewardRule reward : cfg.streak.rewards) {
      if (reward == null) continue;
      if (reward.items == null) reward.items = new java.util.ArrayList<>();
    }
    if (cfg.quiz.questions == null) cfg.quiz.questions = new java.util.ArrayList<>();
    if (cfg.quiz.questions.isEmpty()) cfg.quiz.questions = defaultsWithRewards().quiz.questions;
    cfg.quiz.intervalSeconds = Math.max(30, cfg.quiz.intervalSeconds);
    cfg.quiz.timeLimitSeconds = Math.max(5, cfg.quiz.timeLimitSeconds);
    cfg.quiz.minOnlinePlayers = Math.max(1, cfg.quiz.minOnlinePlayers);
    cfg.discord.timeoutMs = Math.max(1000, cfg.discord.timeoutMs);
    cfg.discord.keyCacheSeconds = Math.max(30, cfg.discord.keyCacheSeconds);
    cfg.discord.maxOnlineOverride = Math.max(0, cfg.discord.maxOnlineOverride);
    cfg.discord.autoRestartHours = Math.max(0, cfg.discord.autoRestartHours);
    cfg.discord.autoRestartWarningMinutes = Math.max(1, cfg.discord.autoRestartWarningMinutes);
    for (ServerFeatureConfig.QuizQuestion question : cfg.quiz.questions) {
      if (question == null) continue;
      if (question.answers == null) question.answers = new java.util.ArrayList<>();
      if (question.rewards == null) question.rewards = new java.util.ArrayList<>();
    }
    if (cfg.area.towns == null) cfg.area.towns = new java.util.ArrayList<>();
    if (cfg.area.enterDisplay == null) cfg.area.enterDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.area.leaveDisplay == null) cfg.area.leaveDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.area.townDisplay == null) cfg.area.townDisplay = new ServerFeatureConfig.DisplayRoute();
    if (cfg.regions.list == null) cfg.regions.list = new java.util.ArrayList<>();
    if (cfg.cobbletown.towns == null) cfg.cobbletown.towns = new java.util.ArrayList<>();
    if (cfg.teams.list == null || cfg.teams.list.isEmpty()) cfg.teams.list = defaultsWithRewards().teams.list;
    if (cfg.teams.buffs == null) cfg.teams.buffs = new java.util.ArrayList<>();
    if (cfg.teams.dailyRewards == null) cfg.teams.dailyRewards = new java.util.ArrayList<>();
    if (cfg.teams.longTermRewards == null) cfg.teams.longTermRewards = new java.util.ArrayList<>();
    if (cfg.teams.missions == null) cfg.teams.missions = new ServerFeatureConfig.TeamMissionsConfig();
    if (cfg.teams.missions.daily == null) cfg.teams.missions.daily = new java.util.ArrayList<>();
    if (cfg.teams.missions.weekly == null) cfg.teams.missions.weekly = new java.util.ArrayList<>();
    cfg.teams.switchCooldownDays = Math.max(0, cfg.teams.switchCooldownDays);
    cfg.teams.buffRefreshTicks = Math.max(1, cfg.teams.buffRefreshTicks);
    cfg.teams.missions.catchSampleTicks = Math.max(1, cfg.teams.missions.catchSampleTicks);
    cfg.teams.missions.dailyResetHourUtc = Math.max(0, Math.min(23, cfg.teams.missions.dailyResetHourUtc));
    cfg.teams.missions.weeklyResetDay = Math.max(1, Math.min(7, cfg.teams.missions.weeklyResetDay));
    if (cfg.teams.scoreboard == null) cfg.teams.scoreboard = new ServerFeatureConfig.TeamScoreboardConfig();
    cfg.teams.scoreboard.refreshTicks = Math.max(1, cfg.teams.scoreboard.refreshTicks);
    if (cfg.teams.scoreboard.objectiveName == null || cfg.teams.scoreboard.objectiveName.isBlank()) {
      cfg.teams.scoreboard.objectiveName = "sogki_team_points";
    }
    if (cfg.teams.scoreboard.objectiveTitle == null || cfg.teams.scoreboard.objectiveTitle.isBlank()) {
      cfg.teams.scoreboard.objectiveTitle = "Team Points";
    }
    if (cfg.teams.scoreboard.hologramTitle == null || cfg.teams.scoreboard.hologramTitle.isBlank()) {
      cfg.teams.scoreboard.hologramTitle = "&bTeam Scoreboard";
    }
    if (cfg.teams.scoreboard.hologramDimension == null || cfg.teams.scoreboard.hologramDimension.isBlank()) {
      cfg.teams.scoreboard.hologramDimension = "minecraft:overworld";
    }
    if (cfg.tablist.header == null || cfg.tablist.header.isEmpty()) {
      cfg.tablist.header = new java.util.ArrayList<>(java.util.List.of("Online: {online}"));
    }
    if (cfg.tablist.footer == null || cfg.tablist.footer.isEmpty()) {
      cfg.tablist.footer = new java.util.ArrayList<>(java.util.List.of("Have fun in Loafey's Cobblepals"));
    }
    if (cfg.tablist.playerFormat == null || cfg.tablist.playerFormat.isBlank()) {
      cfg.tablist.playerFormat = "{teamTabPrefix}{titlePrefix}&f{player}{titleSuffix}";
    }
    if (cfg.sidebar.lines == null || cfg.sidebar.lines.isEmpty()) {
      cfg.sidebar.lines = new java.util.ArrayList<>(java.util.List.of("Online: {online}", "Dimension: {world}", "Use /claim"));
    }
    ServerFeatureConfig.MessagesConfig messageDefaults = new ServerFeatureConfig.MessagesConfig();
    if (cfg.messages.teamPromptChoose == null) cfg.messages.teamPromptChoose = messageDefaults.teamPromptChoose;
    if (cfg.messages.teamAlreadyAssigned == null) cfg.messages.teamAlreadyAssigned = messageDefaults.teamAlreadyAssigned;
    if (cfg.messages.teamChosen == null) cfg.messages.teamChosen = messageDefaults.teamChosen;
    if (cfg.messages.teamSwitchBlocked == null) cfg.messages.teamSwitchBlocked = messageDefaults.teamSwitchBlocked;
    if (cfg.messages.teamSwitchCooldown == null) cfg.messages.teamSwitchCooldown = messageDefaults.teamSwitchCooldown;
    if (cfg.messages.teamUnknown == null) cfg.messages.teamUnknown = messageDefaults.teamUnknown;
    if (cfg.messages.teamPlayerOnly == null) cfg.messages.teamPlayerOnly = messageDefaults.teamPlayerOnly;
    if (cfg.messages.teamStatus == null) cfg.messages.teamStatus = messageDefaults.teamStatus;
    if (cfg.messages.teamDailyReward == null) cfg.messages.teamDailyReward = messageDefaults.teamDailyReward;
    if (cfg.messages.teamMilestoneReward == null) cfg.messages.teamMilestoneReward = messageDefaults.teamMilestoneReward;
    if (cfg.messages.teamMissionsHeader == null) cfg.messages.teamMissionsHeader = messageDefaults.teamMissionsHeader;
    if (cfg.messages.teamMissionLine == null) cfg.messages.teamMissionLine = messageDefaults.teamMissionLine;
    if (cfg.messages.teamTopHeader == null) cfg.messages.teamTopHeader = messageDefaults.teamTopHeader;
    if (cfg.messages.teamTopLine == null) cfg.messages.teamTopLine = messageDefaults.teamTopLine;
    if (cfg.messages.teamHelpLine == null) cfg.messages.teamHelpLine = messageDefaults.teamHelpLine;
    if (cfg.messages.teamMenuTitle == null) cfg.messages.teamMenuTitle = messageDefaults.teamMenuTitle;
    if (cfg.messages.teamCommandUnavailable == null) cfg.messages.teamCommandUnavailable = messageDefaults.teamCommandUnavailable;
    if (cfg.messages.teamScoreboardSetupSuccess == null) cfg.messages.teamScoreboardSetupSuccess = messageDefaults.teamScoreboardSetupSuccess;
    if (cfg.messages.teamScoreboardRefreshSuccess == null) cfg.messages.teamScoreboardRefreshSuccess = messageDefaults.teamScoreboardRefreshSuccess;
    if (cfg.messages.teamScoreboardClearSuccess == null) cfg.messages.teamScoreboardClearSuccess = messageDefaults.teamScoreboardClearSuccess;
    if (cfg.messages.teamScoreboardResetConfirm == null) cfg.messages.teamScoreboardResetConfirm = messageDefaults.teamScoreboardResetConfirm;
    if (cfg.messages.teamScoreboardResetSuccess == null) cfg.messages.teamScoreboardResetSuccess = messageDefaults.teamScoreboardResetSuccess;
    if (cfg.messages.teamMissionRerollSuccess == null) cfg.messages.teamMissionRerollSuccess = messageDefaults.teamMissionRerollSuccess;
    if (cfg.messages.teamScoreboardAdminHelp == null) cfg.messages.teamScoreboardAdminHelp = messageDefaults.teamScoreboardAdminHelp;
    if (cfg.messages.teamScoreboardPlayerOnlySetup == null) cfg.messages.teamScoreboardPlayerOnlySetup = messageDefaults.teamScoreboardPlayerOnlySetup;
    cfg.teams.scoreboard.hologramLineSpacing = Math.max(0.05D, cfg.teams.scoreboard.hologramLineSpacing);
    if (cfg.teams.scoreboard.hologramRankLine == null || cfg.teams.scoreboard.hologramRankLine.isBlank()) {
      cfg.teams.scoreboard.hologramRankLine = "&7{rank}. {teamDisplay} &f- {teamPoints} pts";
    }
    if (cfg.teams.scoreboard.hologramDetailLine == null || cfg.teams.scoreboard.hologramDetailLine.isBlank()) {
      cfg.teams.scoreboard.hologramDetailLine = "&8Catches: &f{teamTotalCatches} &8Quizzes: &f{teamTotalQuizzes} &8Missions: &f{teamMissionsCompleted}";
    }
  }
}
