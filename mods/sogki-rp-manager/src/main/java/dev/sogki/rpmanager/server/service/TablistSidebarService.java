package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.network.packet.s2c.play.PlayerListHeaderS2CPacket;
import net.minecraft.scoreboard.ScoreHolder;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.ScoreboardCriterion;
import net.minecraft.scoreboard.ScoreboardDisplaySlot;
import net.minecraft.scoreboard.ScoreboardObjective;
import net.minecraft.scoreboard.number.BlankNumberFormat;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class TablistSidebarService {
  private long lastTabRefreshTick;
  private long lastSidebarRefreshTick;

  public void tick(MinecraftServer server, ServerFeatureConfig config, long tick) {
    int tabInterval = config.tablist.realtimeCoordinates ? 1 : Math.max(20, config.tablist.refreshTicks);
    int sideInterval = config.sidebar.realtimeCoordinates ? 1 : Math.max(20, config.sidebar.refreshTicks);
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
    for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
      Map<String, String> values = TemplateEngine.baseMap(server, player, config.brand);
      String headerText = joinLines(config.tablist.header, values);
      String footerText = joinLines(config.tablist.footer, values);
      sendHeaderFooterPacket(player, Text.literal(headerText), Text.literal(footerText));
    }
  }

  private void sendHeaderFooterPacket(ServerPlayerEntity player, Text header, Text footer) {
    player.networkHandler.sendPacket(new PlayerListHeaderS2CPacket(header, footer));
  }

  private void refreshSidebar(MinecraftServer server, ServerFeatureConfig config) {
    Scoreboard scoreboard = server.getScoreboard();
    ScoreboardObjective old = scoreboard.getNullableObjective("sogki_sidebar");
    if (old != null) {
      scoreboard.removeObjective(old);
    }

    String titleRaw = TemplateEngine.render(config.sidebar.title, Map.of("brand", config.brand));
    String title = trimForSidebar(titleRaw, 32);
    ScoreboardObjective objective = scoreboard.addObjective(
      "sogki_sidebar",
      ScoreboardCriterion.DUMMY,
      Text.literal(title),
      ScoreboardCriterion.RenderType.INTEGER,
      true,
      BlankNumberFormat.INSTANCE
    );
    scoreboard.setObjectiveSlot(ScoreboardDisplaySlot.SIDEBAR, objective);

    List<String> rendered = renderSidebarLines(server, config);
    int score = Math.min(15, rendered.size());
    for (String line : rendered) {
      ScoreHolder holder = ScoreHolder.fromName(line);
      scoreboard.getOrCreateScore(holder, objective).setScore(score--);
    }
  }

  private List<String> renderSidebarLines(MinecraftServer server, ServerFeatureConfig config) {
    List<String> lines = config.sidebar.lines;
    if (lines == null || lines.isEmpty()) return List.of();

    ServerPlayerEntity reference = server.getPlayerManager().getPlayerList().isEmpty()
      ? null
      : server.getPlayerManager().getPlayerList().get(0);
    Map<String, String> values = TemplateEngine.baseMap(server, reference, config.brand);

    List<String> out = new ArrayList<>();
    for (int i = 0; i < lines.size() && i < 15; i++) {
      String rendered = TemplateEngine.render(lines.get(i), values);
      out.add(ensureUnique(trimForSidebar(rendered, 40), i));
    }
    return out;
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
}
