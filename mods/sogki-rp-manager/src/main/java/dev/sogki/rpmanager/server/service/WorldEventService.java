package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.block.BlockState;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

public final class WorldEventService {
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path CONFIG_PATH = BASE_DIR.resolve("world-events.json");
  private static final Path STATE_PATH = BASE_DIR.resolve("world-events-state.json");
  private final Logger logger;
  private WorldEventConfig config = defaults();
  private WorldEventState state = new WorldEventState();
  private long lastTickApplied;
  private int lastCycle = -1;
  private String activeEventId = "";
  private String runtimeActiveWindowKey = "";
  private String runtimeActiveEventId = "";
  private boolean runtimeInitialized;

  public WorldEventService(Logger logger) {
    this.logger = logger;
  }

  public void load() {
    try {
      Files.createDirectories(BASE_DIR);
      if (Files.notExists(CONFIG_PATH)) {
        FileWriteUtil.writeJsonAtomic(CONFIG_PATH, GSON, defaults());
      }
      String raw = Files.readString(CONFIG_PATH, StandardCharsets.UTF_8);
      WorldEventConfig parsed = GSON.fromJson(raw, WorldEventConfig.class);
      this.config = parsed == null ? defaults() : parsed;
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to load world events config, using defaults: {}", e.getMessage());
      this.config = defaults();
    }
    ensureDefaults(this.config);
    try {
      if (Files.notExists(STATE_PATH)) {
        this.state = new WorldEventState();
        saveState();
      } else {
        String raw = Files.readString(STATE_PATH, StandardCharsets.UTF_8);
        WorldEventState parsed = GSON.fromJson(raw, WorldEventState.class);
        this.state = parsed == null ? new WorldEventState() : parsed;
      }
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to load world events state, resetting state: {}", e.getMessage());
      this.state = new WorldEventState();
    }
  }

  public void save() {
    saveState();
  }

  public List<String> eventIds() {
    List<String> out = new ArrayList<>();
    if (config == null || config.events == null) return out;
    for (WorldEventDefinition event : config.events) {
      if (event == null) continue;
      String id = normalize(event.id);
      if (id.isBlank()) continue;
      out.add(id);
    }
    return out;
  }

  public CommandResult forceStart(String eventIdRaw) {
    String eventId = normalize(eventIdRaw);
    if (eventId.isBlank()) {
      return CommandResult.error("Provide an event id.");
    }
    WorldEventDefinition event = eventById(eventId);
    if (event == null) {
      return CommandResult.error("Unknown event id: " + eventId);
    }
    state.forcedEventId = eventId;
    state.lastActiveEventId = eventId;
    saveState();
    return CommandResult.success("Forced event started: " + safe(event.name) + " (" + eventId + ").");
  }

  public CommandResult forceEnd() {
    if (safe(state.forcedEventId).isBlank()) {
      return CommandResult.error("No forced event is currently active.");
    }
    String ended = state.forcedEventId;
    state.forcedEventId = "";
    saveState();
    return CommandResult.success("Forced event ended: " + ended + ". Schedule control restored.");
  }

  public EventStatus status() {
    ZonedDateTime now = ZonedDateTime.now(resolveZone());
    ActiveEventWindow window = activeEventWindow(now);
    WorldEventDefinition active = window == null ? null : window.event();
    boolean forced = !safe(state.forcedEventId).isBlank();
    String id = active == null ? "" : normalize(active.id);
    String name = active == null ? "None" : safe(active.name);
    String mode = forced ? "forced" : "scheduled";
    String startUtc = window == null ? "" : window.start().withZoneSameInstant(ZoneOffset.UTC).toString();
    String endUtc = window == null ? "" : window.end().withZoneSameInstant(ZoneOffset.UTC).toString();
    String nextUtc = nextScheduledWindowUtc(now);
    return new EventStatus(forced, safe(state.forcedEventId), id, name, mode, startUtc, endUtc, nextUtc);
  }

  private String nextScheduledWindowUtc(ZonedDateTime now) {
    if (config == null || config.events == null || config.events.isEmpty()) return "";
    ZonedDateTime best = null;
    for (WorldEventDefinition event : config.events) {
      if (event == null || !event.enabled || event.schedule == null || event.schedule.isEmpty()) continue;
      for (EventScheduleEntry slot : event.schedule) {
        if (slot == null || !slot.enabled) continue;
        ZonedDateTime next = nextWindowStart(slot, now);
        if (next == null) continue;
        if (best == null || next.isBefore(best)) best = next;
      }
    }
    return best == null ? "" : best.withZoneSameInstant(ZoneOffset.UTC).toString();
  }

  private ZonedDateTime nextWindowStart(EventScheduleEntry slot, ZonedDateTime now) {
    Integer dow = parseDayOfWeek(slot == null ? "" : slot.dayOfWeek);
    if (dow == null) return null;
    LocalTime time = parseTime(slot.startTimeUtc);
    int currentDow = now.getDayOfWeek().getValue();
    int diff = dow - currentDow;
    if (diff < 0) diff += 7;
    ZonedDateTime next = now.toLocalDate().plusDays(diff).atTime(time).atZone(now.getZone());
    if (!next.isAfter(now)) next = next.plusDays(7);
    return next;
  }

