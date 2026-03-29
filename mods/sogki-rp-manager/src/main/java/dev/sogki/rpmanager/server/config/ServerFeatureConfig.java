package dev.sogki.rpmanager.server.config;

import java.util.ArrayList;
import java.util.List;

public final class ServerFeatureConfig {
  public String brand = "";
  public RemoteConfig remoteConfig = new RemoteConfig();
  public AnnouncementConfig announcements = new AnnouncementConfig();
  public AreaConfig area = new AreaConfig();
  public StreakConfig streak = new StreakConfig();
  public QuizConfig quiz = new QuizConfig();
  public DiscordConfig discord = new DiscordConfig();
  public RegionConfig regions = new RegionConfig();
  public CobbletownConfig cobbletown = new CobbletownConfig();
  public TeamsConfig teams = new TeamsConfig();
  public ChatConfig chat = new ChatConfig();
  public TablistConfig tablist = new TablistConfig();
  public SidebarConfig sidebar = new SidebarConfig();
  public MessagesConfig messages = new MessagesConfig();

  public static final class RemoteConfig {
    public boolean enabled = false;
    public String url = "";
    public int timeoutMs = 2000;
    public boolean failOpen = true;
  }

  public static final class AnnouncementConfig {
    public boolean enabled = true;
    public int cooldownSeconds = 8;
    public boolean catchAnnouncements = true;
    public boolean shinyCatchAnnouncements = true;
    public boolean legendaryCatchAnnouncements = true;
    public boolean battleAnnouncements = false;
    public String catchTemplate = "{player} caught {pokemon}.";
    public String shinyCatchTemplate = "{player} caught a SHINY {pokemon}!";
    public String legendaryCatchTemplate = "{player} caught a LEGENDARY {pokemon}!";
    public String manualTemplate = "{message}";
  }

  public static final class AreaConfig {
    public boolean enabled = true;
    public int checkIntervalTicks = 20;
    public int perPlayerCooldownSeconds = 8;
    public String enterTemplate = "Entered {area}";
    public String leaveTemplate = "Left {area}";
    public DisplayRoute enterDisplay = new DisplayRoute();
    public DisplayRoute leaveDisplay = new DisplayRoute();
    public DisplayRoute townDisplay = new DisplayRoute();
    public List<TownDefinition> towns = new ArrayList<>();
  }

  public static final class TownDefinition {
    public String id = "spawn";
    public String name = "Spawn";
    public String dimension = "minecraft:overworld";
    public int minX = -128;
    public int minY = -64;
    public int minZ = -128;
    public int maxX = 128;
    public int maxY = 320;
    public int maxZ = 128;
  }

  public static final class StreakConfig {
    public boolean enabled = true;
    public int graceDays = 1;
    public boolean autoNotifyOnJoin = true;
    public List<RewardRule> rewards = new ArrayList<>();
  }

  public static final class RewardRule {
    public int day = 1;
    public String itemId = "minecraft:experience_bottle";
    public int count = 8;
    public String label = "XP Bottles";
    public List<RewardItem> items = new ArrayList<>();
  }

  public static final class RewardItem {
    public String itemId = "minecraft:experience_bottle";
    public int count = 1;
    public String label = "Reward";
  }

  public static final class QuizConfig {
    public boolean enabled = true;
    public int intervalSeconds = 900;
    public int timeLimitSeconds = 20;
    public int minOnlinePlayers = 1;
    public List<QuizQuestion> questions = new ArrayList<>();
  }

  public static final class QuizQuestion {
    public String question = "What's the evolution of Squirtle?";
    public List<String> answers = new ArrayList<>(List.of("wartortle"));
    public List<RewardItem> rewards = new ArrayList<>(List.of(defaultQuizReward()));

    private static RewardItem defaultQuizReward() {
      RewardItem reward = new RewardItem();
      reward.itemId = "cobblemon:poke_ball";
      reward.count = 8;
      reward.label = "Pokeballs";
      return reward;
    }
  }

