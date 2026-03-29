package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.decoration.ArmorStandEntity;
import net.minecraft.registry.RegistryKey;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.scoreboard.ScoreHolder;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.ScoreboardCriterion;
import net.minecraft.scoreboard.ScoreboardObjective;
import net.minecraft.scoreboard.ScoreboardDisplaySlot;
import net.minecraft.scoreboard.number.BlankNumberFormat;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TeamScoreboardService {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final String HOLOGRAM_TAG = "sogki_team_hologram";
  private static final double LEGACY_CLEANUP_RADIUS_SQ = 10.0D * 10.0D;
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("team-scoreboard.json");

  private ScoreboardState state = new ScoreboardState();
  private long lastRefreshTick;

  public void load() {
    try {
      if (Files.notExists(STORE_PATH)) return;
      String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
      ScoreboardState parsed = GSON.fromJson(raw, ScoreboardState.class);
      if (parsed != null) state = parsed;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load team scoreboard state: {}", e.getMessage());
    }
    if (state == null) state = new ScoreboardState();
    if (state.hologramLineUuids == null) state.hologramLineUuids = new ArrayList<>();
  }

  public void save() {
    try {
      FileWriteUtil.writeJsonAtomic(STORE_PATH, GSON, state);
    } catch (IOException e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save team scoreboard state: {}", e.getMessage());
    }
  }

  public void tick(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, TeamMissionService missions, long tick) {
    if (server == null || cfg == null || cfg.teams == null || !cfg.teams.enabled || cfg.teams.scoreboard == null) return;
    if (state.deleted) return;
    int refresh = Math.max(1, cfg.teams.scoreboard.refreshTicks);
    if (tick - lastRefreshTick < refresh) return;
    lastRefreshTick = tick;
    refresh(server, cfg, teams, missions);
  }

  public void setupAtPlayer(MinecraftServer server, ServerPlayerEntity player, ServerFeatureConfig cfg) {
    clearHologramsEverywhere(server, cfg);
    state.deleted = false;
    state.hologramDimension = player.getWorld().getRegistryKey().getValue().toString();
    state.hologramX = player.getX();
    state.hologramY = player.getEyeY();
    state.hologramZ = player.getZ();
    state.hologramLineUuids = new ArrayList<>();
    state.hasSetup = true;
    save();
  }

  public void refresh(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, TeamMissionService missions) {
    if (state.deleted) return;
    updateObjective(server, cfg, teams, missions);
    if (!cfg.teams.scoreboard.hologramEnabled) return;
    updateHologram(server, cfg, teams, missions);
    save();
  }

  public void clearHolograms(MinecraftServer server) {
    ServerWorld world = resolveWorld(server, state.hologramDimension);
    if (world == null) return;
    for (String uuid : state.hologramLineUuids) {
      Entity entity = resolveEntity(world, uuid);
      if (entity != null) entity.discard();
    }
    state.hologramLineUuids = new ArrayList<>();
    save();
  }

  public void clearHologramsEverywhere(MinecraftServer server, ServerFeatureConfig cfg) {
    if (server == null) return;
    clearHolograms(server);
    List<Anchor> anchors = buildKnownAnchors(cfg);
    for (ServerWorld world : server.getWorlds()) {
      if (world == null) continue;
      for (Entity entity : world.iterateEntities()) {
        ArmorStandEntity stand = asArmorStand(entity);
        if (stand == null) continue;
        if (stand.getCommandTags().contains(HOLOGRAM_TAG)) {
          stand.discard();
          continue;
        }
        if (looksLikeLegacyHologramLine(stand, world, anchors)) {
          stand.discard();
        }
      }
    }
    state.hologramLineUuids = new ArrayList<>();
    save();
  }

  public void deleteScoreboard(MinecraftServer server, ServerFeatureConfig cfg) {
    if (server == null || cfg == null || cfg.teams == null || cfg.teams.scoreboard == null) return;
    clearHologramsEverywhere(server, cfg);
    Scoreboard scoreboard = server.getScoreboard();
    ScoreboardObjective objective = scoreboard.getNullableObjective(cfg.teams.scoreboard.objectiveName);
    if (objective != null) {
      if (scoreboard.getObjectiveForSlot(ScoreboardDisplaySlot.SIDEBAR) == objective) {
        scoreboard.setObjectiveSlot(ScoreboardDisplaySlot.SIDEBAR, null);
      }
      scoreboard.removeObjective(objective);
    }
    state.deleted = true;
    state.hasSetup = false;
    state.hologramLineUuids = new ArrayList<>();
    save();
  }

  private void updateObjective(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, TeamMissionService missions) {
    Scoreboard scoreboard = server.getScoreboard();
    String objectiveName = cfg.teams.scoreboard.objectiveName;
    String objectiveTitle = TemplateEngine.render(cfg.teams.scoreboard.objectiveTitle, Map.of());
    ScoreboardObjective objective = scoreboard.getNullableObjective(objectiveName);
    if (objective == null) {
      objective = scoreboard.addObjective(
        objectiveName,
        ScoreboardCriterion.DUMMY,
        Text.literal(objectiveTitle),
        ScoreboardCriterion.RenderType.INTEGER,
        true,
        BlankNumberFormat.INSTANCE
      );
    } else {
      objective.setDisplayName(Text.literal(objectiveTitle));
    }

    for (TeamMissionService.TeamStanding standing : missions.standings(cfg, teams)) {
      ScoreHolder holder = ScoreHolder.fromName("team_" + standing.team().id());
      scoreboard.getOrCreateScore(holder, objective).setScore(standing.points());
    }
  }

  private void updateHologram(MinecraftServer server, ServerFeatureConfig cfg, TeamService teams, TeamMissionService missions) {
    ServerWorld world = resolveWorld(server, state.hasSetup ? state.hologramDimension : cfg.teams.scoreboard.hologramDimension);
    if (world == null) return;
    double baseX = state.hasSetup ? state.hologramX : cfg.teams.scoreboard.hologramX;
    double baseY = state.hasSetup ? state.hologramY : cfg.teams.scoreboard.hologramY;
    double baseZ = state.hasSetup ? state.hologramZ : cfg.teams.scoreboard.hologramZ;
    double spacing = Math.max(0.05D, cfg.teams.scoreboard.hologramLineSpacing);
    List<String> lines = buildLines(cfg, teams, missions);

    List<String> uuids = new ArrayList<>(state.hologramLineUuids);
    List<String> next = new ArrayList<>();
    for (int i = 0; i < lines.size(); i++) {
      String line = lines.get(i);
      double y = baseY - (i * spacing);
      ArmorStandEntity stand = null;
      if (i < uuids.size()) {
        stand = asArmorStand(resolveEntity(world, uuids.get(i)));
      }
      if (stand == null) {
        stand = EntityType.ARMOR_STAND.create(world);
        if (stand == null) continue;
        stand.setPosition(baseX, y, baseZ);
        stand.setInvisible(true);
        stand.setNoGravity(true);
        stand.setCustomNameVisible(true);
        stand.setSilent(true);
        stand.addCommandTag(HOLOGRAM_TAG);
        world.spawnEntity(stand);
      } else {
        stand.setPosition(baseX, y, baseZ);
        if (!stand.getCommandTags().contains(HOLOGRAM_TAG)) {
          stand.addCommandTag(HOLOGRAM_TAG);
        }
      }
      stand.setCustomName(Text.literal(line));
      next.add(stand.getUuidAsString());
    }

    for (int i = lines.size(); i < uuids.size(); i++) {
      Entity extra = resolveEntity(world, uuids.get(i));
      if (extra != null) extra.discard();
    }
    state.hologramLineUuids = next;
    state.hologramDimension = world.getRegistryKey().getValue().toString();
    state.hologramX = baseX;
    state.hologramY = baseY;
    state.hologramZ = baseZ;
  }

  private List<String> buildLines(ServerFeatureConfig cfg, TeamService teams, TeamMissionService missions) {
    List<String> lines = new ArrayList<>();
    lines.add(TemplateEngine.render(cfg.teams.scoreboard.hologramTitle, Map.of()));
    if (cfg.teams.scoreboard.hologramBlankLineAfterTitle) {
      lines.add(" ");
    }
    int rank = 1;
    for (TeamMissionService.TeamStanding standing : missions.standings(cfg, teams)) {
      TeamId team = standing.team();
      Map<String, String> values = new java.util.HashMap<>();
      values.put("rank", String.valueOf(rank));
      values.put("team", team.id());
      values.put("teamDisplay", teams.teamDisplay(cfg, team));
      values.put("teamPoints", String.valueOf(standing.points()));
      values.put("teamTotalCatches", String.valueOf(standing.catches()));
      values.put("teamTotalQuizzes", String.valueOf(standing.quizzes()));
      values.put("teamMissionsCompleted", String.valueOf(standing.missionsCompleted()));
      lines.add(TemplateEngine.render(cfg.teams.scoreboard.hologramRankLine, values));
      if (cfg.teams.scoreboard.hologramShowDetailLine) {
        lines.add(TemplateEngine.render(cfg.teams.scoreboard.hologramDetailLine, values));
      }
      rank++;
    }
    return lines;
  }

  private ServerWorld resolveWorld(MinecraftServer server, String dimension) {
    Identifier id = Identifier.tryParse(dimension == null || dimension.isBlank() ? "minecraft:overworld" : dimension);
    if (id == null) return null;
    RegistryKey<net.minecraft.world.World> key = RegistryKey.of(RegistryKeys.WORLD, id);
    return server.getWorld(key);
  }

  private Entity resolveEntity(ServerWorld world, String uuidRaw) {
    if (world == null || uuidRaw == null || uuidRaw.isBlank()) return null;
    try {
      return world.getEntity(UUID.fromString(uuidRaw));
    } catch (Exception ignored) {
      return null;
    }
  }

  private ArmorStandEntity asArmorStand(Entity entity) {
    return entity instanceof ArmorStandEntity stand ? stand : null;
  }

  private List<Anchor> buildKnownAnchors(ServerFeatureConfig cfg) {
    List<Anchor> anchors = new ArrayList<>();
    String stateDim = normalizeDimension(state.hologramDimension);
    anchors.add(new Anchor(stateDim, state.hologramX, state.hologramY, state.hologramZ));
    if (cfg != null && cfg.teams != null && cfg.teams.scoreboard != null) {
      String cfgDim = normalizeDimension(cfg.teams.scoreboard.hologramDimension);
      anchors.add(new Anchor(cfgDim, cfg.teams.scoreboard.hologramX, cfg.teams.scoreboard.hologramY, cfg.teams.scoreboard.hologramZ));
    }
    return anchors;
  }

  private boolean looksLikeLegacyHologramLine(ArmorStandEntity stand, ServerWorld world, List<Anchor> anchors) {
    if (stand == null || world == null) return false;
    if (!stand.isInvisible()) return false;
    if (!stand.hasNoGravity()) return false;
    if (!stand.isCustomNameVisible()) return false;
    if (!stand.isSilent()) return false;
    if (stand.getCustomName() == null) return false;
    String worldId = world.getRegistryKey().getValue().toString();
    for (Anchor anchor : anchors) {
      if (anchor == null) continue;
      if (!worldId.equals(anchor.dimension())) continue;
      double dx = stand.getX() - anchor.x();
      double dy = stand.getY() - anchor.y();
      double dz = stand.getZ() - anchor.z();
      double distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq <= LEGACY_CLEANUP_RADIUS_SQ) return true;
    }
    return false;
  }

  private String normalizeDimension(String value) {
    if (value == null || value.isBlank()) return "minecraft:overworld";
    return value;
  }

  private static final class ScoreboardState {
    boolean deleted;
    boolean hasSetup;
    String hologramDimension = "minecraft:overworld";
    double hologramX = 0.0D;
    double hologramY = 80.0D;
    double hologramZ = 0.0D;
    List<String> hologramLineUuids = new ArrayList<>();
  }

  private record Anchor(String dimension, double x, double y, double z) {
  }
}