  public void tick(MinecraftServer server,
                   ServerFeatureConfig cfg,
                   long tick,
                   SkillTreeService skills,
                   DiscordStatusService discord) {
    if (server == null || skills == null) return;
    if (tick - lastTickApplied < 20) return;
    lastTickApplied = tick;
    if (!config.enabled || config.events.isEmpty()) {
      skills.setEventPointChanceModifiers(Map.of(), Map.of(), Map.of());
      activeEventId = "";
      runtimeActiveWindowKey = "";
      runtimeActiveEventId = "";
      runtimeInitialized = true;
      return;
    }

    long today = LocalDate.now(ZoneOffset.UTC).toEpochDay();
    int cycle = activeCycle(today);
    ActiveEventWindow activeWindow = activeEventWindow(ZonedDateTime.now(resolveZone()));
    WorldEventDefinition active = activeWindow == null ? null : activeWindow.event();
    String id = active == null ? "" : normalize(active.id);
    boolean forced = !safe(state.forcedEventId).isBlank();
    boolean legacyWindow = activeWindow != null && safe(activeWindow.windowKey()).startsWith("legacy:");
    if (active != null) {
      if (legacyWindow && (cycle != lastCycle || !id.equals(activeEventId))) {
        lastCycle = cycle;
        activeEventId = id;
        if (!forced && config.announceOnRotate && state.lastAnnouncedCycle != cycle) {
          announceRotation(server, active);
          state.lastAnnouncedCycle = cycle;
        }
        state.lastActiveEventId = id;
        saveState();
      } else if (!legacyWindow && !id.equals(activeEventId)) {
        activeEventId = id;
        state.lastActiveEventId = id;
        saveState();
      }
    } else if (!activeEventId.isBlank()) {
      activeEventId = "";
    }
    if (!runtimeInitialized) {
      runtimeInitialized = true;
      runtimeActiveEventId = id;
      runtimeActiveWindowKey = activeWindow == null ? "" : safe(activeWindow.windowKey());
    } else {
      handleRuntimeTransition(server, cfg, discord, activeWindow);
    }
    if (active == null) {
      skills.setEventPointChanceModifiers(Map.of(), Map.of(), Map.of());
      return;
    }
    skills.setEventPointChanceModifiers(
      active.skillPointChanceBonusPercentBySource,
      active.skillPointChanceMultiplierBySource,
      active.skillPointFlatBonusBySource
    );
  }

  public double catchRateMultiplier() {
    ActiveEventWindow activeWindow = activeEventWindow(ZonedDateTime.now(resolveZone()));
    WorldEventDefinition active = activeWindow == null ? null : activeWindow.event();
    if (active == null) return 1.0D;
    return Math.max(0.0D, 1.0D + (Math.max(0.0D, active.catchRateBonusPercent) / 100.0D));
  }

  public void onBlockBroken(ServerPlayerEntity player, BlockState state, SkillTreeService skills) {
    if (player == null || state == null || skills == null) return;
    if (!config.enabled || !config.mining.enabled) return;
    ActiveEventWindow activeWindow = activeEventWindow(ZonedDateTime.now(resolveZone()));
    WorldEventDefinition active = activeWindow == null ? null : activeWindow.event();
    if (active == null) return;
    if (!matchesMiningFilter(active, state)) return;

    double chancePercent = Math.max(0.0D, config.mining.baseLootChancePercent);
    chancePercent += Math.max(0.0D, active.miningLootBonusChancePercent);
    chancePercent *= Math.max(0.0D, 1.0D + (Math.max(0.0D, active.dropRateBonusPercent) / 100.0D));
    chancePercent = Math.max(0.0D, Math.min(100.0D, chancePercent));
    if (ThreadLocalRandom.current().nextDouble(100.0D) > chancePercent) {
      return;
    }

    int rolls = Math.max(1, config.mining.baseLootRolls + Math.max(0, active.miningLootBonusRolls));
    for (int i = 0; i < rolls; i++) {
      MiningLootEntry picked = pickWeighted(active.miningLoot);
      if (picked == null) continue;
      Identifier itemId = resolveItemId(picked);
      if (itemId == null || !Registries.ITEM.containsId(itemId)) continue;
      int min = Math.max(1, picked.countMin);
      int max = Math.max(min, picked.countMax);
      int amount = min == max ? min : ThreadLocalRandom.current().nextInt(min, max + 1);
      ItemStack stack = new ItemStack(Registries.ITEM.get(itemId), amount);
      boolean inserted = player.getInventory().insertStack(stack);
      if (!inserted || !stack.isEmpty()) {
        player.dropItem(stack, false);
      }
    }
  }

  private boolean matchesMiningFilter(WorldEventDefinition event, BlockState state) {
    Identifier id = Registries.BLOCK.getId(state.getBlock());
    if (id == null) return false;
    String blockId = id.toString().toLowerCase(Locale.ROOT);
    if (config.mining.onlyOres && !blockId.contains("ore")) {
      return false;
    }
    if (event.boostedOreBlocks == null || event.boostedOreBlocks.isEmpty()) {
      return true;
    }
    for (String raw : event.boostedOreBlocks) {
      if (normalize(raw).equals(blockId)) return true;
    }
    return false;
  }

  private MiningLootEntry pickWeighted(List<MiningLootEntry> entries) {
    if (entries == null || entries.isEmpty()) return null;
    double total = 0.0D;
    for (MiningLootEntry entry : entries) {
      if (entry == null) continue;
      total += Math.max(0.0D, entry.weight);
    }
    if (total <= 0.0D) return null;
    double roll = ThreadLocalRandom.current().nextDouble(total);
    double cursor = 0.0D;
    for (MiningLootEntry entry : entries) {
      if (entry == null) continue;
      cursor += Math.max(0.0D, entry.weight);
      if (roll <= cursor) return entry;
    }
    return entries.get(entries.size() - 1);
  }