  public static final class DiscordConfig {
    public boolean enabled = false;
    public boolean gatewayEnabled = true;
    public int timeoutMs = 3000;
    public int keyCacheSeconds = 300;
    public String supabaseUrl = "";
    public String serviceRoleKey = "";
    public String activityText = "Sogki Cobblemon";
    public int maxOnlineOverride = 60;
    public int onlineColor = 5763719;
    public int offlineColor = 15548997;
    public int autoRestartHours = 0;
    public int autoRestartWarningMinutes = 5;
  }

  public static final class RegionConfig {
    public boolean enabled = true;
    public boolean protectVillagersFromMobs = true;
    public boolean villagersIgnoreZombieFear = true;
    public List<RegionRule> list = new ArrayList<>();
  }

  public static final class RegionRule {
    public String id = "spawn-protect";
    public String dimension = "minecraft:overworld";
    public boolean useRadius = false;
    public int centerX = 0;
    public int centerZ = 0;
    public int radius = 0;
    public int minX = -64;
    public int minY = -64;
    public int minZ = -64;
    public int maxX = 64;
    public int maxY = 320;
    public int maxZ = 64;
    public boolean denyBlockBreak = true;
    public boolean denyBlockPlace = true;
    public boolean denyExplosives = true;
    public boolean denyCreeperExplosions = true;
    public boolean denyEndermanGrief = true;
    public boolean denyMobSpawn = false;
    public boolean isTown = false;
    public String displayName = "Spawn";
  }

  public static final class CobbletownConfig {
    public boolean enabled = true;
    public List<CobbletownTown> towns = new ArrayList<>();
  }

  public static final class CobbletownTown {
    public String townId = "cobbletowns:pallet_town";
    public String displayName = "Pallet Town";
    public String dimension = "minecraft:overworld";
    public boolean useRadius = false;
    public int centerX = 0;
    public int centerZ = 0;
    public int radius = 0;
    public int minX = -128;
    public int minY = -64;
    public int minZ = -128;
    public int maxX = 128;
    public int maxY = 320;
    public int maxZ = 128;
    public boolean denyBlockBreak = true;
    public boolean denyBlockPlace = true;
    public boolean denyExplosives = true;
    public boolean denyCreeperExplosions = true;
    public boolean denyEndermanGrief = true;
    public boolean denyMobSpawn = true;
  }

  public static final class TeamsConfig {
    public boolean enabled = true;
    public boolean requireSelectionOnJoin = true;
    public boolean allowSwitching = true;
    public int switchCooldownDays = 7;
    public int buffRefreshTicks = 40;
    public List<TeamDefinition> list = new ArrayList<>(List.of(
      team("valor", "&cValor", "red"),
      team("mystic", "&9Mystic", "blue"),
      team("instinct", "&eInstinct", "yellow")
    ));
    public List<TeamBuffDefinition> buffs = new ArrayList<>(List.of(
      buff("valor", "minecraft:strength", 0, 15, true, false, false),
      buff("mystic", "minecraft:night_vision", 0, 20, true, false, false),
      buff("instinct", "minecraft:speed", 0, 15, true, false, false)
    ));
    public List<TeamRewardDefinition> dailyRewards = new ArrayList<>(List.of(
      daily("valor", new RewardItem[]{
        reward("cobblemon:poke_ball", 8, "Pokeballs"),
        reward("minecraft:experience_bottle", 4, "EXP Bottles")
      }),
      daily("mystic", new RewardItem[]{
        reward("cobblemon:great_ball", 4, "Great Balls"),
        reward("minecraft:lapis_lazuli", 8, "Lapis")
      }),
      daily("instinct", new RewardItem[]{
        reward("cobblemon:poke_ball", 6, "Pokeballs"),
        reward("minecraft:glowstone_dust", 8, "Training Dust")
      })
    ));
    public List<TeamMilestoneReward> longTermRewards = new ArrayList<>(List.of(
      milestone("valor", 7, new RewardItem[]{reward("minecraft:diamond", 1, "Diamond")}),
      milestone("mystic", 7, new RewardItem[]{reward("minecraft:amethyst_shard", 8, "Amethyst Shards")}),
      milestone("instinct", 7, new RewardItem[]{reward("minecraft:golden_apple", 1, "Golden Apple")})
    ));
    public TeamMissionsConfig missions = new TeamMissionsConfig();
    public TeamScoreboardConfig scoreboard = new TeamScoreboardConfig();

