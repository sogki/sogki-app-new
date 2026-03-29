package dev.sogki.rpmanager.server.config;

import java.util.ArrayList;
import java.util.List;

public final class TemplateConfig {
  public ChatTemplates chat = new ChatTemplates();
  public TablistTemplates tablist = new TablistTemplates();
  public SidebarTemplates sidebar = new SidebarTemplates();
  public TeamMessageTemplates teamMessages = new TeamMessageTemplates();
  public TeamScoreboardTemplates teamScoreboard = new TeamScoreboardTemplates();

  public static final class ChatTemplates {
    public boolean includePlayerInFormat = true;
    public String format = "&8[&r{teamDisplay}&8] {titlePrefix}&f{player}{titleSuffix} &8| &7{message}";
  }

  public static final class TablistTemplates {
    public boolean realtimeCoordinates = true;
    public boolean sortByTeam = true;
    public boolean sortAlphabetically = true;
    public String playerFormat = "{teamTabPrefix}{titlePrefix}&f{player}{titleSuffix}";
    public List<String> header = new ArrayList<>(List.of("Online: {online}"));
    public List<String> footer = new ArrayList<>(List.of("Welcome to Loafey's Cobblepals"));
  }

  public static final class SidebarTemplates {
    public boolean realtimeCoordinates = true;
    public String title = "Server";
    public List<String> lines = new ArrayList<>(List.of(
      "Online: {online}",
      "Dimension: {world}",
      "Use /claim",
      "Have a great day!"
    ));
  }

  public static final class TeamMessageTemplates {
    public String promptChoose = "&eYou haven't picked a team yet. Use &f/teams &eto pick one.";
    public String alreadyAssigned = "&eYou are already on team {teamDisplay}&e.";
    public String chosen = "&aYou joined team {teamDisplay}&a.";
    public String switchBlocked = "&cTeam switching is disabled.";
    public String switchCooldown = "&eYou can switch teams in {days} day(s).";
    public String unknown = "&cUnknown team. Available teams: valor, mystic, instinct.";
    public String playerOnly = "&cThis command is player-only.";
    public String status = "&bTeam: {teamDisplay} &7| &fPoints: {teamPoints}";
    public String dailyReward = "&aDaily team rewards granted: {rewards}";
    public String milestoneReward = "&dMilestone reward unlocked ({days} day(s)): {rewards}";
    public String missionsHeader = "&bTeam missions for {teamDisplay}&b:";
    public String missionLine = "&7- {mission}: &f{current}/{target} &8({period})";
    public String topHeader = "&bTeam ranking:";
    public String topLine = "&7{rank}. {teamDisplay} &f- {teamPoints} pts";
    public String helpLine = "&bTeam commands: &f/teams&7, &f/team choose <name>&7, &f/missions&7, &f/team info&7, &f/team top&7, &f/team leave";
    public String menuTitle = "&8Choose Your Team";
    public String commandUnavailable = "&cTeams are disabled.";
    public String scoreboardSetupSuccess = "&aTeam scoreboard setup complete.";
    public String scoreboardRefreshSuccess = "&aTeam scoreboard refreshed.";
    public String scoreboardClearSuccess = "&aTeam scoreboard deleted.";
    public String scoreboardResetConfirm = "&eType /sogkiadmin scoreboard team reset CONFIRM to reset team metrics.";
    public String scoreboardResetSuccess = "&aTeam metrics reset.";
    public String missionRerollSuccess = "&aTeam missions rerolled.";
    public String scoreboardAdminHelp = "&bAdmin team scoreboard: &f/sogkiadmin scoreboard team setup|refresh|delete|reset CONFIRM";
    public String scoreboardPlayerOnlySetup = "&cRun setup in-game so hologram position can be captured.";
  }

  public static final class TeamScoreboardTemplates {
    public String title = "&bTeam Scoreboard";
    public boolean blankLineAfterTitle = true;
    public String rankLine = "&7{rank}. {teamDisplay} &f- {teamPoints} pts";
    public String detailLine = "&8Catches: &f{teamTotalCatches} &8Quizzes: &f{teamTotalQuizzes} &8Missions: &f{teamMissionsCompleted}";
    public boolean showDetailLine = true;
    public double lineSpacing = 0.28;
  }
}