  private Identifier resolveItemId(MiningLootEntry entry) {
    if (entry == null) return null;
    if (entry.itemIds != null) {
      for (String raw : entry.itemIds) {
        Identifier id = Identifier.tryParse(raw == null ? "" : raw.trim());
        if (id != null && Registries.ITEM.containsId(id)) return id;
      }
    }
    Identifier primary = Identifier.tryParse(entry.itemId == null ? "" : entry.itemId.trim());
    return primary != null && Registries.ITEM.containsId(primary) ? primary : null;
  }

  private void announceRotation(MinecraftServer server, WorldEventDefinition active) {
    if (server == null || active == null) return;
    Map<String, String> values = new HashMap<>();
    values.put("eventId", safe(active.id));
    values.put("eventName", safe(active.name));
    values.put("days", String.valueOf(Math.max(1, config.rotateEveryDays)));
    List<String> lines = config.rotationAnnouncementLines == null ? List.of() : config.rotationAnnouncementLines;
    if (lines.isEmpty()) {
      lines = List.of(safe(config.rotationAnnouncement));
    }
    for (String line : lines) {
      String rendered = TemplateEngine.render(safe(line), values);
      if (rendered.isBlank()) {
        server.getPlayerManager().broadcast(Text.literal(" "), false);
      } else {
        server.getPlayerManager().broadcast(Text.literal(rendered), false);
      }
    }
  }

  private int activeCycle(long dayEpoch) {
    if (config.events.isEmpty()) return -1;
    long anchor = config.cycleStartEpochDay <= 0L ? dayEpoch : config.cycleStartEpochDay;
    long elapsed = Math.max(0L, dayEpoch - anchor);
    int every = Math.max(1, config.rotateEveryDays);
    return (int) (elapsed / every);
  }

  private WorldEventDefinition activeEvent(long dayEpoch) {
    String forcedId = normalize(state == null ? "" : state.forcedEventId);
    if (!forcedId.isBlank()) {
      return eventById(forcedId);
    }
    return scheduledEvent(dayEpoch);
  }

  private ActiveEventWindow activeEventWindow(ZonedDateTime now) {
    if (now == null) now = ZonedDateTime.now(resolveZone());
    String forcedId = normalize(state == null ? "" : state.forcedEventId);
    if (!forcedId.isBlank()) {
      WorldEventDefinition forced = eventById(forcedId);
      if (forced != null) {
        ZonedDateTime start = now;
        ZonedDateTime end = now.plusDays(3650);
        return new ActiveEventWindow(forced, start, end, "forced:" + forcedId);
      }
    }
    ActiveEventWindow scheduled = scheduledActiveWindow(now);
    if (scheduled != null) return scheduled;

    // Legacy rotation fallback is only used when no explicit schedule windows are configured.
    if (hasAnyEnabledScheduleWindow()) return null;
    WorldEventDefinition legacy = scheduledEvent(now.withZoneSameInstant(ZoneOffset.UTC).toLocalDate().toEpochDay());
    if (legacy == null) return null;
    ZonedDateTime start = now.truncatedTo(java.time.temporal.ChronoUnit.DAYS);
    ZonedDateTime end = start.plusDays(Math.max(1, config.rotateEveryDays));
    return new ActiveEventWindow(legacy, start, end, "legacy:" + normalize(legacy.id));
  }

  private boolean hasAnyEnabledScheduleWindow() {
    if (config == null || config.events == null || config.events.isEmpty()) return false;
    for (WorldEventDefinition event : config.events) {
      if (event == null || !event.enabled || event.schedule == null || event.schedule.isEmpty()) continue;
      for (EventScheduleEntry slot : event.schedule) {
        if (slot != null && slot.enabled) return true;
      }
    }
    return false;
  }

  private ActiveEventWindow scheduledActiveWindow(ZonedDateTime now) {
    if (config == null || config.events == null || config.events.isEmpty()) return null;
    ActiveEventWindow best = null;
    for (WorldEventDefinition event : config.events) {
      if (event == null || !event.enabled) continue;
      if (event.schedule == null || event.schedule.isEmpty()) continue;
      for (EventScheduleEntry slot : event.schedule) {
        if (slot == null || !slot.enabled) continue;
        ActiveEventWindow candidate = toWindow(event, slot, now);
        if (candidate == null) continue;
        if (!candidate.includes(now)) continue;
        if (best == null || candidate.start().isAfter(best.start())) {
          best = candidate;
        }
      }
    }
    return best;
  }

  private ActiveEventWindow toWindow(WorldEventDefinition event, EventScheduleEntry slot, ZonedDateTime now) {
    if (event == null || slot == null || now == null) return null;
    Integer dow = parseDayOfWeek(slot.dayOfWeek);
    if (dow == null) return null;
    LocalTime startTime = parseTime(slot.startTimeUtc);
    int duration = Math.max(1, slot.durationMinutes);
    int currentDow = now.getDayOfWeek().getValue();
    int diff = currentDow - dow;
    if (diff < 0) diff += 7;
    LocalDate date = now.toLocalDate().minusDays(diff);
    LocalDateTime startLocal = LocalDateTime.of(date, startTime);
    ZonedDateTime start = startLocal.atZone(now.getZone());
    ZonedDateTime end = start.plusMinutes(duration);
    if (end.isBefore(now.minusDays(7))) return null;
    String key = normalize(event.id) + "|" + slot.dayOfWeek + "|" + slot.startTimeUtc + "|" + duration + "|" + start.toEpochSecond();
    return new ActiveEventWindow(event, start, end, key);
  }