    private static TeamDefinition team(String id, String displayName, String color) {
      TeamDefinition team = new TeamDefinition();
      team.id = id;
      team.displayName = displayName;
      team.color = color;
      return team;
    }

    private static TeamBuffDefinition buff(String teamId, String effectId, int amplifier, int durationSeconds,
                                           boolean ambient, boolean showParticles, boolean showIcon) {
      TeamBuffDefinition buff = new TeamBuffDefinition();
      buff.teamId = teamId;
      buff.effectId = effectId;
      buff.amplifier = amplifier;
      buff.durationSeconds = durationSeconds;
      buff.ambient = ambient;
      buff.showParticles = showParticles;
      buff.showIcon = showIcon;
      return buff;
    }

    private static RewardItem reward(String itemId, int count, String label) {
      RewardItem item = new RewardItem();
      item.itemId = itemId;
      item.count = count;
      item.label = label;
      return item;
    }

    private static TeamRewardDefinition daily(String teamId, RewardItem[] items) {
      TeamRewardDefinition reward = new TeamRewardDefinition();
      reward.teamId = teamId;
      reward.items = new ArrayList<>(List.of(items));
      return reward;
    }

    private static TeamMilestoneReward milestone(String teamId, int daysInTeam, RewardItem[] items) {
      TeamMilestoneReward reward = new TeamMilestoneReward();
      reward.teamId = teamId;
      reward.daysInTeam = daysInTeam;
      reward.items = new ArrayList<>(List.of(items));
      return reward;
    }
  }

  public static final class TeamDefinition {
    public String id = "valor";
    public String displayName = "&cValor";
    public String color = "red";
  }

  public static final class TeamBuffDefinition {
    public String teamId = "valor";
    public String effectId = "minecraft:strength";
    public int amplifier = 0;
    public int durationSeconds = 15;
    public boolean ambient = true;
    public boolean showParticles = false;
    public boolean showIcon = false;
  }

  public static final class TeamRewardDefinition {
    public String teamId = "valor";
    public List<RewardItem> items = new ArrayList<>();
    public List<String> commands = new ArrayList<>();
  }

  public static final class TeamMilestoneReward {
    public String teamId = "valor";
    public int daysInTeam = 7;
    public List<RewardItem> items = new ArrayList<>();
    public List<String> commands = new ArrayList<>();
  }

  public static final class TeamMissionsConfig {
    public boolean enabled = true;
    public int catchSampleTicks = 1;
    public int dailyResetHourUtc = 0;
    public int weeklyResetDay = 1;
    public List<TeamMissionDefinition> daily = new ArrayList<>(List.of(
      mission("daily_catches", "catches", "Daily catches", 12, 10),
      mission("daily_quizzes", "quiz_wins", "Daily quiz wins", 4, 1)
    ));
    public List<TeamMissionDefinition> weekly = new ArrayList<>(List.of(
      mission("weekly_catches", "catches", "Weekly catches", 60, 60),
      mission("weekly_quizzes", "quiz_wins", "Weekly quiz wins", 25, 8)
    ));

    private static TeamMissionDefinition mission(String id, String type, String displayName, int target, int points) {
      TeamMissionDefinition mission = new TeamMissionDefinition();
      mission.id = id;
      mission.type = type;
      mission.displayName = displayName;
      mission.target = target;
      mission.points = points;
      return mission;
    }
  }

