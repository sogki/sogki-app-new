package dev.sogki.rpmanager.server.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import dev.sogki.rpmanager.server.util.FileWriteUtil;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.LoreComponent;
import net.minecraft.component.type.NbtComponent;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.nbt.NbtCompound;
import net.minecraft.nbt.NbtElement;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class TitleService {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiCobblemon");
  private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
  private static final Path BASE_DIR = FabricLoader.getInstance().getConfigDir().resolve("sogki-cobblemon");
  private static final Path TITLES_YML_PATH = BASE_DIR.resolve("titles.yml");
  private static final Path DATA_JSON_PATH = BASE_DIR.resolve("titles-data.json");
  private static final Path PLAYERDATA_YML_PATH = BASE_DIR.resolve("titles-playerdata.yml");

  private TitleConfig config = defaults();
  private PlayerTitleStore store = new PlayerTitleStore();

  public void load() {
    loadConfig();
    loadData();
  }

  public void save() {
    try {
      FileWriteUtil.writeJsonAtomic(DATA_JSON_PATH, GSON, store);
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to save title player data: {}", e.getMessage());
    }
    writePlayerDataYaml();
  }

  public String menuTitle() {
    return safe(config.menuTitle).isBlank() ? "&8Titles" : config.menuTitle;
  }

  public List<TitleDefinition> titles() {
    List<TitleDefinition> out = new ArrayList<>(config.titles == null ? List.of() : config.titles);
    out.sort(Comparator
      .comparingInt((TitleDefinition t) -> t == null ? Integer.MAX_VALUE : Math.max(0, t.order))
      .thenComparing(t -> safe(t == null ? "" : t.id)));
    return out;
  }

  public List<TitleDefinition> titlesForTeam(String teamIdRaw) {
    return titlesForPlayer(null, teamIdRaw);
  }

  public List<TitleDefinition> titlesForPlayer(UUID uuid, String teamIdRaw) {
    String teamId = normalize(teamIdRaw);
    List<TitleDefinition> out = new ArrayList<>();
    for (TitleDefinition title : titles()) {
      if (title == null) continue;
      if (isAllowedForTeam(title, teamId, uuid)) out.add(title);
    }
    return out;
  }

  public Selection selected(UUID uuid) {
    if (uuid == null) return Selection.none();
    PlayerTitleState state = state(uuid);
    return new Selection(safe(state.titleId), normalizePosition(state.position));
  }

  public CommandResult clear(UUID uuid) {
    if (uuid == null) return CommandResult.error("Player required.");
    PlayerTitleState state = state(uuid);
    state.titleId = "";
    state.position = "prefix";
    save();
    return CommandResult.success(render(config.messageClear, Map.of()));
  }

  public CommandResult select(UUID uuid, String titleIdRaw, String positionRaw, String teamIdRaw) {
    if (uuid == null) return CommandResult.error("Player required.");
    String titleId = normalize(titleIdRaw);
    if (titleId.isBlank()) return CommandResult.error("Title id required.");
    TitleDefinition title = titleById(titleId);
    if (title == null) return CommandResult.error(render(config.messageUnknown, Map.of("titleId", titleId)));
    if (!isAllowedForTeam(title, teamIdRaw, uuid)) {
      return CommandResult.error(render(config.messageNotAvailable, Map.of("titleId", titleId)));
    }
    String position = normalizePosition(positionRaw);
    PlayerTitleState state = state(uuid);
    state.titleId = title.id;
    state.position = position;
    save();
    return CommandResult.success(render(config.messageSet, Map.of(
      "titleId", safe(title.id),
      "title", safe(title.display),
      "position", position
    )));
  }

  public CommandResult grant(UUID target, String titleIdRaw) {
    if (target == null) return CommandResult.error("Player required.");
    String titleId = normalize(titleIdRaw);
    if (titleId.isBlank()) return CommandResult.error("Title id required.");
    TitleDefinition title = titleById(titleId);
    if (title == null) return CommandResult.error(render(config.messageUnknown, Map.of("titleId", titleId)));
    if (!isCustomTitle(title)) {
      return CommandResult.error(render(config.messageGrantNotCustom, Map.of("titleId", titleId)));
    }
    PlayerTitleState state = state(target);
    if (state.grantedCustomTitles.contains(title.id)) {
      return CommandResult.error(render(config.messageGrantAlready, Map.of("titleId", title.id, "title", safe(title.display))));
    }
    state.grantedCustomTitles.add(title.id);
    save();
    return CommandResult.success(render(config.messageGrantSuccessAdmin, Map.of("titleId", title.id, "title", safe(title.display))));
  }

  public CommandResult grantAll(UUID target) {
    if (target == null) return CommandResult.error("Player required.");
    PlayerTitleState playerState = state(target);
    playerState.grantedAllTitles = true;
    if (playerState.grantedCustomTitles == null) playerState.grantedCustomTitles = new ArrayList<>();
    for (TitleDefinition title : titles()) {
      if (title == null || safe(title.id).isBlank()) continue;
      if (isCustomTitle(title) && !playerState.grantedCustomTitles.contains(title.id)) {
        playerState.grantedCustomTitles.add(title.id);
      }
    }
    save();
    return CommandResult.success("&aGranted access to all configured titles.");
  }

  public String playerGrantMessage(String titleIdRaw) {
    TitleDefinition title = titleById(titleIdRaw);
    String id = title == null ? normalize(titleIdRaw) : safe(title.id);
    String display = title == null ? id : safe(title.display);
    return render(config.messageGrantSuccessPlayer, Map.of("titleId", id, "title", display));
  }

  public int unlockedCount(UUID uuid) {
    if (uuid == null) return 0;
    PlayerTitleState state = state(uuid);
    int total = 0;
    for (TitleDefinition title : titles()) {
      if (title == null) continue;
      if (hasUnlocked(state, safe(title.id))) total++;
    }
    return total;
  }

  public void onMiningAction(ServerPlayerEntity player) {
    maybeDropRedeemable(player, config.drops.miningChancePercent);
  }

  public void onMobKillAction(ServerPlayerEntity player) {
    maybeDropRedeemable(player, config.drops.mobKillChancePercent);
  }

  public void onPokemonCatchAction(ServerPlayerEntity player) {
    maybeDropRedeemable(player, config.drops.pokemonCatchChancePercent);
  }

  public boolean tryRedeemItem(ServerPlayerEntity player, ItemStack stack) {
    if (player == null || stack == null || stack.isEmpty()) return false;
    String titleId = titleIdFromRedeemStack(stack);
    if (titleId.isBlank()) return false;
    TitleDefinition title = titleById(titleId);
    if (title == null || isCustomTitle(title)) return false;

    PlayerTitleState state = state(player.getUuid());
    if (hasUnlocked(state, title.id)) {
      player.sendMessage(Text.literal(render(config.messageRedeemAlreadyOwned, Map.of(
        "titleId", title.id,
        "title", safe(title.display)
      ))), false);
      return true;
    }
    state.unlockedDropTitles.add(title.id);
    stack.decrement(1);
    save();
    player.sendMessage(Text.literal(render(config.messageRedeemSuccess, Map.of(
      "titleId", title.id,
      "title", safe(title.display)
    ))), false);
    return true;
  }

  public Map<String, String> placeholders(UUID uuid, String teamId, Map<String, String> values) {
    Map<String, String> out = new HashMap<>();
    Selection selection = selected(uuid);
    if (selection.titleId().isBlank()) {
      out.put("title", "");
      out.put("titleDisplay", "");
      out.put("titlePrefix", "");
      out.put("titleSuffix", "");
      out.put("titlePosition", "");
      return out;
    }
    TitleDefinition title = titleById(selection.titleId());
    if (title == null || !isAllowedForTeam(title, teamId, uuid)) {
      out.put("title", "");
      out.put("titleDisplay", "");
      out.put("titlePrefix", "");
      out.put("titleSuffix", "");
      out.put("titlePosition", "");
      return out;
    }
    String rendered = renderTitle(title, values);
    out.put("title", rendered);
    out.put("titleDisplay", rendered);
    out.put("titlePosition", selection.position());
    if ("suffix".equals(selection.position())) {
      out.put("titlePrefix", "");
      out.put("titleSuffix", ensureLeadingSpace(rendered));
    } else {
      out.put("titlePrefix", ensureTrailingSpace(rendered));
      out.put("titleSuffix", "");
    }
    return out;
  }

  private String renderTitle(TitleDefinition title, Map<String, String> values) {
    String raw = safe(title.display);
    String out = raw;
    for (Map.Entry<String, String> entry : values.entrySet()) {
      out = out.replace("{" + entry.getKey() + "}", safe(entry.getValue()));
    }
    return out;
  }

  private void maybeDropRedeemable(ServerPlayerEntity player, double chancePercentRaw) {
    if (player == null || config == null || config.drops == null || !config.drops.enabled) return;
    double chanceOutOf = Math.max(1.0D, config.drops.chanceOutOf);
    double chancePercent = Math.max(0.0D, Math.min(chanceOutOf, chancePercentRaw));
    if (chancePercent <= 0.0D) return;
    if (ThreadLocalRandom.current().nextDouble(chanceOutOf) > chancePercent) return;

    List<TitleDefinition> eligible = eligibleRandomDropTitles(player.getUuid());
    if (eligible.isEmpty()) {
      maybeDropFallbackReward(player);
      return;
    }
    TitleDefinition choice = eligible.get(ThreadLocalRandom.current().nextInt(eligible.size()));
    ItemStack tag = buildRedeemStack(choice);
    if (!player.getInventory().insertStack(tag)) {
      player.dropItem(tag, false);
    }
    player.sendMessage(Text.literal(render(config.messageDropFound, Map.of(
      "titleId", safe(choice.id),
      "title", safe(choice.display)
    ))), false);
  }

  private void maybeDropFallbackReward(ServerPlayerEntity player) {
    if (player == null || config == null || config.drops == null) return;
    if (!config.drops.fallbackEnabled) return;
    if (config.drops.fallbackItemIds == null || config.drops.fallbackItemIds.isEmpty()) return;
    List<Identifier> available = new ArrayList<>();
    for (String raw : config.drops.fallbackItemIds) {
      Identifier id = Identifier.tryParse(safe(raw));
      if (id == null || !Registries.ITEM.containsId(id)) continue;
      if (Registries.ITEM.get(id) == Items.AIR) continue;
      available.add(id);
    }
    if (available.isEmpty()) return;
    Identifier id = available.get(ThreadLocalRandom.current().nextInt(available.size()));
    var item = Registries.ITEM.get(id);
    if (item == Items.AIR) return;
    int min = Math.max(1, config.drops.fallbackCountMin);
    int max = Math.max(min, config.drops.fallbackCountMax);
    int count = min == max ? min : ThreadLocalRandom.current().nextInt(min, max + 1);
    String itemName = new ItemStack(item).getName().getString();
    ItemStack reward = new ItemStack(item, count);
    if (!player.getInventory().insertStack(reward)) {
      player.dropItem(reward, false);
    }
    player.sendMessage(Text.literal(render(config.messageFallbackDrop, Map.of(
      "itemId", id.toString(),
      "itemName", itemName,
      "itemDisplay", itemName,
      "count", String.valueOf(count)
    ))), false);
  }

  private List<TitleDefinition> eligibleRandomDropTitles(UUID uuid) {
    List<TitleDefinition> out = new ArrayList<>();
    if (uuid == null) return out;
    PlayerTitleState state = state(uuid);
    for (TitleDefinition title : titles()) {
      if (title == null) continue;
      if (isCustomTitle(title)) continue;
      String id = safe(title.id);
      if (id.isBlank()) continue;
      if (hasUnlocked(state, id)) continue;
      out.add(title);
    }
    return out;
  }

  private ItemStack buildRedeemStack(TitleDefinition title) {
    ItemStack stack = new ItemStack(Items.NAME_TAG);
    String titleId = safe(title == null ? "" : title.id);
    String display = safe(title == null ? titleId : title.display);
    String itemName = render(config.drops.itemName, Map.of(
      "titleId", titleId,
      "title", display
    ));
    stack.set(DataComponentTypes.CUSTOM_NAME, Text.literal(itemName));
    List<Text> lore = new ArrayList<>();
    List<String> templates = config.drops.itemLore == null ? List.of() : config.drops.itemLore;
    for (String template : templates) {
      lore.add(Text.literal(render(template, Map.of(
        "titleId", titleId,
        "title", display
      ))));
    }
    if (!lore.isEmpty()) {
      stack.set(DataComponentTypes.LORE, new LoreComponent(lore));
    }
    NbtCompound marker = new NbtCompound();
    marker.putString("sogkiTitleRedeemId", titleId);
    stack.set(DataComponentTypes.CUSTOM_DATA, NbtComponent.of(marker));
    return stack;
  }

  private String titleIdFromRedeemStack(ItemStack stack) {
    if (stack == null || stack.isEmpty()) return "";
    if (stack.getItem() != Items.NAME_TAG) return "";
    NbtComponent data = stack.get(DataComponentTypes.CUSTOM_DATA);
    if (data == null) return "";
    NbtCompound marker = data.copyNbt();
    if (!marker.contains("sogkiTitleRedeemId", NbtElement.STRING_TYPE)) return "";
    return normalize(marker.getString("sogkiTitleRedeemId"));
  }

  private void loadConfig() {
    try {
      Files.createDirectories(BASE_DIR);
      TitleConfig defaults = defaults();
      if (Files.notExists(TITLES_YML_PATH)) {
        FileWriteUtil.writeStringAtomic(TITLES_YML_PATH, defaultsYaml(defaults));
      }
      String raw = Files.readString(TITLES_YML_PATH, StandardCharsets.UTF_8);
      TitleConfig parsed = parseYaml(raw);
      this.config = parsed == null ? defaults : parsed;
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load titles.yml, using defaults: {}", e.getMessage());
      this.config = defaults();
    }
    ensureConfigDefaults(this.config);
  }

  private void loadData() {
    try {
      if (Files.notExists(DATA_JSON_PATH)) {
        this.store = new PlayerTitleStore();
        save();
      } else {
        String raw = Files.readString(DATA_JSON_PATH, StandardCharsets.UTF_8);
        PlayerTitleStore parsed = GSON.fromJson(raw, PlayerTitleStore.class);
        this.store = parsed == null ? new PlayerTitleStore() : parsed;
      }
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to load title player data, resetting store: {}", e.getMessage());
      this.store = new PlayerTitleStore();
    }
    if (this.store.players == null) this.store.players = new HashMap<>();
    normalizePlayerKeys();
    for (PlayerTitleState state : this.store.players.values()) {
      if (state == null) continue;
      if (state.grantedCustomTitles == null) state.grantedCustomTitles = new ArrayList<>();
      if (state.unlockedDropTitles == null) state.unlockedDropTitles = new ArrayList<>();
    }
    writePlayerDataYaml();
  }

  private void normalizePlayerKeys() {
    if (this.store == null || this.store.players == null || this.store.players.isEmpty()) return;
    Map<String, PlayerTitleState> normalized = new HashMap<>();
    for (Map.Entry<String, PlayerTitleState> entry : this.store.players.entrySet()) {
      String key = normalizePlayerKey(entry.getKey());
      PlayerTitleState merged = mergePlayerStates(normalized.get(key), entry.getValue());
      normalized.put(key, merged);
    }
    this.store.players = normalized;
  }

  private String normalizePlayerKey(String raw) {
    String key = safe(raw);
    if (key.isBlank()) return "";
    try {
      return UUID.fromString(key).toString();
    } catch (Exception ignored) {
      return key.toLowerCase(Locale.ROOT);
    }
  }

  private PlayerTitleState mergePlayerStates(PlayerTitleState a, PlayerTitleState b) {
    if (a == null) return sanitizePlayerState(b);
    if (b == null) return sanitizePlayerState(a);
    PlayerTitleState left = sanitizePlayerState(a);
    PlayerTitleState right = sanitizePlayerState(b);
    PlayerTitleState out = new PlayerTitleState();
    out.grantedAllTitles = left.grantedAllTitles || right.grantedAllTitles;
    out.titleId = !safe(right.titleId).isBlank() ? right.titleId : left.titleId;
    out.position = normalizePosition(!safe(right.position).isBlank() ? right.position : left.position);
    out.grantedCustomTitles = new ArrayList<>();
    for (String id : left.grantedCustomTitles) addNormalizedUnique(out.grantedCustomTitles, id);
    for (String id : right.grantedCustomTitles) {
      addNormalizedUnique(out.grantedCustomTitles, id);
    }
    out.unlockedDropTitles = new ArrayList<>();
    for (String id : left.unlockedDropTitles) addNormalizedUnique(out.unlockedDropTitles, id);
    for (String id : right.unlockedDropTitles) {
      addNormalizedUnique(out.unlockedDropTitles, id);
    }
    return out;
  }

  private void addNormalizedUnique(List<String> list, String raw) {
    String id = normalize(raw);
    if (id.isBlank()) return;
    for (String each : list) {
      if (normalize(each).equals(id)) return;
    }
    list.add(id);
  }

  private PlayerTitleState sanitizePlayerState(PlayerTitleState state) {
    PlayerTitleState out = state == null ? new PlayerTitleState() : state;
    if (out.grantedCustomTitles == null) out.grantedCustomTitles = new ArrayList<>();
    if (out.unlockedDropTitles == null) out.unlockedDropTitles = new ArrayList<>();
    out.position = normalizePosition(out.position);
    out.titleId = safe(out.titleId);
    return out;
  }

  private String defaultsYaml(TitleConfig cfg) {
    StringBuilder out = new StringBuilder();
    out.append("titles:\n");
    out.append("  menuTitle: \"").append(escapeYaml(cfg.menuTitle)).append("\"\n");
    out.append("  messageSet: \"").append(escapeYaml(cfg.messageSet)).append("\"\n");
    out.append("  messageClear: \"").append(escapeYaml(cfg.messageClear)).append("\"\n");
    out.append("  messageUnknown: \"").append(escapeYaml(cfg.messageUnknown)).append("\"\n");
    out.append("  messageNotAvailable: \"").append(escapeYaml(cfg.messageNotAvailable)).append("\"\n");
    out.append("  messageGrantNotCustom: \"").append(escapeYaml(cfg.messageGrantNotCustom)).append("\"\n");
    out.append("  messageGrantAlready: \"").append(escapeYaml(cfg.messageGrantAlready)).append("\"\n");
    out.append("  messageGrantSuccessAdmin: \"").append(escapeYaml(cfg.messageGrantSuccessAdmin)).append("\"\n");
    out.append("  messageGrantSuccessPlayer: \"").append(escapeYaml(cfg.messageGrantSuccessPlayer)).append("\"\n");
    out.append("  messageDropFound: \"").append(escapeYaml(cfg.messageDropFound)).append("\"\n");
    out.append("  messageRedeemSuccess: \"").append(escapeYaml(cfg.messageRedeemSuccess)).append("\"\n");
    out.append("  messageRedeemAlreadyOwned: \"").append(escapeYaml(cfg.messageRedeemAlreadyOwned)).append("\"\n");
    out.append("  messageFallbackDrop: \"").append(escapeYaml(cfg.messageFallbackDrop)).append("\"\n");
    out.append("  drops:\n");
    out.append("    enabled: ").append(cfg.drops.enabled).append("\n");
    out.append("    requireUnlockForStandardTitles: ").append(cfg.drops.requireUnlockForStandardTitles).append("\n");
    out.append("    chanceOutOf: ").append(cfg.drops.chanceOutOf).append("\n");
    out.append("    miningChancePercent: ").append(cfg.drops.miningChancePercent).append("\n");
    out.append("    mobKillChancePercent: ").append(cfg.drops.mobKillChancePercent).append("\n");
    out.append("    pokemonCatchChancePercent: ").append(cfg.drops.pokemonCatchChancePercent).append("\n");
    out.append("    fallbackEnabled: ").append(cfg.drops.fallbackEnabled).append("\n");
    out.append("    fallbackCountMin: ").append(cfg.drops.fallbackCountMin).append("\n");
    out.append("    fallbackCountMax: ").append(cfg.drops.fallbackCountMax).append("\n");
    out.append("    fallbackItemIds:\n");
    for (String itemId : cfg.drops.fallbackItemIds) {
      out.append("      - \"").append(escapeYaml(itemId)).append("\"\n");
    }
    out.append("    itemName: \"").append(escapeYaml(cfg.drops.itemName)).append("\"\n");
    out.append("    itemLore:\n");
    for (String lore : cfg.drops.itemLore) {
      out.append("      - \"").append(escapeYaml(lore)).append("\"\n");
    }
    out.append("  titles:\n");
    for (TitleDefinition title : cfg.titles) {
      out.append("    - id: \"").append(escapeYaml(title.id)).append("\"\n");
      out.append("      display: \"").append(escapeYaml(title.display)).append("\"\n");
      out.append("      description: \"").append(escapeYaml(title.description)).append("\"\n");
      out.append("      iconItemId: \"").append(escapeYaml(title.iconItemId)).append("\"\n");
      out.append("      defaultPosition: \"").append(escapeYaml(title.defaultPosition)).append("\"\n");
      out.append("      order: ").append(Math.max(0, title.order)).append("\n");
      if (title.teamIds == null || title.teamIds.isEmpty()) {
        out.append("      teamIds: []\n");
      } else {
        out.append("      teamIds:\n");
        for (String team : title.teamIds) {
          out.append("        - \"").append(escapeYaml(team)).append("\"\n");
        }
      }
    }
    return out.toString();
  }

  private TitleConfig parseYaml(String raw) {
    TitleConfig cfg = defaults();
    String menuTitle = valueForKey(raw, "menuTitle");
    if (menuTitle != null) cfg.menuTitle = menuTitle;
    String messageSet = valueForKey(raw, "messageSet");
    if (messageSet != null) cfg.messageSet = messageSet;
    String messageClear = valueForKey(raw, "messageClear");
    if (messageClear != null) cfg.messageClear = messageClear;
    String messageUnknown = valueForKey(raw, "messageUnknown");
    if (messageUnknown != null) cfg.messageUnknown = messageUnknown;
    String messageNotAvailable = valueForKey(raw, "messageNotAvailable");
    if (messageNotAvailable != null) cfg.messageNotAvailable = messageNotAvailable;
    String messageGrantNotCustom = valueForKey(raw, "messageGrantNotCustom");
    if (messageGrantNotCustom != null) cfg.messageGrantNotCustom = messageGrantNotCustom;
    String messageGrantAlready = valueForKey(raw, "messageGrantAlready");
    if (messageGrantAlready != null) cfg.messageGrantAlready = messageGrantAlready;
    String messageGrantSuccessAdmin = valueForKey(raw, "messageGrantSuccessAdmin");
    if (messageGrantSuccessAdmin != null) cfg.messageGrantSuccessAdmin = messageGrantSuccessAdmin;
    String messageGrantSuccessPlayer = valueForKey(raw, "messageGrantSuccessPlayer");
    if (messageGrantSuccessPlayer != null) cfg.messageGrantSuccessPlayer = messageGrantSuccessPlayer;
    String messageDropFound = valueForKey(raw, "messageDropFound");
    if (messageDropFound != null) cfg.messageDropFound = messageDropFound;
    String messageRedeemSuccess = valueForKey(raw, "messageRedeemSuccess");
    if (messageRedeemSuccess != null) cfg.messageRedeemSuccess = messageRedeemSuccess;
    String messageRedeemAlreadyOwned = valueForKey(raw, "messageRedeemAlreadyOwned");
    if (messageRedeemAlreadyOwned != null) cfg.messageRedeemAlreadyOwned = messageRedeemAlreadyOwned;
    String messageFallbackDrop = valueForKey(raw, "messageFallbackDrop");
    if (messageFallbackDrop != null) cfg.messageFallbackDrop = messageFallbackDrop;

    parseDrops(raw, cfg.drops);

    List<TitleDefinition> parsedTitles = parseTitleList(raw);
    if (!parsedTitles.isEmpty()) cfg.titles = parsedTitles;
    return cfg;
  }

  private void parseDrops(String raw, TitleDropConfig drops) {
    if (drops == null || raw == null || raw.isBlank()) return;
    String[] lines = raw.split("\\r?\\n");
    boolean inDrops = false;
    int dropsIndent = -1;
    for (int i = 0; i < lines.length; i++) {
      String line = lines[i];
      String trimmed = line.trim();
      if (!inDrops) {
        if (trimmed.equals("drops:")) {
          inDrops = true;
          dropsIndent = indentCount(line);
        }
        continue;
      }
      if (trimmed.isBlank()) continue;
      int indent = indentCount(line);
      if (indent <= dropsIndent) break;
      if (trimmed.startsWith("enabled:")) {
        drops.enabled = parseBoolean(cleanYamlScalar(trimmed.substring("enabled:".length()).trim()), drops.enabled);
      } else if (trimmed.startsWith("requireUnlockForStandardTitles:")) {
        drops.requireUnlockForStandardTitles = parseBoolean(cleanYamlScalar(trimmed.substring("requireUnlockForStandardTitles:".length()).trim()), drops.requireUnlockForStandardTitles);
      } else if (trimmed.startsWith("chanceOutOf:")) {
        drops.chanceOutOf = (int) Math.round(parseDouble(cleanYamlScalar(trimmed.substring("chanceOutOf:".length()).trim()), drops.chanceOutOf));
      } else if (trimmed.startsWith("miningChancePercent:")) {
        drops.miningChancePercent = parseDouble(cleanYamlScalar(trimmed.substring("miningChancePercent:".length()).trim()), drops.miningChancePercent);
      } else if (trimmed.startsWith("mobKillChancePercent:")) {
        drops.mobKillChancePercent = parseDouble(cleanYamlScalar(trimmed.substring("mobKillChancePercent:".length()).trim()), drops.mobKillChancePercent);
      } else if (trimmed.startsWith("pokemonCatchChancePercent:")) {
        drops.pokemonCatchChancePercent = parseDouble(cleanYamlScalar(trimmed.substring("pokemonCatchChancePercent:".length()).trim()), drops.pokemonCatchChancePercent);
      } else if (trimmed.startsWith("fallbackEnabled:")) {
        drops.fallbackEnabled = parseBoolean(cleanYamlScalar(trimmed.substring("fallbackEnabled:".length()).trim()), drops.fallbackEnabled);
      } else if (trimmed.startsWith("fallbackCountMin:")) {
        drops.fallbackCountMin = (int) Math.round(parseDouble(cleanYamlScalar(trimmed.substring("fallbackCountMin:".length()).trim()), drops.fallbackCountMin));
      } else if (trimmed.startsWith("fallbackCountMax:")) {
        drops.fallbackCountMax = (int) Math.round(parseDouble(cleanYamlScalar(trimmed.substring("fallbackCountMax:".length()).trim()), drops.fallbackCountMax));
      } else if (trimmed.equals("fallbackItemIds:")) {
        List<String> ids = parseList(lines, i + 1, dropsIndent + 2);
        if (!ids.isEmpty()) drops.fallbackItemIds = ids;
      } else if (trimmed.startsWith("itemName:")) {
        drops.itemName = cleanYamlScalar(trimmed.substring("itemName:".length()).trim());
      } else if (trimmed.equals("itemLore:")) {
        List<String> lore = parseList(lines, i + 1, dropsIndent + 2);
        if (!lore.isEmpty()) drops.itemLore = lore;
      }
    }
  }

  private List<String> parseList(String[] lines, int startIndex, int minIndent) {
    List<String> out = new ArrayList<>();
    for (int i = Math.max(0, startIndex); i < lines.length; i++) {
      String line = lines[i];
      String trimmed = line.trim();
      if (trimmed.isBlank()) continue;
      int indent = indentCount(line);
      if (indent <= minIndent) break;
      if (!trimmed.startsWith("-")) continue;
      out.add(cleanYamlScalar(trimmed.substring(1).trim()));
    }
    return out;
  }

  private boolean parseBoolean(String value, boolean fallback) {
    if (value == null || value.isBlank()) return fallback;
    if ("true".equalsIgnoreCase(value)) return true;
    if ("false".equalsIgnoreCase(value)) return false;
    return fallback;
  }

  private double parseDouble(String value, double fallback) {
    try {
      return Double.parseDouble(value);
    } catch (Exception ignored) {
      return fallback;
    }
  }

  private List<TitleDefinition> parseTitleList(String raw) {
    List<TitleDefinition> out = new ArrayList<>();
    String[] lines = raw.split("\\r?\\n");
    boolean inTitles = false;
    int titlesIndent = -1;
    TitleDefinition current = null;
    boolean inTeamIds = false;
    int teamIndent = -1;

    for (String line : lines) {
      String trimmed = line.trim();
      if (!inTitles) {
        if (trimmed.equals("titles:")) {
          inTitles = true;
          titlesIndent = indentCount(line);
        }
        continue;
      }

      if (trimmed.isEmpty()) continue;
      int indent = indentCount(line);
      if (indent <= titlesIndent && !trimmed.equals("titles:")) break;

      if (trimmed.equals("titles:")) continue;
      if (trimmed.startsWith("- id:") || trimmed.startsWith("-id:")) {
        if (current != null) out.add(current);
        current = new TitleDefinition();
        String value = trimmed.substring(trimmed.indexOf(':') + 1).trim();
        current.id = cleanYamlScalar(value);
        inTeamIds = false;
        continue;
      }
      if (current == null) continue;

      if (trimmed.equals("teamIds:")) {
        inTeamIds = true;
        teamIndent = indent;
        current.teamIds = new ArrayList<>();
        continue;
      } else if (trimmed.startsWith("teamIds:")) {
        String inline = cleanYamlScalar(trimmed.substring("teamIds:".length()).trim());
        current.teamIds = parseInlineList(inline);
        inTeamIds = false;
        continue;
      }

      if (inTeamIds) {
        if (indent <= teamIndent) {
          inTeamIds = false;
        } else if (trimmed.startsWith("-")) {
          current.teamIds.add(cleanYamlScalar(trimmed.substring(1).trim()));
          continue;
        }
      }

      if (trimmed.startsWith("display:")) {
        current.display = cleanYamlScalar(trimmed.substring("display:".length()).trim());
      } else if (trimmed.startsWith("description:")) {
        current.description = cleanYamlScalar(trimmed.substring("description:".length()).trim());
      } else if (trimmed.startsWith("iconItemId:")) {
        current.iconItemId = cleanYamlScalar(trimmed.substring("iconItemId:".length()).trim());
      } else if (trimmed.startsWith("defaultPosition:")) {
        current.defaultPosition = cleanYamlScalar(trimmed.substring("defaultPosition:".length()).trim());
      } else if (trimmed.startsWith("order:")) {
        try {
          current.order = Integer.parseInt(cleanYamlScalar(trimmed.substring("order:".length()).trim()));
        } catch (Exception ignored) {
        }
      }
    }
    if (current != null) out.add(current);
    return out;
  }

  private List<String> parseInlineList(String raw) {
    String value = safe(raw);
    if (value.isBlank() || "[]".equals(value)) return new ArrayList<>();
    if (!value.startsWith("[") || !value.endsWith("]")) return new ArrayList<>();
    String body = value.substring(1, value.length() - 1).trim();
    if (body.isBlank()) return new ArrayList<>();
    List<String> out = new ArrayList<>();
    for (String part : body.split(",")) {
      String entry = cleanYamlScalar(part.trim());
      if (!entry.isBlank()) out.add(entry);
    }
    return out;
  }

  private String valueForKey(String raw, String key) {
    String[] lines = raw.split("\\r?\\n");
    String prefix = key + ":";
    for (String line : lines) {
      String trimmed = line.trim();
      if (!trimmed.startsWith(prefix)) continue;
      return cleanYamlScalar(trimmed.substring(prefix.length()).trim());
    }
    return null;
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

  private String escapeYaml(String value) {
    if (value == null) return "";
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n");
  }

  private void ensureConfigDefaults(TitleConfig cfg) {
    if (cfg.titles == null) cfg.titles = new ArrayList<>();
    if (cfg.drops == null) cfg.drops = new TitleDropConfig();
    if (safe(cfg.menuTitle).isBlank()) cfg.menuTitle = "&8Titles";
    if (safe(cfg.messageSet).isBlank()) cfg.messageSet = "&aTitle set: {title} &7({position})";
    if (safe(cfg.messageClear).isBlank()) cfg.messageClear = "&eTitle cleared.";
    if (safe(cfg.messageUnknown).isBlank()) cfg.messageUnknown = "&cUnknown title: {titleId}";
    if (safe(cfg.messageNotAvailable).isBlank()) cfg.messageNotAvailable = "&cThat title is unavailable for you.";
    if (safe(cfg.messageGrantNotCustom).isBlank()) cfg.messageGrantNotCustom = "&cThat title is not marked as custom.";
    if (safe(cfg.messageGrantAlready).isBlank()) cfg.messageGrantAlready = "&ePlayer already has access to {title}.";
    if (safe(cfg.messageGrantSuccessAdmin).isBlank()) cfg.messageGrantSuccessAdmin = "&aGranted {title} &ato player.";
    if (safe(cfg.messageGrantSuccessPlayer).isBlank()) cfg.messageGrantSuccessPlayer = "&aYou unlocked title {title}&a!";
    if (safe(cfg.messageDropFound).isBlank()) cfg.messageDropFound = "&dYou found a redeemable nametag for {title}&d!";
    if (safe(cfg.messageRedeemSuccess).isBlank()) cfg.messageRedeemSuccess = "&aUnlocked title {title}&a!";
    if (safe(cfg.messageRedeemAlreadyOwned).isBlank()) cfg.messageRedeemAlreadyOwned = "&eYou already unlocked {title}&e.";
    if (safe(cfg.messageFallbackDrop).isBlank()) cfg.messageFallbackDrop = "&bBonus drop: &f{count}x {itemName}";
    cfg.drops.chanceOutOf = Math.max(1, cfg.drops.chanceOutOf);
    cfg.drops.miningChancePercent = clamp(cfg.drops.miningChancePercent, 0.0D, cfg.drops.chanceOutOf);
    cfg.drops.mobKillChancePercent = clamp(cfg.drops.mobKillChancePercent, 0.0D, cfg.drops.chanceOutOf);
    cfg.drops.pokemonCatchChancePercent = clamp(cfg.drops.pokemonCatchChancePercent, 0.0D, cfg.drops.chanceOutOf);
    cfg.drops.fallbackCountMin = Math.max(1, cfg.drops.fallbackCountMin);
    cfg.drops.fallbackCountMax = Math.max(cfg.drops.fallbackCountMin, cfg.drops.fallbackCountMax);
    if (cfg.drops.fallbackItemIds == null || cfg.drops.fallbackItemIds.isEmpty()) {
      cfg.drops.fallbackItemIds = new ArrayList<>(List.of(
        "cobblemon:relic_coin",
        "cobblemon:exp_candy_s",
        "cobblemon:poke_ball",
        "cobblemon:great_ball",
        "minecraft:gold_nugget"
      ));
    }
    if (safe(cfg.drops.itemName).isBlank()) cfg.drops.itemName = "&dRedeemable: {title}";
    if (cfg.drops.itemLore == null || cfg.drops.itemLore.isEmpty()) {
      cfg.drops.itemLore = new ArrayList<>(List.of(
        "&7Unlock this title permanently.",
        "&eRight-click while holding to redeem.",
        "&8Title: {titleId}"
      ));
    }
    Map<String, TitleDefinition> dedup = new LinkedHashMap<>();
    for (TitleDefinition title : cfg.titles) {
      if (title == null) continue;
      title.id = normalize(title.id);
      if (title.id.isBlank()) continue;
      if (safe(title.display).isBlank()) title.display = "&f" + title.id;
      if (safe(title.iconItemId).isBlank()) title.iconItemId = "minecraft:name_tag";
      title.defaultPosition = normalizePosition(title.defaultPosition);
      if (title.teamIds == null) title.teamIds = new ArrayList<>();
      List<String> teamIds = new ArrayList<>();
      for (String teamId : title.teamIds) {
        String normalized = normalize(teamId);
        if (!normalized.isBlank()) teamIds.add(normalized);
      }
      title.teamIds = teamIds;
      title.order = Math.max(0, title.order);
      dedup.put(title.id, title);
    }
    cfg.titles = new ArrayList<>(dedup.values());
    if (cfg.titles.isEmpty()) cfg.titles = defaults().titles;
  }

  private TitleDefinition titleById(String idRaw) {
    String id = normalize(idRaw);
    for (TitleDefinition title : config.titles) {
      if (title == null) continue;
      if (normalize(title.id).equals(id)) return title;
    }
    return null;
  }

  private boolean isAllowedForTeam(TitleDefinition title, String teamIdRaw, UUID uuid) {
    if (title == null) return false;
    if (uuid != null) {
      PlayerTitleState playerState = state(uuid);
      if (playerState.grantedAllTitles) return true;
      if (hasUnlocked(playerState, title.id)) return true;
    }
    boolean custom = isCustomTitle(title);
    if (custom) return false;
    if (config != null && config.drops != null && config.drops.requireUnlockForStandardTitles) return false;
    if (title.teamIds == null || title.teamIds.isEmpty()) return true;
    String teamId = normalize(teamIdRaw);
    for (String allowed : title.teamIds) {
      if ("custom".equals(normalize(allowed))) continue;
      if (normalize(allowed).equals(teamId)) return true;
    }
    return false;
  }

  private boolean isCustomTitle(TitleDefinition title) {
    if (title == null || title.teamIds == null) return false;
    for (String entry : title.teamIds) {
      if ("custom".equals(normalize(entry))) return true;
    }
    return false;
  }

  private boolean hasUnlocked(PlayerTitleState state, String titleIdRaw) {
    if (state == null) return false;
    if (state.grantedCustomTitles == null) state.grantedCustomTitles = new ArrayList<>();
    if (state.unlockedDropTitles == null) state.unlockedDropTitles = new ArrayList<>();
    String titleId = normalize(titleIdRaw);
    for (String granted : state.grantedCustomTitles) {
      if (normalize(granted).equals(titleId)) return true;
    }
    for (String unlocked : state.unlockedDropTitles) {
      if (normalize(unlocked).equals(titleId)) return true;
    }
    return false;
  }

  private PlayerTitleState state(UUID uuid) {
    String key = uuid == null ? "" : uuid.toString();
    PlayerTitleState state = store.players.computeIfAbsent(key, ignored -> new PlayerTitleState());
    if (state.grantedCustomTitles == null) state.grantedCustomTitles = new ArrayList<>();
    if (state.unlockedDropTitles == null) state.unlockedDropTitles = new ArrayList<>();
    return state;
  }

  private void writePlayerDataYaml() {
    try {
      Files.createDirectories(BASE_DIR);
      StringBuilder out = new StringBuilder();
      out.append("titlePlayerData:\n");
      out.append("  generatedAtEpochMs: ").append(System.currentTimeMillis()).append("\n");
      out.append("  players:\n");
      List<String> playerKeys = new ArrayList<>(store.players == null ? List.of() : store.players.keySet());
      playerKeys.sort(String::compareToIgnoreCase);
      for (String key : playerKeys) {
        PlayerTitleState state = store.players.get(key);
        if (state == null) continue;
        if (state.grantedCustomTitles == null) state.grantedCustomTitles = new ArrayList<>();
        if (state.unlockedDropTitles == null) state.unlockedDropTitles = new ArrayList<>();
        List<String> granted = new ArrayList<>(state.grantedCustomTitles);
        granted.sort(String::compareToIgnoreCase);
        List<String> unlockedDrops = new ArrayList<>(state.unlockedDropTitles);
        unlockedDrops.sort(String::compareToIgnoreCase);
        out.append("    \"").append(escapeYaml(key)).append("\":\n");
        out.append("      titleId: \"").append(escapeYaml(safe(state.titleId))).append("\"\n");
        out.append("      position: \"").append(escapeYaml(normalizePosition(state.position))).append("\"\n");
        out.append("      grantedAllTitles: ").append(state.grantedAllTitles).append("\n");
        out.append("      grantedCustomTitles:\n");
        for (String titleId : granted) {
          out.append("        - \"").append(escapeYaml(titleId)).append("\"\n");
        }
        out.append("      unlockedDropTitles:\n");
        for (String titleId : unlockedDrops) {
          out.append("        - \"").append(escapeYaml(titleId)).append("\"\n");
        }
      }
      FileWriteUtil.writeStringAtomic(PLAYERDATA_YML_PATH, out.toString());
    } catch (Exception e) {
      LOGGER.warn("[SogkiCobblemon] Failed to export titles-playerdata.yml: {}", e.getMessage());
    }
  }

  private String normalize(String value) {
    return safe(value).toLowerCase(Locale.ROOT);
  }

  private String normalizePosition(String value) {
    String pos = normalize(value);
    return "suffix".equals(pos) ? "suffix" : "prefix";
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private double clamp(double value, double min, double max) {
    return Math.max(min, Math.min(max, value));
  }

  private String ensureTrailingSpace(String value) {
    String out = value == null ? "" : value;
    if (out.isBlank()) return "";
    return out.endsWith(" ") ? out : out + " ";
  }

  private String ensureLeadingSpace(String value) {
    String out = value == null ? "" : value;
    if (out.isBlank()) return "";
    return out.startsWith(" ") ? out : " " + out;
  }

  private String render(String template, Map<String, String> values) {
    return TemplateEngine.render(safe(template), values == null ? Map.of() : values);
  }

  private TitleConfig defaults() {
    TitleConfig cfg = new TitleConfig();
    cfg.menuTitle = "&8Titles";
    cfg.drops = new TitleDropConfig();
    cfg.titles = new ArrayList<>(List.of(
      title("valor_elite", "&cValor Elite", "&7Exclusive to Team Valor.", "minecraft:blaze_powder", "prefix", 1, List.of("valor")),
      title("mystic_scholar", "&9Mystic Scholar", "&7Exclusive to Team Mystic.", "minecraft:lapis_lazuli", "prefix", 2, List.of("mystic")),
      title("instinct_hunter", "&eInstinct Hunter", "&7Exclusive to Team Instinct.", "minecraft:gold_ingot", "prefix", 3, List.of("instinct")),
      title("champion", "&6Champion", "&7Awarded to top trainers.", "minecraft:nether_star", "suffix", 10, List.of())
    ));
    return cfg;
  }

  private TitleDefinition title(String id, String display, String description, String iconItemId, String defaultPosition,
                                int order, List<String> teamIds) {
    TitleDefinition title = new TitleDefinition();
    title.id = id;
    title.display = display;
    title.description = description;
    title.iconItemId = iconItemId;
    title.defaultPosition = defaultPosition;
    title.order = order;
    title.teamIds = new ArrayList<>(teamIds == null ? List.of() : teamIds);
    return title;
  }

  public record Selection(String titleId, String position) {
    public static Selection none() {
      return new Selection("", "prefix");
    }
  }

  public record CommandResult(boolean ok, String message) {
    public static CommandResult success(String message) {
      return new CommandResult(true, message);
    }

    public static CommandResult error(String message) {
      return new CommandResult(false, message);
    }
  }

  public static final class TitleConfig {
    public String menuTitle = "&8Titles";
    public String messageSet = "&aTitle set: {title} &7({position})";
    public String messageClear = "&eTitle cleared.";
    public String messageUnknown = "&cUnknown title: {titleId}";
    public String messageNotAvailable = "&cThat title is unavailable for you.";
    public String messageGrantNotCustom = "&cThat title is not marked as custom.";
    public String messageGrantAlready = "&ePlayer already has access to {title}.";
    public String messageGrantSuccessAdmin = "&aGranted {title} &ato player.";
    public String messageGrantSuccessPlayer = "&aYou unlocked title {title}&a!";
    public String messageDropFound = "&dYou found a redeemable nametag for {title}&d!";
    public String messageRedeemSuccess = "&aUnlocked title {title}&a!";
    public String messageRedeemAlreadyOwned = "&eYou already unlocked {title}&e.";
    public String messageFallbackDrop = "&bBonus drop: &f{count}x {itemName}";
    public TitleDropConfig drops = new TitleDropConfig();
    public List<TitleDefinition> titles = new ArrayList<>();
  }

  public static final class TitleDropConfig {
    public boolean enabled = true;
    public boolean requireUnlockForStandardTitles = true;
    public int chanceOutOf = 300;
    public double miningChancePercent = 0.75D;
    public double mobKillChancePercent = 1.5D;
    public double pokemonCatchChancePercent = 2.0D;
    public boolean fallbackEnabled = true;
    public int fallbackCountMin = 1;
    public int fallbackCountMax = 4;
    public List<String> fallbackItemIds = new ArrayList<>(List.of(
      "cobblemon:relic_coin",
      "cobblemon:exp_candy_s",
      "cobblemon:poke_ball",
      "cobblemon:great_ball",
      "minecraft:gold_nugget"
    ));
    public String itemName = "&dRedeemable: {title}";
    public List<String> itemLore = new ArrayList<>(List.of(
      "&7Unlock this title permanently.",
      "&eRight-click while holding to redeem.",
      "&8Title: {titleId}"
    ));
  }

  public static final class TitleDefinition {
    public String id = "champion";
    public String display = "&6Champion";
    public String description = "";
    public String iconItemId = "minecraft:name_tag";
    public String defaultPosition = "prefix";
    public int order = 0;
    public List<String> teamIds = new ArrayList<>();
  }

  private static final class PlayerTitleStore {
    Map<String, PlayerTitleState> players = new HashMap<>();
  }

  private static final class PlayerTitleState {
    String titleId = "";
    String position = "prefix";
    List<String> grantedCustomTitles = new ArrayList<>();
    List<String> unlockedDropTitles = new ArrayList<>();
    boolean grantedAllTitles = false;
  }
}