  private Integer parseDayOfWeek(String raw) {
    String value = safe(raw).toUpperCase(Locale.ROOT);
    if (value.isBlank()) return null;
    return switch (value) {
      case "1", "MON", "MONDAY" -> 1;
      case "2", "TUE", "TUESDAY" -> 2;
      case "3", "WED", "WEDNESDAY" -> 3;
      case "4", "THU", "THURSDAY" -> 4;
      case "5", "FRI", "FRIDAY" -> 5;
      case "6", "SAT", "SATURDAY" -> 6;
      case "7", "SUN", "SUNDAY" -> 7;
      default -> null;
    };
  }

  private LocalTime parseTime(String raw) {
    String value = safe(raw);
    if (value.isBlank()) return LocalTime.of(0, 0);
    try {
      return LocalTime.parse(value);
    } catch (Exception ignored) {
      try {
        String[] parts = value.split(":");
        int h = parts.length > 0 ? Integer.parseInt(parts[0]) : 0;
        int m = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        return LocalTime.of(Math.max(0, Math.min(23, h)), Math.max(0, Math.min(59, m)));
      } catch (Exception ignored2) {
        return LocalTime.of(0, 0);
      }
    }
  }

  private ZoneId resolveZone() {
    String value = safe(config.timezone);
    if (value.isBlank()) return ZoneOffset.UTC;
    try {
      return ZoneId.of(value);
    } catch (Exception ignored) {
      return ZoneOffset.UTC;
    }
  }

  private void handleRuntimeTransition(MinecraftServer server,
                                       ServerFeatureConfig cfg,
                                       DiscordStatusService discord,
                                       ActiveEventWindow activeWindow) {
    String newKey = activeWindow == null ? "" : safe(activeWindow.windowKey());
    String newId = activeWindow == null ? "" : normalize(activeWindow.event().id);
    if (newKey.equals(runtimeActiveWindowKey) && newId.equals(runtimeActiveEventId)) {
      return;
    }
    ActiveEventWindow previousWindow = runtimeActiveWindowKey.isBlank() ? null : resolveWindowByKey(runtimeActiveWindowKey);
    if (previousWindow != null) {
      announceEventEnd(server, cfg, discord, previousWindow);
    }
    if (activeWindow != null) {
      announceEventStart(server, cfg, discord, activeWindow);
    }
    runtimeActiveWindowKey = newKey;
    runtimeActiveEventId = newId;
  }

  private ActiveEventWindow resolveWindowByKey(String key) {
    if (safe(key).isBlank()) return null;
    ZonedDateTime now = ZonedDateTime.now(resolveZone());
    if (key.startsWith("forced:")) {
      String id = key.substring("forced:".length());
      WorldEventDefinition event = eventById(id);
      if (event == null) return null;
      return new ActiveEventWindow(event, now.minusMinutes(1), now.plusMinutes(1), key);
    }
    for (WorldEventDefinition event : config.events) {
      if (event == null || event.schedule == null) continue;
      for (EventScheduleEntry slot : event.schedule) {
        ActiveEventWindow window = toWindow(event, slot, now);
        if (window != null && key.equals(window.windowKey())) return window;
      }
    }
    WorldEventDefinition legacy = eventById(key.replace("legacy:", ""));
    if (legacy == null) return null;
    return new ActiveEventWindow(legacy, now.minusMinutes(1), now.plusMinutes(1), key);
  }

  private void announceEventStart(MinecraftServer server,
                                  ServerFeatureConfig cfg,
                                  DiscordStatusService discord,
                                  ActiveEventWindow window) {
    if (server == null || window == null) return;
    WorldEventDefinition event = window.event();
    Map<String, String> values = eventValues(event, window);
    List<String> lines = event.startAnnouncementLines == null || event.startAnnouncementLines.isEmpty()
      ? config.startAnnouncementLines
      : event.startAnnouncementLines;
    broadcastLines(server, lines, values);
    if (discord != null && cfg != null && config.discordAnnouncements) {
      String title = safe(event.discordTitleStart).isBlank() ? config.discordTitleStart : event.discordTitleStart;
      String desc = safe(event.discordDescriptionStart).isBlank()
        ? joinLines(lines == null ? List.of() : lines)
        : event.discordDescriptionStart;
      int color = event.discordColor <= 0 ? config.discordEventColor : event.discordColor;
      discord.sendCustomEmbed(server, cfg, title, desc, color, values);
    }
  }