  public static final class TeamMissionDefinition {
    public String id = "daily_catches";
    public String type = "catches";
    public String displayName = "Daily catches";
    public int target = 10;
    public int points = 10;
  }

  public static final class TeamScoreboardConfig {
    public boolean enabled = true;
    public int refreshTicks = 1;
    public String objectiveName = "sogki_team_points";
    public String objectiveTitle = "Team Points";
    public boolean hologramEnabled = true;
    public String hologramTitle = "&bTeam Scoreboard";
    public boolean hologramBlankLineAfterTitle = true;
    public String hologramRankLine = "&7{rank}. {teamDisplay} &f- {teamPoints} pts";
    public String hologramDetailLine = "&8Catches: &f{teamTotalCatches} &8Quizzes: &f{teamTotalQuizzes} &8Missions: &f{teamMissionsCompleted}";
    public boolean hologramShowDetailLine = true;
    public double hologramLineSpacing = 0.28D;
    public String hologramDimension = "minecraft:overworld";
    public double hologramX = 0.0D;
    public double hologramY = 80.0D;
    public double hologramZ = 0.0D;
  }

  public static final class ChatConfig {
    public boolean enabled = true;
    public boolean includePlayerInFormat = true;
    public String format = "&8[&r{teamDisplay}&8] {titlePrefix}&f{player}{titleSuffix} &8| &7{message}";
    public boolean mentionHighlights = true;
  }

  public static final class TablistConfig {
    public boolean enabled = true;
    public int refreshTicks = 100;
    public boolean realtimeCoordinates = true;
    public boolean sortByTeam = true;
    public boolean sortAlphabetically = true;
    public String playerFormat = "{teamTabPrefix}{titlePrefix}&f{player}{titleSuffix}";
    public List<String> header = new ArrayList<>(List.of("Online: {online}"));
    public List<String> footer = new ArrayList<>(List.of("Have fun in Loafey's Cobblepals"));
  }

  public static final class SidebarConfig {
    public boolean enabled = true;
    public int refreshTicks = 100;
    public boolean realtimeCoordinates = true;
    public String title = "Server";
    public List<String> lines = new ArrayList<>(List.of(
      "Online: {online}",
      "World: {world}",
      "Streak claims: /claim",
      "RP UI key: P"
    ));
  }

  public static final class MessagesConfig {
    public String configReloaded = "Config reloaded.";
    public String tabPreviewRefreshed = "Tablist preview refreshed.";
    public String sidebarPreviewRefreshed = "Sidebar refresh attempted.";

    public String claimPlayerOnly = "Claim is player-only.";
    public String claimMenuPlayerOnly = "Claim menu is player-only.";
    public String claimDisabled = "Daily rewards are disabled.";
    public String claimAlreadyClaimed = "You already claimed today's reward.";
    public String claimSuccess = "Claimed day {day}: {rewards}";
    public String claimNoRewardRule = "Claimed streak day {day}, but no reward rule was configured.";

