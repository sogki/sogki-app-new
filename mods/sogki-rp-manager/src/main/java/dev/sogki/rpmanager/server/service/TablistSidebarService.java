package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.network.packet.s2c.play.PlayerListHeaderS2CPacket;
import net.minecraft.network.packet.s2c.play.ScoreboardDisplayS2CPacket;
import net.minecraft.network.packet.s2c.play.ScoreboardObjectiveUpdateS2CPacket;
import net.minecraft.network.packet.s2c.play.ScoreboardScoreResetS2CPacket;
import net.minecraft.network.packet.s2c.play.ScoreboardScoreUpdateS2CPacket;
import net.minecraft.scoreboard.ScoreHolder;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.ScoreboardCriterion;
import net.minecraft.scoreboard.ScoreboardDisplaySlot;
import net.minecraft.scoreboard.ScoreboardObjective;
import net.minecraft.scoreboard.Team;
import net.minecraft.scoreboard.number.BlankNumberFormat;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public final class TablistSidebarService {
  private static final String TAB_TEAM_PREFIX = "sogki_tab_";
  private static final String SIDEBAR_OBJECTIVE_PREFIX = "sogsb_";
  private static final int SIDEBAR_MAX_LINES = 15;
  private long lastTabRefreshTick;
  private long lastSidebarRefreshTick;
  private final Map<UUID, SidebarView> sidebarByPlayer = new HashMap<>();
  private TeamService teamService;
  private TitleService titleService;

  public void setServices(TeamService teamService, TitleService titleService) {
    this.teamService = teamService;
    this.titleService = titleService;
  }

  public void tick(MinecraftServer server, ServerFeatureConfig config, long tick) {
    int tabInterval = config.tablist.realtimeCoordinates ? 1 : Math.max(20, config.tablist.refreshTicks);
    // Sidebar packet spam can freeze/flicker clients. Keep realtime updates at 1s cadence.
    int sideInterval = config.sidebar.realtimeCoordinates ? 20 : Math.max(20, config.sidebar.refreshTicks);
    if (config.tablist.enabled && tick - lastTabRefreshTick >= tabInterval) {
      refreshTablist(server, config);
      lastTabRefreshTick = tick;
    }
    if (config.sidebar.enabled && tick - lastSidebarRefreshTick >= sideInterval) {
      refreshSidebar(server, config);
      lastSidebarRefreshTick = tick;
    }
  }

  public void refreshTablist(MinecraftServer server, ServerFeatureConfig config) {
    Scoreboard scoreboard = server.getScoreboard();
    Set<String> onlineScoreHolders = new HashSet<>();
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      onlineScoreHolders.add(player.getGameProfile().getName());
      Map<String, String> values = buildRenderValues(server, player, config);
      String headerText = joinLines(config.tablist.header, values);
      String footerText = joinLines(config.tablist.footer, values);
      sendHeaderFooterPacket(player, Text.literal(headerText), Text.literal(footerText));
      String playerFormat = safe(config.tablist.playerFormat).isBlank() ? "{player}" : config.tablist.playerFormat;
      String prefix = tabPrefix(playerFormat, values);
      String suffix = tabSuffix(playerFormat, values);
      String sortKey = config.tablist.sortByTeam ? values.getOrDefault("teamSortKey", "99") : "99";
      applyTabSortTeam(scoreboard, player, sortKey, prefix, suffix, config.tablist.sortAlphabetically);
    }
    cleanupStaleTabTeams(scoreboard, onlineScoreHolders);
  }

  private void cleanupStaleTabTeams(Scoreboard scoreboard, Set<String> onlineScoreHolders) {
    if (scoreboard == null) return;
    for (Team team : new ArrayList<>(scoreboard.getTeams())) {
      if (team == null || team.getName() == null || !team.getName().startsWith(TAB_TEAM_PREFIX)) continue;
      boolean hasOnlineMember = false;
      for (String scoreHolder : new ArrayList<>(team.getPlayerList())) {
        if (onlineScoreHolders.contains(scoreHolder)) {
          hasOnlineMember = true;
        } else {
          scoreboard.removeScoreHolderFromTeam(scoreHolder, team);
        }
      }
      if (!hasOnlineMember) {
        scoreboard.removeTeam(team);
      }
    }
  }

  private void sendHeaderFooterPacket(ServerPlayerEntity player, Text header, Text footer) {
    player.networkHandler.sendPacket(new PlayerListHeaderS2CPacket(header, footer));
  }

  private void refreshSidebar(MinecraftServer server, ServerFeatureConfig config) {
    Set<UUID> online = new HashSet<>();
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      if (player == null) continue;
      UUID uuid = player.getUuid();
      online.add(uuid);
      Map<String, String> values = buildRenderValues(server, player, config);
      String titleRaw = TemplateEngine.render(config.sidebar.title, values);
      String title = trimForSidebar(titleRaw, 32);
      List<String> rendered = renderSidebarLines(server, player, config);
      SidebarView previous = sidebarByPlayer.get(uuid);
      if (previous != null && previous.title().equals(title) && previous.lines().equals(rendered)) {
        continue;
      }
      String objectiveName = previous == null ? objectiveNameFor(player) : previous.objectiveName();
      sendPlayerSidebar(player, previous, objectiveName, title, rendered);
      sidebarByPlayer.put(uuid, new SidebarView(objectiveName, title, rendered));
    }
    sidebarByPlayer.keySet().removeIf(id -> !online.contains(id));
  }

  private List<String> renderSidebarLines(MinecraftServer server, ServerPlayerEntity player, ServerFeatureConfig config) {
    List<String> lines = config.sidebar.lines;
    Map<String, String> values = buildRenderValues(server, player, config);
    List<String> out = new ArrayList<>();
    int configured = lines == null ? 0 : Math.min(SIDEBAR_MAX_LINES, lines.size());
    for (int i = 0; i < configured; i++) {
      String source = lines.get(i);
      String rendered = TemplateEngine.render(source, values);
      out.add(ensureUnique(trimForSidebar(rendered, 40), i));
    }
    return out;
  }

  private Map<String, String> buildRenderValues(MinecraftServer server,
                                                ServerPlayerEntity player,
                                                ServerFeatureConfig config) {
    Map<String, String> values = TemplateEngine.baseMap(server, player, config.brand);
    if (player == null) return values;

    values.put("player", safe(player.getGameProfile().getName()));
    // Prefer live double position values over block-pos fallback; this avoids stale 0,0,0 snapshots.
    values.put("x", String.valueOf((int) Math.floor(player.getX())));
    values.put("y", String.valueOf((int) Math.floor(player.getY())));
    values.put("z", String.valueOf((int) Math.floor(player.getZ())));
    int onlineCount = (server == null || server.getPlayerManager() == null)
      ? 1
      : Math.max(1, server.getPlayerManager().getPlayerList().size());
    values.put("online", String.valueOf(onlineCount));

    if (teamService != null) {
      TeamId team = teamService.resolveTeam(player);
      String teamId = team == null ? "unassigned" : team.id();
      values.put("team", teamId);
      values.put("teamDisplay", teamService.teamDisplay(config, team));
      values.put("teamColor", colorForTeam(teamId));
      values.put("teamSortKey", String.valueOf(teamSortOrder(config, teamId)));
      values.put("teamTabPrefix", team == null ? "" : "&8[&r" + values.getOrDefault("teamDisplay", "Unassigned") + "&8] &r");
      if (titleService != null) {
        try {
          values.putAll(titleService.placeholders(player.getUuid(), teamId, values));
        } catch (Exception ignored) {
        }
      }
    }
    applyPlaceholderAliases(values);
    return values;
  }

  private void applyPlaceholderAliases(Map<String, String> values) {
    if (values == null || values.isEmpty()) return;
    Map<String, String> aliases = new LinkedHashMap<>();
    for (Map.Entry<String, String> entry : values.entrySet()) {
      String key = safe(entry.getKey());
      if (key.isBlank()) continue;
      String value = entry.getValue() == null ? "" : entry.getValue();
      String lower = key.toLowerCase(java.util.Locale.ROOT);
      aliases.putIfAbsent(lower, value);
      aliases.putIfAbsent(lower.replace("_", ""), value);
      aliases.putIfAbsent(toSnakeCase(key), value);
    }
    values.putAll(aliases);
  }

  private String toSnakeCase(String input) {
    String key = safe(input);
    if (key.isBlank()) return "";
    String withUnderscores = key
      .replaceAll("([a-z0-9])([A-Z])", "$1_$2")
      .replaceAll("[\\s\\-]+", "_");
    return withUnderscores.toLowerCase(java.util.Locale.ROOT);
  }

  private void sendPlayerSidebar(ServerPlayerEntity player,
                                 SidebarView previous,
                                 String objectiveName,
                                 String title,
                                 List<String> lines) {
    try {
      ScoreboardObjective objective = new ScoreboardObjective(
        new Scoreboard(),
        objectiveName,
        ScoreboardCriterion.DUMMY,
        Text.literal(title),
        ScoreboardCriterion.RenderType.INTEGER,
        true,
        BlankNumberFormat.INSTANCE
      );
      if (previous != null) {
        sendPacket(player, new ScoreboardObjectiveUpdateS2CPacket(objective, 1));
      }
      sendPacket(player, new ScoreboardObjectiveUpdateS2CPacket(objective, 0));
      sendPacket(player, new ScoreboardDisplayS2CPacket(ScoreboardDisplaySlot.SIDEBAR, objective));
      if (previous != null) {
        for (String oldLine : previous.lines()) {
          if (!lines.contains(oldLine)) {
            sendPacket(player, new ScoreboardScoreResetS2CPacket(oldLine, objectiveName));
          }
        }
      }
      int score = Math.max(1, lines.size());
      for (String line : lines) {
        sendPacket(player, new ScoreboardScoreUpdateS2CPacket(
          line,
          objectiveName,
          score--,
          Optional.empty(),
          Optional.empty()
        ));
      }
    } catch (Exception ignored) {
    }
  }

  private void sendPacket(ServerPlayerEntity player, net.minecraft.network.packet.Packet<?> packet) {
    if (player == null || packet == null || player.networkHandler == null) return;
    try {
      player.networkHandler.sendPacket(packet);
    } catch (Exception ignored) {
    }
  }

  private String objectiveNameFor(ServerPlayerEntity player) {
    String raw = player == null ? "" : safe(player.getUuidAsString()).replace("-", "");
    if (raw.length() > 10) raw = raw.substring(0, 10);
    if (raw.isBlank()) raw = "player";
    return SIDEBAR_OBJECTIVE_PREFIX + raw;
  }

  private String ensureUnique(String line, int index) {
    String base = (line == null) ? " " : line;
    if (base.isBlank()) base = " ";
    // Entries must be unique. Add color control suffix so visual text stays the same.
    return base + Formatting.RESET + Formatting.values()[index % Formatting.values().length];
  }

  private String trimForSidebar(String input, int maxLen) {
    if (input == null) return "";
    if (input.length() <= maxLen) return input;
    return input.substring(0, maxLen);
  }

  private String joinLines(List<String> lines, Map<String, String> values) {
    if (lines == null || lines.isEmpty()) return "";
    StringBuilder builder = new StringBuilder();
    for (int i = 0; i < lines.size(); i++) {
      String line = TemplateEngine.render(lines.get(i), values);
      if (i > 0) builder.append('\n');
      builder.append(line == null ? "" : line);
    }
    return builder.toString();
  }

  private void applyTabSortTeam(Scoreboard scoreboard, ServerPlayerEntity player, String teamSortKeyRaw,
                                String prefix, String suffix, boolean alphabetical) {
    if (scoreboard == null || player == null) return;
    String scoreHolder = player.getGameProfile().getName();
    Team existing = scoreboard.getScoreHolderTeam(scoreHolder);
    if (existing != null && existing.getName() != null && existing.getName().startsWith(TAB_TEAM_PREFIX)) {
      scoreboard.removeScoreHolderFromTeam(scoreHolder, existing);
    }
    int order = 99;
    try {
      order = Integer.parseInt(safe(teamSortKeyRaw));
    } catch (Exception e) {
      order = 99;
    }
    order = Math.max(0, Math.min(99, order));
    String name = buildTeamName(order, scoreHolder, alphabetical);
    Team sortTeam = scoreboard.getTeam(name);
    if (sortTeam == null) {
      sortTeam = scoreboard.addTeam(name);
      sortTeam.setDisplayName(Text.literal(name));
    }
    sortTeam.setPrefix(Text.literal(prefix == null ? "" : prefix));
    sortTeam.setSuffix(Text.literal(suffix == null ? "" : suffix));
    scoreboard.addScoreHolderToTeam(scoreHolder, sortTeam);
  }

  private String buildTeamName(int order, String playerName, boolean alphabetical) {
    String key = alphabetical ? safe(playerName).toLowerCase(java.util.Locale.ROOT) : Integer.toHexString(playerName.hashCode());
    if (key.isBlank()) key = "player";
    String base = TAB_TEAM_PREFIX + String.format(java.util.Locale.ROOT, "%02d", order) + "_";
    String out = base + key;
    if (out.length() <= 64) return out;
    return out.substring(0, 64);
  }

  private int teamSortOrder(ServerFeatureConfig cfg, String teamIdRaw) {
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

  private String colorForTeam(String teamId) {
    if (teamId == null) return "gray";
    return switch (teamId.toLowerCase(java.util.Locale.ROOT)) {
      case "valor" -> "red";
      case "mystic" -> "blue";
      case "instinct" -> "yellow";
      default -> "gray";
    };
  }

  private String tabPrefix(String format, Map<String, String> values) {
    if (format == null || format.isBlank()) return "";
    int idx = format.indexOf("{player}");
    if (idx < 0) return TemplateEngine.render(format, values);
    String prefix = format.substring(0, idx);
    return TemplateEngine.render(prefix, values);
  }

  private String tabSuffix(String format, Map<String, String> values) {
    if (format == null || format.isBlank()) return "";
    int idx = format.indexOf("{player}");
    if (idx < 0) return "";
    String suffix = format.substring(idx + "{player}".length());
    return TemplateEngine.render(suffix, values);
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private record SidebarView(String objectiveName, String title, List<String> lines) {
  }
}