  private void announceEventEnd(MinecraftServer server,
                                ServerFeatureConfig cfg,
                                DiscordStatusService discord,
                                ActiveEventWindow window) {
    if (server == null || window == null) return;
    WorldEventDefinition event = window.event();
    Map<String, String> values = eventValues(event, window);
    List<String> lines = event.endAnnouncementLines == null || event.endAnnouncementLines.isEmpty()
      ? config.endAnnouncementLines
      : event.endAnnouncementLines;
    broadcastLines(server, lines, values);
    if (discord != null && cfg != null && config.discordAnnouncements) {
      String title = safe(event.discordTitleEnd).isBlank() ? config.discordTitleEnd : event.discordTitleEnd;
      String desc = safe(event.discordDescriptionEnd).isBlank()
        ? joinLines(lines == null ? List.of() : lines)
        : event.discordDescriptionEnd;
      int color = event.discordColor <= 0 ? config.discordEventColor : event.discordColor;
      discord.sendCustomEmbed(server, cfg, title, desc, color, values);
    }
  }

  private void broadcastLines(MinecraftServer server, List<String> lines, Map<String, String> values) {
    if (server == null || lines == null) return;
    for (String line : lines) {
      String rendered = TemplateEngine.render(safe(line), values == null ? Map.of() : values);
      if (rendered.isBlank()) {
        server.getPlayerManager().broadcast(Text.literal(" "), false);
      } else {
        server.getPlayerManager().broadcast(Text.literal(rendered), false);
      }
    }
  }