    public String streakJoinStatus = "Login streak: {streak} day(s). {status}";
    public String streakStatusClaimed = "Already claimed today's reward.";
    public String streakStatusAvailable = "You can claim today's reward.";
    public String streakJoinClaimHint = "Click to claim reward";
    public String streakMenuTitle = "Daily Rewards";
    public String streakMenuCurrent = "Current streak: {streak} day(s)";
    public String streakMenuStatusClaimed = "Status: already claimed today";
    public String streakMenuStatusAvailable = "Status: claim available";
    public String spawnPlayerOnly = "Spawn is player-only.";
    public String spawnNotSet = "Spawn is not set yet.";
    public String spawnTeleported = "Teleported to spawn ({world} @ {x}, {y}, {z}).";
    public String setSpawnPlayerOnly = "Setspawn is player-only.";
    public String setSpawnSuccess = "Spawn set to {world} @ {x}, {y}, {z}.";
    public String quizStart = "[Quiz] {question} ({seconds}s) - one-word answer only!";
    public String quizWinner = "[Quiz] {player} got it right ({answer}) and won {rewards}.";
    public String quizNoWinner = "[Quiz] Time's up! Correct answer: {answer}.";
    public String quizAdminStartSuccess = "&aQuiz started.";
    public String quizAdminStartFailed = "&cQuiz could not be started (disabled, active, or no valid questions).";
    public String quizAdminSkipSuccess = "&aQuiz skipped.";
    public String quizAdminSkipFailed = "&eNo active quiz to skip.";
    public String quizAdminStatus = "&7Quiz status: &f{status}";
    public String discordOnlineTitle = "Loafeys Cobblepals Online";
    public String discordOnlineDescription = "Loafeys Cobblepals is now online. Players: {online}/{maxOnline}";
    public String discordOfflineTitle = "Loafeys Cobblepals Offline";
    public String discordOfflineDescription = "Loafeys Cobblepals is now offline.";
    public String discordEmbedFooter = "Loafeys Cobblepals";
    public String discordTestTitle = "Server Status Test";
    public String discordTestDescription = "Manual test message from /sogkiadmin discord test.";
    public String discordAdminTestSuccess = "Discord test embed sent.";
    public String discordAdminTestFailed = "Discord test failed. Check server logs and keys/env configuration.";

    public String regionDenyBreak = "You cannot break blocks in {region}.";
    public String regionDenyPlace = "You cannot place blocks in {region}.";
    public String regionDenyExplosives = "You cannot use explosives in {region}.";
    public String enteredTown = "Entered {town}";
    public String teamPromptChoose = "You haven't picked a team yet. Use /team choose <valor|mystic|instinct>.";
    public String teamAlreadyAssigned = "You are already on team {teamDisplay}.";
    public String teamChosen = "You joined team {teamDisplay}.";
    public String teamSwitchBlocked = "Team switching is disabled.";
    public String teamSwitchCooldown = "You can switch teams in {days} day(s).";
    public String teamUnknown = "Unknown team. Available teams: valor, mystic, instinct.";
    public String teamPlayerOnly = "This command is player-only.";
    public String teamStatus = "Team: {teamDisplay}. Points: {teamPoints}.";
    public String teamDailyReward = "Daily team rewards granted: {rewards}";
    public String teamMilestoneReward = "Milestone reward unlocked ({days} day(s)): {rewards}";
    public String teamMissionsHeader = "Team missions for {teamDisplay}:";
    public String teamMissionLine = "- {mission}: {current}/{target} ({period})";
    public String teamTopHeader = "Team ranking:";
    public String teamTopLine = "{rank}. {teamDisplay} - {teamPoints} pts";
    public String teamHelpLine = "Team commands: /teams, /team choose <valor|mystic|instinct>, /missions, /team info, /team top, /team leave";
    public String teamMenuTitle = "&8Choose Your Team";
    public String teamCommandUnavailable = "Teams are disabled.";
    public String teamScoreboardSetupSuccess = "Team scoreboard setup complete.";
    public String teamScoreboardRefreshSuccess = "Team scoreboard refreshed.";
    public String teamScoreboardClearSuccess = "Team scoreboard deleted.";
    public String teamScoreboardResetConfirm = "Type /sogkiadmin scoreboard team reset CONFIRM to reset team metrics.";
    public String teamScoreboardResetSuccess = "Team metrics reset.";
    public String teamMissionRerollSuccess = "Team missions rerolled.";
    public String teamScoreboardAdminHelp = "Admin team scoreboard: /sogkiadmin scoreboard team setup|refresh|delete|reset CONFIRM";
    public String teamScoreboardPlayerOnlySetup = "Run setup in-game so hologram position can be captured.";
  }

  public static final class DisplayRoute {
    public boolean showActionBar = true;
    public boolean showChat = false;
    public boolean showTitle = false;
    public int titleFadeInTicks = 5;
    public int titleStayTicks = 40;
    public int titleFadeOutTicks = 10;
  }
}
