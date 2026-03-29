package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import org.slf4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public final class ModerationService {
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path STORE_PATH = FabricLoader.getInstance()
    .getConfigDir()
    .resolve("sogki-cobblemon")
    .resolve("moderation.json");
  private static final Path CONFIG_YML_PATH = BASE_DIR.resolve("moderation.yml");
  private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
    .withLocale(Locale.ROOT)
    .withZone(ZoneOffset.UTC);

  private final Logger logger;
  private Store store = new Store();
  private ModerationConfig config = new ModerationConfig();
  private long configLastModifiedEpochMs = -1L;

  public ModerationService(Logger logger) {
    this.logger = logger;
  }

  public void load() {
    try {
      Files.createDirectories(BASE_DIR);
      if (Files.notExists(STORE_PATH)) {
        store = new Store();
      } else {
        String raw = Files.readString(STORE_PATH, StandardCharsets.UTF_8);
        Store parsed = GSON.fromJson(raw, Store.class);
        store = parsed == null ? new Store() : parsed;
      }
      if (store.historyByTarget == null) store.historyByTarget = new HashMap<>();
      if (store.nameToUuid == null) store.nameToUuid = new HashMap<>();
      if (store.uuidToLastName == null) store.uuidToLastName = new HashMap<>();
      if (store.rolesByUuid == null) store.rolesByUuid = new HashMap<>();
      loadYamlConfig();
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to load moderation data: {}", e.getMessage());
      store = new Store();
      config = new ModerationConfig();
    }
  }

  public void save() {
    try {
      FileWriteUtil.writeJsonAtomic(STORE_PATH, GSON, store);
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to save moderation data: {}", e.getMessage());
    }
  }

  public void tickCleanup(long ticks) {
    if (ticks % 200 != 0) return;
    if (expirePunishmentsIfNeeded()) {
      save();
    }
  }

  public void noteSeenPlayer(ServerPlayerEntity player) {
    if (player == null) return;
    String name = safe(player.getGameProfile().getName());
    String uuid = player.getUuidAsString();
    if (name.isBlank() || uuid.isBlank()) return;
    store.nameToUuid.put(name.toLowerCase(Locale.ROOT), uuid);
    store.uuidToLastName.put(uuid, name);
    store.rolesByUuid.putIfAbsent(uuid, "player");
  }

  public Optional<ResolvedTarget> resolveTarget(MinecraftServer server, String raw) {
    String key = safe(raw);
    if (key.isBlank()) return Optional.empty();

    if (server != null) {
      for (ServerPlayerEntity online : server.getPlayerManager().getPlayerList()) {
        if (online.getGameProfile().getName().equalsIgnoreCase(key)) {
          noteSeenPlayer(online);
          return Optional.of(new ResolvedTarget(online.getUuid(), online.getGameProfile().getName()));
        }
      }
    }

    String byName = store.nameToUuid.get(key.toLowerCase(Locale.ROOT));
    if (!safe(byName).isBlank()) {
      try {
        UUID uuid = UUID.fromString(byName);
        String display = safe(store.uuidToLastName.getOrDefault(byName, key));
        return Optional.of(new ResolvedTarget(uuid, display));
      } catch (Exception ignored) {
      }
    }

    try {
      UUID parsed = UUID.fromString(key);
      String display = safe(store.uuidToLastName.getOrDefault(parsed.toString(), key));
      return Optional.of(new ResolvedTarget(parsed, display));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  public List<String> knownNames() {
    List<String> out = new ArrayList<>();
    for (String uuid : store.uuidToLastName.keySet()) {
      String name = safe(store.uuidToLastName.get(uuid));
      if (!name.isBlank()) out.add(name);
    }
    out.sort(String::compareToIgnoreCase);
    return out;
  }

  public List<String> reasonsFor(PunishmentType type) {
    List<String> out = switch (type) {
      case WARNING -> config.warningReasons;
      case MUTE -> config.muteReasons;
      case BAN -> config.banReasons;
    };
    if (out == null || out.isEmpty()) return List.of("General Misconduct");
    return out;
  }

  public List<String> roleNames() {
    List<String> out = new ArrayList<>(config.roleHierarchy);
    if (out.isEmpty()) out = List.of("player", "helper", "moderator", "admin");
    return out;
  }

  public String normalizeRole(String roleRaw) {
    String role = safe(roleRaw).toLowerCase(Locale.ROOT);
    for (String valid : roleNames()) {
      if (valid.equalsIgnoreCase(role)) return valid.toLowerCase(Locale.ROOT);
    }
    return "";
  }

  public String roleOf(UUID uuid) {
    if (uuid == null) return "player";
    String role = normalizeRole(store.rolesByUuid.get(uuid.toString()));
    if (role.isBlank()) return "player";
    return role;
  }

  public boolean setRole(UUID uuid, String roleRaw) {
    if (uuid == null) return false;
    String normalized = normalizeRole(roleRaw);
    if (normalized.isBlank()) return false;
    store.rolesByUuid.put(uuid.toString(), normalized);
    save();
    return true;
  }

  public boolean hasRoleAtLeast(UUID uuid, String minimumRoleRaw) {
    String minimum = normalizeRole(minimumRoleRaw);
    if (minimum.isBlank()) return false;
    int minIdx = roleIndex(minimum);
    int actualIdx = roleIndex(roleOf(uuid));
    return actualIdx >= minIdx;
  }

  public boolean canModerate(ServerPlayerEntity player) {
    if (player == null) return false;
    if (player.hasPermissionLevel(2)) return true;
    return hasRoleAtLeast(player.getUuid(), config.moderationMinimumRole);
  }

  public boolean canManagePermissions(ServerPlayerEntity player) {
    if (player == null) return false;
    if (player.hasPermissionLevel(2)) return true;
    return hasRoleAtLeast(player.getUuid(), config.permissionCommandMinimumRole);
  }

  public boolean canSeeStaffAnnouncements(ServerPlayerEntity player) {
    if (player == null) return false;
    if (player.hasPermissionLevel(2)) return true;
    return hasRoleAtLeast(player.getUuid(), config.staffAnnouncementsMinimumRole);
  }

  public String noPermissionMessage() {
    ensureConfigFresh();
    return config.noPermissionMessage;
  }

  public String unknownPlayerMessage() {
    ensureConfigFresh();
    return config.unknownPlayerMessage;
  }

  public String roleUpdatedMessage(String target, String role) {
    return render(config.roleUpdatedMessage, Map.of(
      "player", safe(target),
      "role", safe(role)
    ));
  }

  public String roleViewMessage(String target, String role) {
    return render(config.roleViewMessage, Map.of(
      "player", safe(target),
      "role", safe(role)
    ));
  }

  public String guiPunishMenuTitle(String target) {
    return render(config.guiPunishMenuTitle, Map.of("player", safe(target)));
  }

  public String guiReasonMenuTitle(PunishmentType type, String target) {
    return render(config.guiReasonMenuTitle, Map.of(
      "type", type == null ? "warning" : type.name().toLowerCase(Locale.ROOT),
      "player", safe(target)
    ));
  }

  public String guiDurationMenuTitle(PunishmentType type, String target, String reason) {
    return render(config.guiDurationMenuTitle, Map.of(
      "type", type == null ? "warning" : type.name().toLowerCase(Locale.ROOT),
      "player", safe(target),
      "reason", safe(reason)
    ));
  }

  public String guiHistoryMenuTitle(String target) {
    return render(config.guiHistoryMenuTitle, Map.of("player", safe(target)));
  }

  public String guiActionWarnName() {
    return render(config.guiActionWarnName, Map.of());
  }

  public String guiActionMuteName() {
    return render(config.guiActionMuteName, Map.of());
  }

  public String guiActionBanName() {
    return render(config.guiActionBanName, Map.of());
  }

  public String guiActionCloseName() {
    return render(config.guiActionCloseName, Map.of());
  }

  public String guiActionBackName() {
    return render(config.guiActionBackName, Map.of());
  }

  public String guiActionPermanentBanName() {
    return render(config.guiActionPermanentBanName, Map.of());
  }

  public String guiFailureMessage(String error) {
    return render(config.guiFailureMessage, Map.of("error", safe(error)));
  }

  public String commandPlayerOnlyMessage() {
    return render(config.commandPlayerOnlyMessage, Map.of());
  }

  public String invalidMuteLengthMessage() {
    return render(config.invalidMuteLengthMessage, Map.of());
  }

  public String invalidBanLengthMessage() {
    return render(config.invalidBanLengthMessage, Map.of());
  }

  public String invalidRoleMessage(List<String> roles) {
    return render(config.invalidRoleMessage, Map.of(
      "roles", roles == null ? "" : String.join(", ", roles)
    ));
  }

  public String roleUpdateFailedMessage() {
    return render(config.roleUpdateFailedMessage, Map.of());
  }

  public String roleUpdatedTargetMessage(String role) {
    return render(config.roleUpdatedTargetMessage, Map.of("role", safe(role)));
  }

  public CommandResult warn(ResolvedTarget target, ServerPlayerEntity staff, String reason) {
    return create(target, staff, PunishmentType.WARNING, null, reason);
  }

  public CommandResult mute(ResolvedTarget target, ServerPlayerEntity staff, Duration duration, String reason) {
    if (duration == null || duration.isZero() || duration.isNegative()) {
      return CommandResult.error("Invalid mute duration.");
    }
    return create(target, staff, PunishmentType.MUTE, Instant.now().plus(duration).toEpochMilli(), reason);
  }

  public CommandResult ban(ResolvedTarget target, ServerPlayerEntity staff, Duration duration, String reason) {
    Long expires = duration == null ? null : Instant.now().plus(duration).toEpochMilli();
    return create(target, staff, PunishmentType.BAN, expires, reason);
  }

  public ActionResult unban(ResolvedTarget target, ServerPlayerEntity staff, String reason) {
    return deactivateLatest(target, staff, PunishmentType.BAN, reason);
  }

  public ActionResult unmute(ResolvedTarget target, ServerPlayerEntity staff, String reason) {
    return deactivateLatest(target, staff, PunishmentType.MUTE, reason);
  }

  public ActionResult warnWithNotifications(ResolvedTarget target, ServerPlayerEntity staff, String reason) {
    CommandResult result = warn(target, staff, reason);
    if (!result.ok()) return ActionResult.error(result.message());
    String resolvedReason = result.entry() == null ? safe(reason) : safe(result.entry().reason);
    online(staff == null ? null : staff.getServer(), target == null ? null : target.uuid()).ifPresent(player ->
      player.sendMessage(Text.literal(formatTargetPunishMessage(
        PunishmentType.WARNING,
        staff == null ? "" : staff.getGameProfile().getName(),
        resolvedReason,
        null
      )), false)
    );
    return ActionResult.success(formatIssuerPunishMessage(
      PunishmentType.WARNING,
      target == null ? "" : target.name(),
      resolvedReason,
      null
    ));
  }

  public ActionResult muteWithNotifications(ResolvedTarget target, ServerPlayerEntity staff, Duration duration, String reason) {
    CommandResult result = mute(target, staff, duration, reason);
    if (!result.ok()) return ActionResult.error(result.message());
    Long expiresAt = result.entry() == null ? null : result.entry().expiresAtEpochMs;
    String resolvedReason = result.entry() == null ? safe(reason) : safe(result.entry().reason);
    online(staff == null ? null : staff.getServer(), target == null ? null : target.uuid()).ifPresent(player ->
      player.sendMessage(Text.literal(formatTargetPunishMessage(
        PunishmentType.MUTE,
        staff == null ? "" : staff.getGameProfile().getName(),
        resolvedReason,
        expiresAt
      )), false)
    );
    return ActionResult.success(formatIssuerPunishMessage(
      PunishmentType.MUTE,
      target == null ? "" : target.name(),
      resolvedReason,
      expiresAt
    ));
  }

  public ActionResult banWithNotifications(ResolvedTarget target, ServerPlayerEntity staff, Duration duration, String reason) {
    CommandResult result = ban(target, staff, duration, reason);
    if (!result.ok()) return ActionResult.error(result.message());
    Long expiresAt = result.entry() == null ? null : result.entry().expiresAtEpochMs;
    String resolvedReason = result.entry() == null ? safe(reason) : safe(result.entry().reason);
    long createdAt = result.entry() == null ? Instant.now().toEpochMilli() : result.entry().createdAtEpochMs;
    online(staff == null ? null : staff.getServer(), target == null ? null : target.uuid()).ifPresent(player ->
      player.networkHandler.disconnect(Text.literal(formatBanScreenMessage(
        target == null ? "" : target.name(),
        staff == null ? "" : staff.getGameProfile().getName(),
        resolvedReason,
        expiresAt,
        createdAt
      )))
    );
    return ActionResult.success(formatIssuerPunishMessage(
      PunishmentType.BAN,
      target == null ? "" : target.name(),
      resolvedReason,
      expiresAt
    ));
  }

  public List<PunishmentEntry> history(UUID targetUuid) {
    if (targetUuid == null) return List.of();
    expirePunishmentsIfNeeded();
    List<PunishmentEntry> entries = store.historyByTarget.getOrDefault(targetUuid.toString(), List.of());
    List<PunishmentEntry> out = new ArrayList<>(entries);
    out.sort(Comparator.comparingLong((PunishmentEntry e) -> e.createdAtEpochMs).reversed());
    return out;
  }

  public Optional<PunishmentEntry> activeMute(UUID targetUuid) {
    return activePunishment(targetUuid, PunishmentType.MUTE);
  }

  public Optional<PunishmentEntry> activeBan(UUID targetUuid) {
    return activePunishment(targetUuid, PunishmentType.BAN);
  }

  public void enforceBanOnJoin(ServerPlayerEntity player) {
    if (player == null) return;
    noteSeenPlayer(player);
    Optional<PunishmentEntry> active = activeBan(player.getUuid());
    if (active.isEmpty()) return;
    PunishmentEntry ban = active.get();
    String msg = formatBanScreenMessage(
      safe(ban.targetName).isBlank() ? player.getGameProfile().getName() : ban.targetName,
      ban.staffName,
      ban.reason,
      ban.expiresAtEpochMs,
      ban.createdAtEpochMs
    );
    player.networkHandler.disconnect(Text.literal(msg));
  }

  public boolean blockMutedChat(ServerPlayerEntity player) {
    if (player == null) return false;
    Optional<PunishmentEntry> active = activeMute(player.getUuid());
    if (active.isEmpty()) return false;
    PunishmentEntry mute = active.get();
    String reason = safe(mute.reason).isBlank() ? "Muted by staff." : mute.reason;
    String remaining = mute.expiresAtEpochMs == null
      ? "Permanent"
      : humanRemaining(Math.max(0, mute.expiresAtEpochMs - Instant.now().toEpochMilli()));
    String msg = render(config.muteBlockedMessage, Map.of(
      "reason", reason,
      "duration", remaining
    ));
    player.sendMessage(Text.literal(msg), false);
    return true;
  }

  public String formatIssuerPunishMessage(PunishmentType type, String targetName, String reason, Long expiresAt) {
    return render(config.issuerPunishMessage, Map.of(
      "type", type.name().toLowerCase(Locale.ROOT),
      "player", safe(targetName),
      "reason", safe(reason),
      "duration", durationLabel(expiresAt)
    ));
  }

  public String formatTargetPunishMessage(PunishmentType type, String staffName, String reason, Long expiresAt) {
    String template = switch (type) {
      case WARNING -> config.targetWarnMessage;
      case MUTE -> config.targetMuteMessage;
      case BAN -> config.targetBanMessage;
    };
    return render(template, Map.of(
      "staff", safe(staffName),
      "reason", safe(reason),
      "duration", durationLabel(expiresAt),
      "type", type.name().toLowerCase(Locale.ROOT)
    ));
  }

  public String formatBanScreenMessage(String playerName,
                                       String staffName,
                                       String reason,
                                       Long expiresAt,
                                       long createdAtEpochMs) {
    String duration = durationLabel(expiresAt);
    String issuedAt = TS_FMT.format(Instant.ofEpochMilli(Math.max(0L, createdAtEpochMs)));
    String until = expiresAt == null ? "Permanent" : TS_FMT.format(Instant.ofEpochMilli(expiresAt));
    Map<String, String> values = Map.of(
      "player", safe(playerName),
      "staff", safe(staffName),
      "reason", safe(reason),
      "duration", duration,
      "issuedAt", issuedAt,
      "until", until
    );
    if (config.banScreenLines == null || config.banScreenLines.isEmpty()) {
      return render(config.banDisconnectMessage, values);
    }
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < config.banScreenLines.size(); i++) {
      if (i > 0) out.append('\n');
      out.append(render(config.banScreenLines.get(i), values));
    }
    return out.toString();
  }

  public String targetDisplayName(UUID uuid, String fallbackName) {
    if (uuid == null) return safe(fallbackName);
    return safe(store.uuidToLastName.getOrDefault(uuid.toString(), fallbackName));
  }

  private CommandResult create(ResolvedTarget target, ServerPlayerEntity staff, PunishmentType type, Long expiresAt, String reason) {
    if (target == null || target.uuid() == null) return CommandResult.error("Target not found.");
    if (staff == null) return CommandResult.error("Only players can issue punishments.");

    noteSeenPlayer(staff);
    String targetUuid = target.uuid().toString();
    String targetName = safe(target.name());
    String staffName = safe(staff.getGameProfile().getName());
    store.nameToUuid.put(targetName.toLowerCase(Locale.ROOT), targetUuid);
    store.uuidToLastName.put(targetUuid, targetName);

    PunishmentEntry entry = new PunishmentEntry();
    entry.id = UUID.randomUUID().toString();
    entry.type = type.name();
    entry.targetUuid = targetUuid;
    entry.targetName = targetName;
    entry.staffUuid = staff.getUuidAsString();
    entry.staffName = staffName;
    entry.createdAtEpochMs = Instant.now().toEpochMilli();
    entry.expiresAtEpochMs = expiresAt;
    entry.reason = safe(reason).isBlank() ? "Issued via moderation panel" : safe(reason);
    entry.active = true;

    store.historyByTarget.computeIfAbsent(targetUuid, ignored -> new ArrayList<>()).add(entry);
    save();
    announceStaff(staff.getServer(), entry);
    return CommandResult.success(entry);
  }

  private ActionResult deactivateLatest(ResolvedTarget target,
                                        ServerPlayerEntity staff,
                                        PunishmentType type,
                                        String reason) {
    if (target == null || target.uuid() == null) return ActionResult.error("Target not found.");
    if (staff == null) return ActionResult.error("Only players can use this command.");
    String targetUuid = target.uuid().toString();
    List<PunishmentEntry> entries = store.historyByTarget.getOrDefault(targetUuid, List.of());
    for (int i = entries.size() - 1; i >= 0; i--) {
      PunishmentEntry entry = entries.get(i);
      if (entry == null || !entry.active) continue;
      if (!type.name().equalsIgnoreCase(safe(entry.type))) continue;
      entry.active = false;
      save();
      announceStaffClear(staff.getServer(), staff.getGameProfile().getName(), target.name(), type, reason);
      return ActionResult.success(render(config.issuerClearSuccessMessage, Map.of(
        "type", type.name().toLowerCase(Locale.ROOT),
        "player", safe(target.name()),
        "reason", safe(reason).isBlank() ? "No reason provided" : safe(reason)
      )));
    }
    return ActionResult.error(render(config.issuerClearNotFoundMessage, Map.of(
      "type", type.name().toLowerCase(Locale.ROOT),
      "player", safe(target.name()),
      "reason", safe(reason).isBlank() ? "No reason provided" : safe(reason)
    )));
  }

  private Optional<PunishmentEntry> activePunishment(UUID targetUuid, PunishmentType type) {
    if (targetUuid == null) return Optional.empty();
    boolean changed = expirePunishmentsIfNeeded();
    List<PunishmentEntry> entries = store.historyByTarget.get(targetUuid.toString());
    if (entries == null || entries.isEmpty()) {
      if (changed) save();
      return Optional.empty();
    }
    for (int i = entries.size() - 1; i >= 0; i--) {
      PunishmentEntry entry = entries.get(i);
      if (entry == null || !entry.active) continue;
      if (!type.name().equalsIgnoreCase(safe(entry.type))) continue;
      if (isExpired(entry, Instant.now().toEpochMilli())) continue;
      if (changed) save();
      return Optional.of(entry);
    }
    if (changed) save();
    return Optional.empty();
  }

  private Optional<ServerPlayerEntity> online(MinecraftServer server, UUID uuid) {
    if (server == null || uuid == null) return Optional.empty();
    return Optional.ofNullable(server.getPlayerManager().getPlayer(uuid));
  }

  private boolean expirePunishmentsIfNeeded() {
    boolean changed = false;
    long now = Instant.now().toEpochMilli();
    for (List<PunishmentEntry> entries : store.historyByTarget.values()) {
      if (entries == null) continue;
      for (PunishmentEntry entry : entries) {
        if (entry == null || !entry.active) continue;
        if (isExpired(entry, now)) {
          entry.active = false;
          changed = true;
        }
      }
    }
    return changed;
  }

  private boolean isExpired(PunishmentEntry entry, long now) {
    if (entry == null) return false;
    if (!entry.active) return false;
    if (entry.expiresAtEpochMs == null) return false;
    return now >= entry.expiresAtEpochMs;
  }

  private String humanRemaining(long millis) {
    long totalMinutes = Math.max(1, millis / 60000L);
    long days = totalMinutes / (60L * 24L);
    long hours = (totalMinutes % (60L * 24L)) / 60L;
    long minutes = totalMinutes % 60L;
    if (days > 0) return days + "d " + hours + "h";
    if (hours > 0) return hours + "h " + minutes + "m";
    return minutes + "m";
  }

  private String durationLabel(Long expiresAt) {
    if (expiresAt == null) return "Permanent";
    long now = Instant.now().toEpochMilli();
    if (expiresAt <= now) return "Expired";
    return humanRemaining(Math.max(0L, expiresAt - now));
  }

  private void announceStaff(MinecraftServer server, PunishmentEntry entry) {
    if (entry == null || server == null) return;

    String msg = render(config.staffAnnouncementMessage, Map.of(
      "staff", safe(entry.staffName),
      "player", safe(entry.targetName),
      "reason", safe(entry.reason),
      "type", safe(entry.type).toLowerCase(Locale.ROOT),
      "action", actionLabel(entry.type),
      "duration", durationLabel(entry.expiresAtEpochMs)
    ));
    for (ServerPlayerEntity viewer : server.getPlayerManager().getPlayerList()) {
      noteSeenPlayer(viewer);
      if (!canSeeStaffAnnouncements(viewer)) continue;
      viewer.sendMessage(Text.literal(msg), false);
    }
  }

  private int roleIndex(String roleRaw) {
    String role = normalizeRole(roleRaw);
    if (role.isBlank()) role = "player";
    List<String> hierarchy = roleNames();
    for (int i = 0; i < hierarchy.size(); i++) {
      if (hierarchy.get(i).equalsIgnoreCase(role)) return i;
    }
    return 0;
  }

  private String render(String template, Map<String, String> values) {
    ensureConfigFresh();
    String out = safe(template);
    for (Map.Entry<String, String> entry : values.entrySet()) {
      out = out.replace("{" + entry.getKey() + "}", safe(entry.getValue()));
    }
    return TemplateEngine.render(out, Map.of());
  }

  private String actionLabel(String typeRaw) {
    String type = safe(typeRaw).toUpperCase(Locale.ROOT);
    return switch (type) {
      case "WARNING" -> "warned";
      case "MUTE" -> "muted";
      case "BAN" -> "banned";
      default -> "punished";
    };
  }

  private String clearActionLabel(PunishmentType type) {
    if (type == null) return "cleared";
    return switch (type) {
      case WARNING -> "unwarned";
      case MUTE -> "unmuted";
      case BAN -> "unbanned";
    };
  }

  private void announceStaffClear(MinecraftServer server,
                                  String staffName,
                                  String targetName,
                                  PunishmentType type,
                                  String reason) {
    if (server == null) return;
    String msg = render(config.staffAnnouncementMessage, Map.of(
      "staff", safe(staffName),
      "type", type.name().toLowerCase(Locale.ROOT),
      "action", clearActionLabel(type),
      "player", safe(targetName),
      "reason", safe(reason).isBlank() ? "No reason provided" : safe(reason),
      "duration", "Cleared"
    ));
    for (ServerPlayerEntity viewer : server.getPlayerManager().getPlayerList()) {
      noteSeenPlayer(viewer);
      if (!canSeeStaffAnnouncements(viewer)) continue;
      viewer.sendMessage(Text.literal(msg), false);
    }
  }

  private void loadYamlConfig() {
    ModerationConfig defaults = new ModerationConfig();
    try {
      createYamlIfMissing(CONFIG_YML_PATH, defaultsYaml(defaults));
      String raw = Files.readString(CONFIG_YML_PATH, StandardCharsets.UTF_8);
      ModerationConfig loaded = new ModerationConfig();
      loaded.warningReasons = listForKey(raw, "warningReasons");
      loaded.muteReasons = listForKey(raw, "muteReasons");
      loaded.banReasons = listForKey(raw, "banReasons");
      loaded.roleHierarchy = listForKey(raw, "roleHierarchy");
      loaded.moderationMinimumRole = nonBlank(valueForKey(raw, "moderationMinimumRole"), defaults.moderationMinimumRole);
      loaded.staffAnnouncementsMinimumRole = nonBlank(valueForKey(raw, "staffAnnouncementsMinimumRole"), defaults.staffAnnouncementsMinimumRole);
      loaded.permissionCommandMinimumRole = nonBlank(valueForKey(raw, "permissionCommandMinimumRole"), defaults.permissionCommandMinimumRole);
      loaded.unknownPlayerMessage = readMessage(raw, "unknownPlayerMessage", defaults.unknownPlayerMessage);
      loaded.noPermissionMessage = readMessage(raw, "noPermissionMessage", defaults.noPermissionMessage);
      loaded.roleUpdatedMessage = readMessage(raw, "roleUpdatedMessage", defaults.roleUpdatedMessage);
      loaded.roleViewMessage = readMessage(raw, "roleViewMessage", defaults.roleViewMessage);
      loaded.staffAnnouncementMessage = readMessage(raw, "staffAnnouncementMessage", defaults.staffAnnouncementMessage);
      loaded.issuerPunishMessage = readMessage(raw, "issuerPunishMessage", defaults.issuerPunishMessage);
      loaded.targetWarnMessage = readMessage(raw, "targetWarnMessage", defaults.targetWarnMessage);
      loaded.targetMuteMessage = readMessage(raw, "targetMuteMessage", defaults.targetMuteMessage);
      loaded.targetBanMessage = readMessage(raw, "targetBanMessage", defaults.targetBanMessage);
      loaded.muteBlockedMessage = readMessage(raw, "muteBlockedMessage", defaults.muteBlockedMessage);
      loaded.banDisconnectMessage = readMessage(raw, "banDisconnectMessage", defaults.banDisconnectMessage);
      loaded.issuerClearSuccessMessage = readMessage(raw, "issuerClearSuccessMessage", defaults.issuerClearSuccessMessage);
      loaded.issuerClearNotFoundMessage = readMessage(raw, "issuerClearNotFoundMessage", defaults.issuerClearNotFoundMessage);
      loaded.guiPunishMenuTitle = readMessage(raw, "guiPunishMenuTitle", defaults.guiPunishMenuTitle);
      loaded.guiReasonMenuTitle = readMessage(raw, "guiReasonMenuTitle", defaults.guiReasonMenuTitle);
      loaded.guiDurationMenuTitle = readMessage(raw, "guiDurationMenuTitle", defaults.guiDurationMenuTitle);
      loaded.guiHistoryMenuTitle = readMessage(raw, "guiHistoryMenuTitle", defaults.guiHistoryMenuTitle);
      loaded.guiActionWarnName = readMessage(raw, "guiActionWarnName", defaults.guiActionWarnName);
      loaded.guiActionMuteName = readMessage(raw, "guiActionMuteName", defaults.guiActionMuteName);
      loaded.guiActionBanName = readMessage(raw, "guiActionBanName", defaults.guiActionBanName);
      loaded.guiActionCloseName = readMessage(raw, "guiActionCloseName", defaults.guiActionCloseName);
      loaded.guiActionBackName = readMessage(raw, "guiActionBackName", defaults.guiActionBackName);
      loaded.guiActionPermanentBanName = readMessage(raw, "guiActionPermanentBanName", defaults.guiActionPermanentBanName);
      loaded.guiFailureMessage = readMessage(raw, "guiFailureMessage", defaults.guiFailureMessage);
      loaded.commandPlayerOnlyMessage = readMessage(raw, "commandPlayerOnlyMessage", defaults.commandPlayerOnlyMessage);
      loaded.invalidMuteLengthMessage = readMessage(raw, "invalidMuteLengthMessage", defaults.invalidMuteLengthMessage);
      loaded.invalidBanLengthMessage = readMessage(raw, "invalidBanLengthMessage", defaults.invalidBanLengthMessage);
      loaded.invalidRoleMessage = readMessage(raw, "invalidRoleMessage", defaults.invalidRoleMessage);
      loaded.roleUpdateFailedMessage = readMessage(raw, "roleUpdateFailedMessage", defaults.roleUpdateFailedMessage);
      loaded.roleUpdatedTargetMessage = readMessage(raw, "roleUpdatedTargetMessage", defaults.roleUpdatedTargetMessage);
      loaded.banScreenLines = listForKey(raw, "banScreenLines");
      if (loaded.warningReasons.isEmpty()) loaded.warningReasons = defaults.warningReasons;
      if (loaded.muteReasons.isEmpty()) loaded.muteReasons = defaults.muteReasons;
      if (loaded.banReasons.isEmpty()) loaded.banReasons = defaults.banReasons;
      if (loaded.roleHierarchy.isEmpty()) loaded.roleHierarchy = defaults.roleHierarchy;
      if (loaded.banScreenLines.isEmpty()) loaded.banScreenLines = defaults.banScreenLines;
      config = loaded;
      configLastModifiedEpochMs = Files.exists(CONFIG_YML_PATH)
        ? Files.getLastModifiedTime(CONFIG_YML_PATH).toMillis()
        : -1L;
    } catch (Exception e) {
      logger.warn("[SogkiCobblemon] Failed to load moderation.yml, using defaults: {}", e.getMessage());
      config = defaults;
      configLastModifiedEpochMs = -1L;
    }
  }

  private void createYamlIfMissing(Path path, String defaults) throws IOException {
    if (Files.exists(path)) return;
    FileWriteUtil.writeStringAtomic(path, defaults);
  }

  private String defaultsYaml(ModerationConfig cfg) {
    StringBuilder out = new StringBuilder();
    out.append("moderation:\n");
    out.append("  reasons:\n");
    out.append("    warningReasons:\n");
    for (String each : cfg.warningReasons) out.append("      - \"").append(escapeYaml(each)).append("\"\n");
    out.append("    muteReasons:\n");
    for (String each : cfg.muteReasons) out.append("      - \"").append(escapeYaml(each)).append("\"\n");
    out.append("    banReasons:\n");
    for (String each : cfg.banReasons) out.append("      - \"").append(escapeYaml(each)).append("\"\n");
    out.append("  messages:\n");
    appendMessageLines(out, "    ", "unknownPlayerMessage", cfg.unknownPlayerMessage);
    appendMessageLines(out, "    ", "noPermissionMessage", cfg.noPermissionMessage);
    appendMessageLines(out, "    ", "roleUpdatedMessage", cfg.roleUpdatedMessage);
    appendMessageLines(out, "    ", "roleViewMessage", cfg.roleViewMessage);
    appendMessageLines(out, "    ", "staffAnnouncementMessage", cfg.staffAnnouncementMessage);
    appendMessageLines(out, "    ", "issuerPunishMessage", cfg.issuerPunishMessage);
    appendMessageLines(out, "    ", "targetWarnMessage", cfg.targetWarnMessage);
    appendMessageLines(out, "    ", "targetMuteMessage", cfg.targetMuteMessage);
    appendMessageLines(out, "    ", "targetBanMessage", cfg.targetBanMessage);
    appendMessageLines(out, "    ", "muteBlockedMessage", cfg.muteBlockedMessage);
    appendMessageLines(out, "    ", "banDisconnectMessage", cfg.banDisconnectMessage);
    appendMessageLines(out, "    ", "issuerClearSuccessMessage", cfg.issuerClearSuccessMessage);
    appendMessageLines(out, "    ", "issuerClearNotFoundMessage", cfg.issuerClearNotFoundMessage);
    out.append("  gui:\n");
    appendMessageLines(out, "    ", "guiPunishMenuTitle", cfg.guiPunishMenuTitle);
    appendMessageLines(out, "    ", "guiReasonMenuTitle", cfg.guiReasonMenuTitle);
    appendMessageLines(out, "    ", "guiDurationMenuTitle", cfg.guiDurationMenuTitle);
    appendMessageLines(out, "    ", "guiHistoryMenuTitle", cfg.guiHistoryMenuTitle);
    appendMessageLines(out, "    ", "guiActionWarnName", cfg.guiActionWarnName);
    appendMessageLines(out, "    ", "guiActionMuteName", cfg.guiActionMuteName);
    appendMessageLines(out, "    ", "guiActionBanName", cfg.guiActionBanName);
    appendMessageLines(out, "    ", "guiActionCloseName", cfg.guiActionCloseName);
    appendMessageLines(out, "    ", "guiActionBackName", cfg.guiActionBackName);
    appendMessageLines(out, "    ", "guiActionPermanentBanName", cfg.guiActionPermanentBanName);
    appendMessageLines(out, "    ", "guiFailureMessage", cfg.guiFailureMessage);
    out.append("  commandMessages:\n");
    appendMessageLines(out, "    ", "commandPlayerOnlyMessage", cfg.commandPlayerOnlyMessage);
    appendMessageLines(out, "    ", "invalidMuteLengthMessage", cfg.invalidMuteLengthMessage);
    appendMessageLines(out, "    ", "invalidBanLengthMessage", cfg.invalidBanLengthMessage);
    appendMessageLines(out, "    ", "invalidRoleMessage", cfg.invalidRoleMessage);
    appendMessageLines(out, "    ", "roleUpdateFailedMessage", cfg.roleUpdateFailedMessage);
    appendMessageLines(out, "    ", "roleUpdatedTargetMessage", cfg.roleUpdatedTargetMessage);
    out.append("  banScreen:\n");
    out.append("    banScreenLines:\n");
    for (String each : cfg.banScreenLines) out.append("      - \"").append(escapeYaml(each)).append("\"\n");
    out.append("permissions:\n");
    out.append("  roleHierarchy:\n");
    for (String each : cfg.roleHierarchy) out.append("    - \"").append(escapeYaml(each)).append("\"\n");
    out.append("  moderationMinimumRole: \"").append(escapeYaml(cfg.moderationMinimumRole)).append("\"\n");
    out.append("  staffAnnouncementsMinimumRole: \"").append(escapeYaml(cfg.staffAnnouncementsMinimumRole)).append("\"\n");
    out.append("  permissionCommandMinimumRole: \"").append(escapeYaml(cfg.permissionCommandMinimumRole)).append("\"\n");
    return out.toString();
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
    List<String> parsed = listForKeyAllowEmpty(raw, key);
    if (parsed == null) return new ArrayList<>();
    List<String> out = new ArrayList<>();
    for (String value : parsed) {
      if (!safe(value).isBlank()) out.add(value);
    }
    return out;
  }

  private List<String> listForKeyAllowEmpty(String raw, String key) {
    List<String> out = new ArrayList<>();
    String[] lines = raw.split("\\r?\\n");
    boolean inList = false;
    boolean foundKey = false;
    int listIndent = -1;
    for (String line : lines) {
      String trimmed = line.trim();
      if (!inList) {
        if (trimmed.equals(key + ":")) {
          inList = true;
          foundKey = true;
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
    return foundKey ? out : null;
  }

  private String readMessage(String raw, String key, String fallback) {
    List<String> lines = listForKeyAllowEmpty(raw, key);
    if (lines != null) {
      StringBuilder out = new StringBuilder();
      for (int i = 0; i < lines.size(); i++) {
        if (i > 0) out.append('\n');
        out.append(lines.get(i) == null ? "" : lines.get(i));
      }
      return out.isEmpty() ? fallback : out.toString();
    }
    String scalar = valueForKey(raw, key);
    return nonBlank(scalar, fallback);
  }

  private void appendMessageLines(StringBuilder out, String key, String template) {
    appendMessageLines(out, "  ", key, template);
  }

  private void appendMessageLines(StringBuilder out, String indent, String key, String template) {
    out.append(indent).append(key).append(":\n");
    String normalized = template == null ? "" : template.replace("\r", "");
    String[] lines = normalized.split("\n", -1);
    for (String line : lines) {
      out.append(indent).append("  - \"").append(escapeYaml(line)).append("\"\n");
    }
  }

  private void ensureConfigFresh() {
    try {
      if (Files.notExists(CONFIG_YML_PATH)) return;
      long modified = Files.getLastModifiedTime(CONFIG_YML_PATH).toMillis();
      if (modified != configLastModifiedEpochMs) {
        loadYamlConfig();
      }
    } catch (Exception ignored) {
    }
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

  private String nonBlank(String value, String fallback) {
    String out = safe(value);
    return out.isBlank() ? fallback : out;
  }

  private String escapeYaml(String value) {
    if (value == null) return "";
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n");
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  public enum PunishmentType {
    WARNING,
    MUTE,
    BAN
  }

  public record ResolvedTarget(UUID uuid, String name) {
  }

  public record CommandResult(boolean ok, PunishmentEntry entry, String message) {
    public static CommandResult success(PunishmentEntry entry) {
      return new CommandResult(true, entry, "ok");
    }

    public static CommandResult error(String message) {
      return new CommandResult(false, null, message == null ? "error" : message);
    }
  }

  public record ActionResult(boolean ok, String message) {
    public static ActionResult success(String message) {
      return new ActionResult(true, message);
    }

    public static ActionResult error(String message) {
      return new ActionResult(false, message == null ? "error" : message);
    }
  }

  public static final class PunishmentEntry {
    public String id = "";
    public String type = PunishmentType.WARNING.name();
    public String targetUuid = "";
    public String targetName = "";
    public String staffUuid = "";
    public String staffName = "";
    public long createdAtEpochMs = 0L;
    public Long expiresAtEpochMs = null;
    public String reason = "";
    public boolean active = true;
  }

  private static final class Store {
    public Map<String, List<PunishmentEntry>> historyByTarget = new HashMap<>();
    public Map<String, String> nameToUuid = new HashMap<>();
    public Map<String, String> uuidToLastName = new HashMap<>();
    public Map<String, String> rolesByUuid = new HashMap<>();
  }

  private static final class ModerationConfig {
    public List<String> warningReasons = new ArrayList<>(List.of(
      "Disrespect",
      "Excessive Language",
      "Spam",
      "Toxic Behavior"
    ));
    public List<String> muteReasons = new ArrayList<>(List.of(
      "Chat Spam",
      "Harassment",
      "Excessive Language",
      "Argumentative Behavior"
    ));
    public List<String> banReasons = new ArrayList<>(List.of(
      "Cheating",
      "Bug Abuse",
      "X-Ray/Exploit Use",
      "Severe Harassment"
    ));
    public String unknownPlayerMessage = "&cUnknown player. Ask them to join once so moderation can track their profile.";
    public String noPermissionMessage = "&cYou don't have permission to use this command.";
    public String roleUpdatedMessage = "&aUpdated role for &f{player} &ato &f{role}&a.";
    public String roleViewMessage = "&bRole for &f{player}&b: &f{role}";
    public String staffAnnouncementMessage = "&8[Staff] &b{staff} &7{action} &f{player} &7| &f{reason} &8({duration})";
    public String issuerPunishMessage = "&aApplied &f{type} &ato &f{player} &8(&f{duration}&8) &7Reason: &f{reason}";
    public String targetWarnMessage = "&eYou received a warning from &f{staff}&e. Reason: &f{reason}";
    public String targetMuteMessage = "&6You have been muted by &f{staff}&6 for &f{duration}&6. Reason: &f{reason}";
    public String targetBanMessage = "&cYou have been banned by &f{staff}&c for &f{duration}&c. Reason: &f{reason}";
    public String muteBlockedMessage = "&cYou are muted. &7Reason: &f{reason} &8| &7Remaining: &f{duration}";
    public String banDisconnectMessage = "&cYou are banned from this server.\n&7Reason: &f{reason}\n&7Duration: &f{duration}";
    public String issuerClearSuccessMessage = "&aCleared active &f{type} &afor &f{player}&a.";
    public String issuerClearNotFoundMessage = "&cNo active &f{type} &cfound for &f{player}&c.";
    public String guiPunishMenuTitle = "&8Punish &7- &f{player}";
    public String guiReasonMenuTitle = "&8{type} Reason &7- &f{player}";
    public String guiDurationMenuTitle = "&8{type} Duration &7- &f{player} &8| &7{reason}";
    public String guiHistoryMenuTitle = "&8History &7- &f{player}";
    public String guiActionWarnName = "&eIssue Warning";
    public String guiActionMuteName = "&6Issue Mute";
    public String guiActionBanName = "&cIssue Ban";
    public String guiActionCloseName = "&7Close";
    public String guiActionBackName = "&7Back";
    public String guiActionPermanentBanName = "&4Permanent Ban";
    public String guiFailureMessage = "&c{error}";
    public String commandPlayerOnlyMessage = "&cThis command is player-only.";
    public String invalidMuteLengthMessage = "&cInvalid mute length. Use 2h, 1d, 4d, or 7d.";
    public String invalidBanLengthMessage = "&cInvalid ban length. Use 2h, 1d, 4d, 7d, or perm.";
    public String invalidRoleMessage = "&cInvalid role. Available: &f{roles}";
    public String roleUpdateFailedMessage = "&cFailed to update role.";
    public String roleUpdatedTargetMessage = "&bYour staff role is now: &f{role}";
    public List<String> banScreenLines = new ArrayList<>(List.of(
      "&4&lBANNED",
      "&7",
      "&cYou are currently banned from this server.",
      "&7Reason: &f{reason}",
      "&7Duration: &f{duration}",
      "&7Until: &f{until}",
      "&7Issued by: &f{staff}",
      "&7Issued at: &f{issuedAt}",
      "&7",
      "&8If this is a mistake, contact staff."
    ));
    public List<String> roleHierarchy = new ArrayList<>(List.of("player", "helper", "moderator", "admin"));
    public String moderationMinimumRole = "moderator";
    public String staffAnnouncementsMinimumRole = "helper";
    public String permissionCommandMinimumRole = "admin";
  }
}