  private String joinLines(List<String> lines) {
    if (lines == null || lines.isEmpty()) return "";
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < lines.size(); i++) {
      if (i > 0) out.append('\n');
      out.append(lines.get(i) == null ? "" : lines.get(i));
    }
    return out.toString();
  }

  private Map<String, String> eventValues(WorldEventDefinition event, ActiveEventWindow window) {
    Map<String, String> values = new HashMap<>();
    boolean forcedWindow = window != null && safe(window.windowKey()).startsWith("forced:");
    int totalMinutes = window == null ? 0 : Math.max(1, window.durationMinutes());
    int durationDays = totalMinutes / 1440;
    int remainderAfterDays = totalMinutes % 1440;
    int durationHours = remainderAfterDays / 60;
    int durationRemainderMinutes = remainderAfterDays % 60;
    values.put("eventId", event == null ? "" : safe(event.id));
    values.put("eventName", event == null ? "" : safe(event.name));
    values.put("durationMinutes", String.valueOf(totalMinutes));
    values.put("durationDays", String.valueOf(durationDays));
    values.put("durationHours", String.valueOf(durationHours));
    values.put("durationRemainderMinutes", String.valueOf(durationRemainderMinutes));
    values.put("durationText", forcedWindow ? "until manually ended" : formatDurationDaysHoursMinutes(totalMinutes));
    values.put("isForced", forcedWindow ? "true" : "false");
    values.put("startUtc", window == null ? "" : window.start().withZoneSameInstant(ZoneOffset.UTC).toString());
    values.put("endUtc", window == null ? "" : window.end().withZoneSameInstant(ZoneOffset.UTC).toString());
    values.put("catchRateBonusPercent", event == null ? "0" : String.valueOf((int) Math.round(event.catchRateBonusPercent)));
    values.put("dropRateBonusPercent", event == null ? "0" : String.valueOf((int) Math.round(event.dropRateBonusPercent)));
    values.put("miningLootBonusChancePercent", event == null ? "0" : String.valueOf((int) Math.round(event.miningLootBonusChancePercent)));
    values.put("miningLootBonusRolls", event == null ? "0" : String.valueOf(Math.max(0, event.miningLootBonusRolls)));
    values.put("spawnRateBonusPercent", event == null ? "0" : String.valueOf((int) Math.round(event.spawnRateBonusPercent)));
    return values;
  }

  private String formatDurationDaysHoursMinutes(int totalMinutes) {
    int safeMinutes = Math.max(0, totalMinutes);
    int days = safeMinutes / 1440;
    int remainderAfterDays = safeMinutes % 1440;
    int hours = remainderAfterDays / 60;
    int remainderMinutes = remainderAfterDays % 60;
    String dayLabel = days == 1 ? "day" : "days";
    String hourLabel = hours == 1 ? "hour" : "hours";
    String minuteLabel = remainderMinutes == 1 ? "minute" : "minutes";
    return days + " " + dayLabel + " " + hours + " " + hourLabel + " " + remainderMinutes + " " + minuteLabel;
  }

  private WorldEventDefinition scheduledEvent(long dayEpoch) {
    if (config.events == null || config.events.isEmpty()) return null;
    int cycle = activeCycle(dayEpoch);
    if (cycle < 0) return null;
    int index = Math.floorMod(cycle, config.events.size());
    if (index < 0 || index >= config.events.size()) return null;
    return config.events.get(index);
  }

  private WorldEventDefinition eventById(String eventIdRaw) {
    String eventId = normalize(eventIdRaw);
    if (eventId.isBlank() || config == null || config.events == null) return null;
    for (WorldEventDefinition event : config.events) {
      if (event == null) continue;
      if (normalize(event.id).equals(eventId)) return event;
    }
    return null;
  }

  private void saveState() {
    try {
      Files.createDirectories(BASE_DIR);
      FileWriteUtil.writeJsonAtomic(STATE_PATH, GSON, state);
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to save world events state: {}", e.getMessage());
    }
  }

  private void ensureDefaults(WorldEventConfig cfg) {
    if (cfg.events == null) cfg.events = new ArrayList<>();
    if (safe(cfg.timezone).isBlank()) cfg.timezone = "UTC";
    cfg.rotateEveryDays = Math.max(1, cfg.rotateEveryDays);
    if (safe(cfg.rotationAnnouncement).isBlank()) {
      cfg.rotationAnnouncement = "&6[Event] &eNow active: &f{eventName}&e.";
    }
    if (cfg.rotationAnnouncementLines == null) cfg.rotationAnnouncementLines = new ArrayList<>();
    if (cfg.rotationAnnouncementLines.isEmpty()) {
      cfg.rotationAnnouncementLines = new ArrayList<>(List.of(
        "&8&m----------------------------",
        "&6[Event] &eNow active: &f{eventName}",
        "",
        "&7Rotation: every &f{days} &7day(s)",
        "&8&m----------------------------"
      ));
    }
    if (cfg.startAnnouncementLines == null) cfg.startAnnouncementLines = new ArrayList<>();
    if (cfg.startAnnouncementLines.isEmpty()) {
      cfg.startAnnouncementLines = new ArrayList<>(List.of(
        "&8&m----------------------------",
        "&aEvent Started: &f{eventName}",
        "&7Duration: &f{durationText}",
        "&7Bonuses: &f+{catchRateBonusPercent}% catch &8| &f+{dropRateBonusPercent}% drops &8| &f+{spawnRateBonusPercent}% spawns",
        "&8&m----------------------------"
      ));
    }
    if (cfg.endAnnouncementLines == null) cfg.endAnnouncementLines = new ArrayList<>();
    if (cfg.endAnnouncementLines.isEmpty()) {
      cfg.endAnnouncementLines = new ArrayList<>(List.of(
        "&8&m----------------------------",
        "&cEvent Ended: &f{eventName}",
        "&7See you in the next scheduled window.",
        "&8&m----------------------------"
      ));
    }
    if (safe(cfg.discordTitleStart).isBlank()) cfg.discordTitleStart = "Event Started: {eventName}";
    if (safe(cfg.discordDescriptionStart).isBlank()) cfg.discordDescriptionStart = "Duration: {durationText}\nCatch: +{catchRateBonusPercent}%\nDrops: +{dropRateBonusPercent}%\nSpawns: +{spawnRateBonusPercent}%";
    if (safe(cfg.discordTitleEnd).isBlank()) cfg.discordTitleEnd = "Event Ended: {eventName}";
    if (safe(cfg.discordDescriptionEnd).isBlank()) cfg.discordDescriptionEnd = "Window ended. Next events continue by schedule.";
    cfg.discordEventColor = Math.max(0, cfg.discordEventColor);
    if (cfg.mining == null) cfg.mining = new MiningConfig();
    cfg.mining.baseLootChancePercent = Math.max(0.0D, Math.min(100.0D, cfg.mining.baseLootChancePercent));
    cfg.mining.baseLootRolls = Math.max(1, cfg.mining.baseLootRolls);
    for (WorldEventDefinition event : cfg.events) {
      if (event == null) continue;
      event.id = normalize(event.id);
      if (event.id.isBlank()) event.id = "event_" + Math.abs(event.hashCode());
      if (safe(event.name).isBlank()) event.name = event.id;
      event.catchRateBonusPercent = Math.max(0.0D, event.catchRateBonusPercent);
      event.dropRateBonusPercent = Math.max(0.0D, event.dropRateBonusPercent);
      event.miningLootBonusChancePercent = Math.max(0.0D, event.miningLootBonusChancePercent);
      event.miningLootBonusRolls = Math.max(0, event.miningLootBonusRolls);
      event.spawnRateBonusPercent = Math.max(0.0D, event.spawnRateBonusPercent);
      if (event.miningLoot == null) event.miningLoot = new ArrayList<>();
      if (event.boostedOreBlocks == null) event.boostedOreBlocks = new ArrayList<>();
      if (event.schedule == null) event.schedule = new ArrayList<>();
      for (EventScheduleEntry slot : event.schedule) {
        if (slot == null) continue;
        if (safe(slot.dayOfWeek).isBlank()) slot.dayOfWeek = "SATURDAY";
        if (safe(slot.startTimeUtc).isBlank()) slot.startTimeUtc = "18:00";
        slot.durationMinutes = Math.max(1, slot.durationMinutes);
      }
      if (event.startAnnouncementLines == null) event.startAnnouncementLines = new ArrayList<>();
      if (event.endAnnouncementLines == null) event.endAnnouncementLines = new ArrayList<>();
      event.discordColor = Math.max(0, event.discordColor);
      if (event.skillPointChanceBonusPercentBySource == null) event.skillPointChanceBonusPercentBySource = new HashMap<>();
      if (event.skillPointChanceMultiplierBySource == null) event.skillPointChanceMultiplierBySource = new HashMap<>();
      if (event.skillPointFlatBonusBySource == null) event.skillPointFlatBonusBySource = new HashMap<>();
      for (MiningLootEntry loot : event.miningLoot) {
        if (loot == null) continue;
        loot.weight = Math.max(0.0D, loot.weight);
        loot.countMin = Math.max(1, loot.countMin);
        loot.countMax = Math.max(loot.countMin, loot.countMax);
        if (loot.itemIds == null) loot.itemIds = new ArrayList<>();
      }
    }
  }

  private WorldEventConfig defaults() {
    WorldEventConfig cfg = new WorldEventConfig();
    cfg.enabled = true;
    cfg.timezone = "UTC";
    cfg.rotateEveryDays = 3;
    cfg.announceOnRotate = true;
    cfg.rotationAnnouncement = "&6[Event] &eNow active: &f{eventName}&e.";
    cfg.rotationAnnouncementLines = new ArrayList<>(List.of(
      "&8&m----------------------------",
      "&6[Event] &eNow active: &f{eventName}",
      "",
      "&7Rotation: every &f{days} &7day(s)",
      "&8&m----------------------------"
    ));
    cfg.startAnnouncementLines = new ArrayList<>(List.of(
      "&8&m----------------------------",
      "&aEvent Started: &f{eventName}",
      "&7Duration: &f{durationText}",
      "&7Bonuses: &f+{catchRateBonusPercent}% catch &8| &f+{dropRateBonusPercent}% drops &8| &f+{spawnRateBonusPercent}% spawns",
      "&8&m----------------------------"
    ));
    cfg.endAnnouncementLines = new ArrayList<>(List.of(
      "&8&m----------------------------",
      "&cEvent Ended: &f{eventName}",
      "&7See you in the next scheduled window.",
      "&8&m----------------------------"
    ));
    cfg.discordAnnouncements = true;
    cfg.discordEventColor = 5763719;
    cfg.discordTitleStart = "Event Started: {eventName}";
    cfg.discordDescriptionStart = "Duration: {durationText}\nCatch: +{catchRateBonusPercent}%\nDrops: +{dropRateBonusPercent}%\nSpawns: +{spawnRateBonusPercent}%";
    cfg.discordTitleEnd = "Event Ended: {eventName}";
    cfg.discordDescriptionEnd = "Window ended. Next events continue by schedule.";
    cfg.mining = new MiningConfig();

    WorldEventDefinition shinyRush = new WorldEventDefinition();
    shinyRush.id = "shiny_rush";
    shinyRush.name = "&dShiny Rush";
    shinyRush.catchRateBonusPercent = 12.0D;
    shinyRush.spawnRateBonusPercent = 15.0D;
    shinyRush.schedule = new ArrayList<>(List.of(
      schedule("SATURDAY", "14:00", 120),
      schedule("SUNDAY", "14:00", 120)
    ));
    shinyRush.skillPointChanceBonusPercentBySource.put("capture", 2.0D);
    shinyRush.skillPointChanceBonusPercentBySource.put("shiny_capture", 10.0D);
    shinyRush.skillPointFlatBonusBySource.put("shiny_capture", 1);
    shinyRush.miningLootBonusChancePercent = 2.0D;
    shinyRush.miningLoot.add(loot(2.0D, 1, 1,
      "cobblemon:exp_candy_s", "minecraft:experience_bottle"));
    shinyRush.miningLoot.add(loot(1.0D, 1, 1,
      "cobblemon:star_piece", "minecraft:amethyst_shard"));

    WorldEventDefinition bountyWeek = new WorldEventDefinition();
    bountyWeek.id = "bounty_week";
    bountyWeek.name = "&6Bounty Week";
    bountyWeek.dropRateBonusPercent = 25.0D;
    bountyWeek.schedule = new ArrayList<>(List.of(
      schedule("MONDAY", "12:00", 30),
      schedule("TUESDAY", "12:00", 30),
      schedule("WEDNESDAY", "12:00", 30),
      schedule("THURSDAY", "12:00", 30),
      schedule("FRIDAY", "12:00", 30),
      schedule("SATURDAY", "12:00", 30),
      schedule("SUNDAY", "12:00", 30)
    ));
    bountyWeek.skillPointChanceBonusPercentBySource.put("daily_claim", 10.0D);
    bountyWeek.skillPointChanceBonusPercentBySource.put("quiz_win", 5.0D);
    bountyWeek.miningLootBonusChancePercent = 6.0D;
    bountyWeek.miningLootBonusRolls = 1;
    bountyWeek.miningLoot.add(loot(3.0D, 2, 6,
      "cobbledgacha:gacha_coin", "pokeblocks:poke_coin", "minecraft:gold_nugget"));
    bountyWeek.miningLoot.add(loot(2.0D, 1, 2,
      "waystones:warp_dust", "minecraft:ender_pearl"));

    WorldEventDefinition oreFrenzy = new WorldEventDefinition();
    oreFrenzy.id = "ore_frenzy";
    oreFrenzy.name = "&bOre Frenzy";
    oreFrenzy.dropRateBonusPercent = 40.0D;
    oreFrenzy.spawnRateBonusPercent = 5.0D;
    oreFrenzy.schedule = new ArrayList<>(List.of(
      schedule("MONDAY", "14:00", 30),
      schedule("TUESDAY", "14:00", 30),
      schedule("WEDNESDAY", "14:00", 30),
      schedule("THURSDAY", "14:00", 30),
      schedule("FRIDAY", "14:00", 30),
      schedule("SATURDAY", "14:00", 30),
      schedule("SUNDAY", "14:00", 30)
    ));
    oreFrenzy.skillPointChanceBonusPercentBySource.put("mining_ore", 4.0D);
    oreFrenzy.skillPointFlatBonusBySource.put("mining_ore", 1);
    oreFrenzy.miningLootBonusChancePercent = 10.0D;
    oreFrenzy.miningLootBonusRolls = 1;
    oreFrenzy.boostedOreBlocks = new ArrayList<>(List.of(
      "minecraft:iron_ore",
      "minecraft:gold_ore",
      "minecraft:diamond_ore",
      "minecraft:deepslate_diamond_ore",
      "cobblemon:pecha_ore"
    ));
    oreFrenzy.miningLoot.add(loot(3.0D, 1, 3,
      "tmcraft:copper_blank_disc", "minecraft:raw_iron"));
    oreFrenzy.miningLoot.add(loot(1.5D, 1, 1,
      "waystones:attuned_shard", "minecraft:diamond"));

    cfg.events = new ArrayList<>(List.of(shinyRush, bountyWeek, oreFrenzy));
    return cfg;
  }

  private EventScheduleEntry schedule(String dayOfWeek, String startTimeUtc, int durationMinutes) {
    EventScheduleEntry entry = new EventScheduleEntry();
    entry.dayOfWeek = safe(dayOfWeek).isBlank() ? "SATURDAY" : safe(dayOfWeek);
    entry.startTimeUtc = safe(startTimeUtc).isBlank() ? "18:00" : safe(startTimeUtc);
    entry.durationMinutes = Math.max(1, durationMinutes);
    entry.enabled = true;
    return entry;
  }

  private MiningLootEntry loot(double weight, int min, int max, String... items) {
    MiningLootEntry entry = new MiningLootEntry();
    entry.weight = weight;
    entry.countMin = min;
    entry.countMax = max;
    entry.itemIds = new ArrayList<>();
    if (items != null) {
      for (String item : items) {
        if (safe(item).isBlank()) continue;
        entry.itemIds.add(item);
      }
    }
    entry.itemId = entry.itemIds.isEmpty() ? "minecraft:cobblestone" : entry.itemIds.get(0);
    return entry;
  }

  private String normalize(String value) {
    return safe(value).toLowerCase(Locale.ROOT);
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  public static final class WorldEventConfig {
    public boolean enabled = true;
    public String timezone = "UTC";
    public long cycleStartEpochDay = 0L;
    public int rotateEveryDays = 3;
    public boolean announceOnRotate = true;
    public String rotationAnnouncement = "&6[Event] &eNow active: &f{eventName}&e.";
    public List<String> rotationAnnouncementLines = new ArrayList<>();
    public List<String> startAnnouncementLines = new ArrayList<>();
    public List<String> endAnnouncementLines = new ArrayList<>();
    public boolean discordAnnouncements = true;
    public int discordEventColor = 5763719;
    public String discordTitleStart = "Event Started: {eventName}";
    public String discordDescriptionStart = "Duration: {durationMinutes} minutes";
    public String discordTitleEnd = "Event Ended: {eventName}";
    public String discordDescriptionEnd = "Window ended.";
    public MiningConfig mining = new MiningConfig();
    public List<WorldEventDefinition> events = new ArrayList<>();
  }

  public static final class MiningConfig {
    public boolean enabled = true;
    public boolean onlyOres = true;
    public double baseLootChancePercent = 6.0D;
    public int baseLootRolls = 1;
  }

  public static final class WorldEventDefinition {
    public boolean enabled = true;
    public String id = "event";
    public String name = "Event";
    public double catchRateBonusPercent = 0.0D;
    public double spawnRateBonusPercent = 0.0D;
    public double dropRateBonusPercent = 0.0D;
    public double miningLootBonusChancePercent = 0.0D;
    public int miningLootBonusRolls = 0;
    public List<EventScheduleEntry> schedule = new ArrayList<>();
    public List<String> startAnnouncementLines = new ArrayList<>();
    public List<String> endAnnouncementLines = new ArrayList<>();
    public String discordTitleStart = "";
    public String discordDescriptionStart = "";
    public String discordTitleEnd = "";
    public String discordDescriptionEnd = "";
    public int discordColor = 0;
    public List<String> boostedOreBlocks = new ArrayList<>();
    public List<MiningLootEntry> miningLoot = new ArrayList<>();
    public Map<String, Double> skillPointChanceBonusPercentBySource = new HashMap<>();
    public Map<String, Double> skillPointChanceMultiplierBySource = new HashMap<>();
    public Map<String, Integer> skillPointFlatBonusBySource = new HashMap<>();
  }

  public static final class EventScheduleEntry {
    public boolean enabled = true;
    public String dayOfWeek = "SATURDAY";
    public String startTimeUtc = "18:00";
    public int durationMinutes = 60;
  }

  public static final class MiningLootEntry {
    public String itemId = "minecraft:cobblestone";
    public List<String> itemIds = new ArrayList<>();
    public int countMin = 1;
    public int countMax = 1;
    public double weight = 1.0D;
  }

  public record EventStatus(boolean forced,
                            String forcedEventId,
                            String activeEventId,
                            String activeEventName,
                            String mode,
                            String activeStartUtc,
                            String activeEndUtc,
                            String nextScheduledStartUtc) {
  }

  public record CommandResult(boolean ok, String message) {
    public static CommandResult success(String message) {
      return new CommandResult(true, message);
    }

    public static CommandResult error(String message) {
      return new CommandResult(false, message);
    }
  }

  private static final class WorldEventState {
    int lastAnnouncedCycle = -1;
    String lastActiveEventId = "";
    String forcedEventId = "";
  }

  private record ActiveEventWindow(WorldEventDefinition event,
                                   ZonedDateTime start,
                                   ZonedDateTime end,
                                   String windowKey) {
    private boolean includes(ZonedDateTime now) {
      if (now == null) return false;
      return !now.isBefore(start) && now.isBefore(end);
    }

    private int durationMinutes() {
      long minutes = java.time.Duration.between(start, end).toMinutes();
      return (int) Math.max(1L, minutes);
    }
  }
}
