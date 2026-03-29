package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.LoreComponent;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.entity.player.PlayerInventory;
import net.minecraft.inventory.Inventory;
import net.minecraft.inventory.SimpleInventory;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.registry.Registries;
import net.minecraft.screen.GenericContainerScreenHandler;
import net.minecraft.screen.ScreenHandlerType;
import net.minecraft.screen.SimpleNamedScreenHandlerFactory;
import net.minecraft.screen.slot.SlotActionType;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Unit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class SkillTreeMenuService {
  private static final int SIZE = 54;
  private static final int PREV_SLOT = 48;
  private static final int PAGE_SLOT = 49;
  private static final int NEXT_SLOT = 50;
  private static final int CLOSE_SLOT = 53;
  private static final int INFO_SLOT = 4;
  private static final int OPTION_RESET_SLOT = 3;
  private static final int OPTION_BACK_SLOT = 5;
  private static final List<Integer> BASE_TIER_COLUMNS = List.of(1, 3, 5, 7);

  public void open(PlayerEntity player, SkillTreeService skillTree) {
    open(player, skillTree, 1);
  }

  private void open(PlayerEntity player, SkillTreeService skillTree, int requestedPage) {
    if (player == null || skillTree == null) return;
    int maxPage = Math.max(1, maxPage(skillTree));
    int page = Math.max(1, Math.min(maxPage, requestedPage));
    if (!canAccessPage(skillTree, player, page)) {
      page = 1;
    }
    SimpleInventory inventory = new SimpleInventory(SIZE);
    Map<Integer, String> nodeSlots = new HashMap<>();
    fillBackground(inventory);
    placeControls(inventory, skillTree, player, page, maxPage);
    placeNodes(inventory, skillTree, player, nodeSlots, page, tierColumns(skillTree));

    final int currentPage = page;
    Text title = Text.literal(TemplateEngine.render("&8Skill Tree &7- &f" + skillTree.points(player.getUuid()) + " pts &8| &7Page &f" + currentPage, Map.of()));
    player.openHandledScreen(new SimpleNamedScreenHandlerFactory((syncId, playerInventory, owner) ->
      new SkillTreeScreenHandler(syncId, playerInventory, inventory, owner, skillTree, this, nodeSlots, currentPage), title));
  }

  private void fillBackground(SimpleInventory inventory) {
    ItemStack filler = new ItemStack(Items.GRAY_STAINED_GLASS_PANE);
    filler.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
    for (int i = 0; i < inventory.size(); i++) {
      inventory.setStack(i, filler.copy());
    }
  }

  private void placeControls(SimpleInventory inventory, SkillTreeService skillTree, PlayerEntity player, int page, int maxPage) {
    ItemStack info = new ItemStack(Items.NETHER_STAR);
    info.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&bSkill Tree", Map.of())));
    info.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&7Unlock nodes to shape your build.", Map.of())),
      Text.literal(TemplateEngine.render("&8Rows = branches, columns = tiers.", Map.of())),
      Text.literal(TemplateEngine.render("&8Blue = locked path, Yellow = next, Green = completed", Map.of())),
      Text.literal(TemplateEngine.render("&eClick for options", Map.of()))
    )));
    inventory.setStack(INFO_SLOT, info);

    ItemStack prev = new ItemStack(Items.ARROW);
    prev.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Previous Page", Map.of())));
    inventory.setStack(PREV_SLOT, prev);

    ItemStack pageInfo = new ItemStack(Items.MAP);
    pageInfo.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&bPage &f" + page + "&8/&f" + maxPage, Map.of())));
    pageInfo.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&7To access later pages, unlock more nodes.", Map.of())),
      Text.literal(TemplateEngine.render("&8Requirement: " + skillTree.pageUnlockRequirement() + " unlocked nodes per page step", Map.of()))
    )));
    inventory.setStack(PAGE_SLOT, pageInfo);

    ItemStack next = new ItemStack(Items.SPECTRAL_ARROW);
    next.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Next Page", Map.of())));
    boolean canGoNext = page < maxPage && canAccessPage(skillTree, player, page + 1);
    List<Text> nextLore = new ArrayList<>();
    if (!canGoNext && page < maxPage) {
      int needed = Math.max(0, (page * skillTree.pageUnlockRequirement()) - skillTree.unlocked(player.getUuid()).size());
      nextLore.add(Text.literal(TemplateEngine.render("&cUnlock " + needed + " more node(s) to access next page.", Map.of())));
    } else {
      nextLore.add(Text.literal(TemplateEngine.render("&eClick to view next page.", Map.of())));
    }
    next.set(DataComponentTypes.LORE, new LoreComponent(nextLore));
    inventory.setStack(NEXT_SLOT, next);

    ItemStack close = new ItemStack(Items.OAK_DOOR);
    close.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Close", Map.of())));
    inventory.setStack(CLOSE_SLOT, close);
  }

  private void placeNodes(SimpleInventory inventory, SkillTreeService skillTree, PlayerEntity player,
                          Map<Integer, String> nodeSlots, int page, List<Integer> tierColumns) {
    List<SkillTreeService.SkillNode> nodes = skillTree.nodes();
    int tiersPerPage = Math.max(1, tierColumns.size());
    int startTier = ((page - 1) * tiersPerPage) + 1;
    int endTier = startTier + tiersPerPage - 1;
    Map<String, SkillTreeService.SkillCategory> categoryInfo = categoryMap(skillTree);
    Map<String, SkillTreeService.SkillNode> byId = new HashMap<>();
    for (SkillTreeService.SkillNode node : nodes) {
      byId.put(safe(node.id), node);
    }
    Map<String, Integer> tierById = new HashMap<>();
    for (SkillTreeService.SkillNode node : nodes) {
      computeTier(node, byId, tierById, new ArrayList<>());
    }

    Map<String, List<SkillTreeService.SkillNode>> byCategory = new HashMap<>();
    for (SkillTreeService.SkillNode node : nodes) {
      String category = normalizeCategory(node.category, categoryInfo);
      byCategory.computeIfAbsent(category, ignored -> new ArrayList<>()).add(node);
    }
    Map<String, Integer> categoryRows = categoryRows(skillTree, byCategory);

    for (String category : categoryRows.keySet()) {
      int row = categoryRows.get(category);
      List<SkillTreeService.SkillNode> ordered = byCategory.getOrDefault(category, new ArrayList<>());
      ordered.sort(java.util.Comparator
        .comparingInt((SkillTreeService.SkillNode n) -> Math.max(1, tierById.getOrDefault(safe(n.id), 1)))
        .thenComparing(n -> safe(n.id)));
      for (SkillTreeService.SkillNode node : ordered) {
        int tier = Math.max(1, tierById.getOrDefault(safe(node.id), 1));
        if (tier < startTier || tier > endTier) continue;
        int tierInPage = tier - startTier;
        if (tierInPage < 0 || tierInPage >= tierColumns.size()) continue;
        int col = tierColumns.get(tierInPage);
        int slot = slot(row, col);
        inventory.setStack(slot, nodeIcon(node, skillTree, player, categoryInfo));
        nodeSlots.put(slot, node.id);
      }

      drawProgressPanes(inventory, row, skillTree, player, nodeSlots, tierColumns);
    }
  }

  private ItemStack nodeIcon(SkillTreeService.SkillNode node, SkillTreeService skillTree, PlayerEntity player,
                             Map<String, SkillTreeService.SkillCategory> categoryInfo) {
    ItemStack icon = new ItemStack(categoryItem(node.category, node.iconItemId, categoryInfo));
    sanitizeDisplayStack(icon);
    SkillTreeService.SkillUiConfig ui = skillTree.ui();
    SkillTreeService.SkillTooltipConfig tooltip = skillTree.tooltips();
    String nodeId = safe(node.id);
    List<String> unmet = prettyUnmetRequirements(skillTree, player, nodeId);
    boolean unlocked = skillTree.unlocked(player.getUuid()).contains(nodeId);
    boolean hasPoints = skillTree.points(player.getUuid()) >= Math.max(1, node.cost);
    boolean available = !unlocked && unmet.isEmpty() && hasPoints;

    String status = unlocked
      ? (safe(tooltip.statusUnlockedText).isBlank() ? ui.nodeStatusUnlocked : tooltip.statusUnlockedText)
      : (available
      ? (safe(tooltip.statusAvailableText).isBlank() ? ui.nodeStatusAvailable : tooltip.statusAvailableText)
      : (safe(tooltip.statusLockedText).isBlank() ? ui.nodeStatusLocked : tooltip.statusLockedText));
    Map<String, String> values = tooltipValues(node, skillTree, player, unlocked, available, status, unmet);
    String titleTemplate = unlocked
      ? safe(tooltip.titleUnlocked)
      : (available ? safe(tooltip.titleAvailable) : safe(tooltip.titleLocked));
    if (titleTemplate.isBlank()) {
      String titleColor = unlocked ? safe(ui.nodeTitleUnlockedColor) : (available ? safe(ui.nodeTitleAvailableColor) : safe(ui.nodeTitleLockedColor));
      titleTemplate = titleColor + "{nodeName}";
    }
    icon.set(DataComponentTypes.CUSTOM_NAME, Text.literal(renderTooltipLine(titleTemplate, values)));

    List<Text> lore = new ArrayList<>();
    List<String> loreTemplates = tooltip.lore == null ? List.of() : tooltip.lore;
    if (loreTemplates.isEmpty()) {
      loreTemplates = List.of(
        "&7Effect",
        "&f{description}",
        "",
        "&8&m----------------",
        "&7Path: &f{path}",
        "&7Cost: &f{cost} &8| {status}",
        "{requiresLine}",
        "{actionLine}"
      );
    }
    for (String lineTemplate : loreTemplates) {
      String rendered = renderTooltipLine(lineTemplate, values);
      if (rendered.isBlank()) {
        lore.add(Text.literal(" "));
      } else {
        lore.add(Text.literal(rendered));
      }
    }
    icon.set(DataComponentTypes.LORE, new LoreComponent(lore));
    return icon;
  }

  private void sanitizeDisplayStack(ItemStack stack) {
    if (stack == null) return;
    stack.remove(DataComponentTypes.LORE);
    stack.set(DataComponentTypes.HIDE_ADDITIONAL_TOOLTIP, Unit.INSTANCE);
  }

  private Map<String, String> tooltipValues(SkillTreeService.SkillNode node, SkillTreeService skillTree, PlayerEntity player,
                                            boolean unlocked, boolean available, String status, List<String> unmet) {
    Map<String, String> values = new HashMap<>();
    SkillTreeService.SkillTooltipConfig tooltip = skillTree.tooltips();
    int points = player == null ? 0 : skillTree.points(player.getUuid());
    int unlockedCount = player == null ? 0 : skillTree.totalUnlocked(player.getUuid());
    String actionUnlocked = safe(tooltip.actionUnlockedText).isBlank() ? "&aUnlocked" : safe(tooltip.actionUnlockedText);
    String actionAvailable = safe(tooltip.actionAvailableText).isBlank() ? "&eClick to unlock" : safe(tooltip.actionAvailableText);
    String actionLocked = safe(tooltip.actionLockedText);
    String statusRaw = unlocked ? "unlocked" : (available ? "available" : "locked");
    String statusText = unlocked
      ? (safe(tooltip.statusUnlockedText).isBlank() ? "&aUnlocked" : safe(tooltip.statusUnlockedText))
      : (available
      ? (safe(tooltip.statusAvailableText).isBlank() ? "&eAvailable" : safe(tooltip.statusAvailableText))
      : (safe(tooltip.statusLockedText).isBlank() ? "&cLocked" : safe(tooltip.statusLockedText)));

    values.put("nodeId", safe(node.id));
    values.put("nodeName", safe(node.name));
    values.put("description", safe(node.description));
    values.put("descriptionColored", "&f" + safe(node.description));
    values.put("path", formatCategory(node.category));
    values.put("cost", String.valueOf(Math.max(1, node.cost)));
    values.put("status", safe(status));
    values.put("statusText", statusText);
    values.put("statusRaw", statusRaw);
    values.put("statusColored", status);
    values.put("points", String.valueOf(Math.max(0, points)));
    values.put("playerPoints", String.valueOf(Math.max(0, points)));
    values.put("unlockedTotal", String.valueOf(Math.max(0, unlockedCount)));
    values.put("effectType", safe(node.effectType));
    values.put("progressType", safe(node.progressType));
    values.put("perkType", safe(node.perkType));
    values.put("value", String.valueOf(node.value));
    values.put("amplifier", String.valueOf(Math.max(0, node.amplifier)));

    String requires = unmet.isEmpty() ? "" : String.join(", ", unmet);
    values.put("requires", requires);
    String requiresTemplate = safe(tooltip.requiresTemplate).isBlank() ? "&cRequires: &f{requires}" : safe(tooltip.requiresTemplate);
    values.put("requiresLine", unmet.isEmpty() ? "" : renderTooltipLine(requiresTemplate, Map.of("requires", requires)));
    if (unlocked) {
      values.put("actionLine", actionUnlocked);
    } else if (available) {
      values.put("actionLine", actionAvailable);
    } else {
      values.put("actionLine", actionLocked);
    }
    return values;
  }

  private String renderTooltipLine(String template, Map<String, String> values) {
    String line = safe(template);
    for (Map.Entry<String, String> entry : values.entrySet()) {
      line = line.replace("{" + entry.getKey() + "}", safe(entry.getValue()));
    }
    return TemplateEngine.render(line, Map.of());
  }

  private Item categoryItem(String category, String nodeIconItemId, Map<String, SkillTreeService.SkillCategory> categoryInfo) {
    String nodeIconId = safe(nodeIconItemId);
    if (!nodeIconId.isBlank()) {
      Identifier parsedNodeIcon = Identifier.tryParse(nodeIconId);
      if (parsedNodeIcon != null && Registries.ITEM.containsId(parsedNodeIcon)) {
        return Registries.ITEM.get(parsedNodeIcon);
      }
    }

    SkillTreeService.SkillCategory info = categoryInfo.get(normalizeCategory(category, categoryInfo));
    String iconId = info == null ? "" : safe(info.iconItemId);
    Identifier parsed = Identifier.tryParse(iconId);
    if (parsed != null && Registries.ITEM.containsId(parsed)) {
      return Registries.ITEM.get(parsed);
    }
    return Items.BOOK;
  }

  private String formatCategory(String category) {
    String normalized = safe(category).toLowerCase(Locale.ROOT);
    return switch (normalized) {
      case "creature_ops" -> "Creature Ops";
      case "recon" -> "Recon";
      case "survival" -> "Survival";
      case "tactics" -> "Tactics";
      default -> capitalize(normalized);
    };
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private String capitalize(String input) {
    if (input == null || input.isBlank()) return "";
    String lower = input.toLowerCase(Locale.ROOT);
    return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
  }

  private int computeTier(SkillTreeService.SkillNode node,
                          Map<String, SkillTreeService.SkillNode> byId,
                          Map<String, Integer> tierById,
                          List<String> stack) {
    String id = safe(node.id);
    if (tierById.containsKey(id)) return tierById.get(id);
    if (stack.contains(id)) return 1;
    stack.add(id);
    int tier = 1;
    if (node.requires != null) {
      for (String req : node.requires) {
        SkillTreeService.SkillNode parent = byId.get(safe(req));
        if (parent == null) continue;
        tier = Math.max(tier, computeTier(parent, byId, tierById, stack) + 1);
      }
    }
    stack.remove(id);
    tierById.put(id, tier);
    return tier;
  }

  private void drawProgressPanes(SimpleInventory inventory, int row, SkillTreeService skillTree, PlayerEntity player,
                                 Map<Integer, String> nodeSlots, List<Integer> tierColumns) {
    int maxConnectors = tierColumns.size() - 1;
    List<String> unlockedIds = skillTree.unlocked(player.getUuid());
    for (int i = 0; i < maxConnectors; i++) {
      int leftNodeSlot = slot(row, tierColumns.get(i));
      int rightNodeSlot = slot(row, tierColumns.get(i + 1));
      String leftNodeId = nodeSlots.get(leftNodeSlot);
      String rightNodeId = nodeSlots.get(rightNodeSlot);
      if (safe(leftNodeId).isBlank()) continue;

      int col = tierColumns.get(i) + 1;
      int connectorSlot = slot(row, col);
      if (nodeSlots.containsKey(connectorSlot)) continue;

      Item item = Items.BLUE_STAINED_GLASS_PANE;
      boolean leftUnlocked = unlockedIds.contains(safe(leftNodeId));
      boolean rightUnlocked = !safe(rightNodeId).isBlank() && unlockedIds.contains(safe(rightNodeId));
      if (leftUnlocked && rightUnlocked) {
        item = Items.LIME_STAINED_GLASS_PANE;
      } else if (leftUnlocked) {
        item = Items.YELLOW_STAINED_GLASS_PANE;
      }
      ItemStack pane = new ItemStack(item);
      pane.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
      inventory.setStack(connectorSlot, pane);
    }
  }

  private int maxPage(SkillTreeService skillTree) {
    int maxTier = 1;
    Map<String, SkillTreeService.SkillNode> byId = new HashMap<>();
    for (SkillTreeService.SkillNode node : skillTree.nodes()) {
      byId.put(safe(node.id), node);
    }
    Map<String, Integer> tierById = new HashMap<>();
    for (SkillTreeService.SkillNode node : skillTree.nodes()) {
      int tier = computeTier(node, byId, tierById, new ArrayList<>());
      maxTier = Math.max(maxTier, tier);
    }
    int tiersPerPage = Math.max(1, tierColumns(skillTree).size());
    return (int) Math.ceil(maxTier / (double) tiersPerPage);
  }

  private boolean canAccessPage(SkillTreeService skillTree, PlayerEntity player, int page) {
    if (page <= 1) return true;
    int unlockedCount = skillTree.unlocked(player.getUuid()).size();
    int requiredUnlocked = Math.max(0, (page - 1) * skillTree.pageUnlockRequirement());
    return unlockedCount >= requiredUnlocked;
  }

  private String normalizeCategory(String category, Map<String, SkillTreeService.SkillCategory> categoryInfo) {
    String normalized = safe(category).toLowerCase(Locale.ROOT);
    if (categoryInfo.containsKey(normalized)) return normalized;
    if (!categoryInfo.isEmpty()) return categoryInfo.keySet().iterator().next();
    return "recon";
  }

  private Map<String, SkillTreeService.SkillCategory> categoryMap(SkillTreeService skillTree) {
    Map<String, SkillTreeService.SkillCategory> out = new HashMap<>();
    for (SkillTreeService.SkillCategory category : skillTree.categories()) {
      if (category == null) continue;
      String key = safe(category.id).toLowerCase(Locale.ROOT);
      if (key.isBlank()) continue;
      out.putIfAbsent(key, category);
    }
    return out;
  }

  private Map<String, Integer> categoryRows(SkillTreeService skillTree, Map<String, List<SkillTreeService.SkillNode>> byCategory) {
    List<SkillTreeService.SkillCategory> categories = new ArrayList<>(skillTree.categories());
    categories.sort(java.util.Comparator.comparingInt(c -> Math.max(1, c.row)));
    Map<String, Integer> out = new HashMap<>();
    int displayRow = 1;
    for (SkillTreeService.SkillCategory category : categories) {
      if (category == null) continue;
      String key = safe(category.id).toLowerCase(Locale.ROOT);
      if (key.isBlank()) continue;
      if (!byCategory.containsKey(key)) continue;
      out.putIfAbsent(key, Math.max(1, Math.min(4, displayRow)));
      displayRow++;
      if (displayRow > 4) break;
    }
    if (out.isEmpty()) {
      out.put("recon", 1);
      out.put("survival", 2);
      out.put("tactics", 3);
      out.put("creature_ops", 4);
    }
    return out;
  }

  private List<Integer> tierColumns(SkillTreeService skillTree) {
    int perPage = Math.max(1, Math.min(BASE_TIER_COLUMNS.size(), skillTree.tiersPerPage()));
    return new ArrayList<>(BASE_TIER_COLUMNS.subList(0, perPage));
  }

  private int slot(int row, int col) {
    return row * 9 + col;
  }

  private List<String> prettyUnmetRequirements(SkillTreeService skillTree, PlayerEntity player, String nodeId) {
    List<String> unmet = skillTree.unmetRequirements(player.getUuid(), nodeId);
    List<String> out = new ArrayList<>();
    for (String reqId : unmet) {
      SkillTreeService.SkillNode req = skillTree.node(reqId);
      out.add(req == null ? reqId : safe(req.name));
    }
    return out;
  }

  private void openOptions(PlayerEntity player, SkillTreeService skillTree, int returnPage) {
    if (player == null || skillTree == null) return;
    SimpleInventory inventory = new SimpleInventory(9);
    ItemStack filler = new ItemStack(Items.BLACK_STAINED_GLASS_PANE);
    filler.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
    for (int i = 0; i < 9; i++) {
      inventory.setStack(i, filler.copy());
    }

    ItemStack reset = new ItemStack(Items.BARRIER);
    reset.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&cReset Skill Tree", Map.of())));
    reset.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&7Refund all spent points.", Map.of())),
      Text.literal(TemplateEngine.render("&eClick to confirm reset", Map.of()))
    )));
    inventory.setStack(OPTION_RESET_SLOT, reset);

    ItemStack back = new ItemStack(Items.ARROW);
    back.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Back to Skill Tree", Map.of())));
    inventory.setStack(OPTION_BACK_SLOT, back);

    Text title = Text.literal(TemplateEngine.render("&8Skill Tree Options", Map.of()));
    player.openHandledScreen(new SimpleNamedScreenHandlerFactory((syncId, playerInventory, owner) ->
      new SkillTreeOptionsScreenHandler(syncId, playerInventory, inventory, owner, skillTree, this, returnPage), title));
  }

  private static final class SkillTreeScreenHandler extends GenericContainerScreenHandler {
    private final PlayerEntity owner;
    private final SkillTreeService skillTree;
    private final SkillTreeMenuService menu;
    private final Map<Integer, String> nodeSlots;
    private final int page;

    private SkillTreeScreenHandler(int syncId, PlayerInventory playerInventory, Inventory inventory, PlayerEntity owner,
                                   SkillTreeService skillTree, SkillTreeMenuService menu, Map<Integer, String> nodeSlots, int page) {
      super(ScreenHandlerType.GENERIC_9X6, syncId, playerInventory, inventory, 6);
      this.owner = owner;
      this.skillTree = skillTree;
      this.menu = menu;
      this.nodeSlots = nodeSlots;
      this.page = page;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity serverPlayer)) return;

      if (slotIndex == PREV_SLOT) {
        menu.open(serverPlayer, skillTree, Math.max(1, page - 1));
        return;
      }

      if (slotIndex == NEXT_SLOT) {
        menu.open(serverPlayer, skillTree, page + 1);
        return;
      }

      if (slotIndex == INFO_SLOT) {
        menu.openOptions(serverPlayer, skillTree, page);
        return;
      }

      if (slotIndex == CLOSE_SLOT) {
        serverPlayer.closeHandledScreen();
        return;
      }

      String nodeId = nodeSlots.get(slotIndex);
      if (nodeId == null || nodeId.isBlank()) return;
      SkillTreeService.CommandResult result = skillTree.unlock(serverPlayer, nodeId);
      serverPlayer.sendMessage(Text.literal(TemplateEngine.render(result.message(), Map.of())));
      menu.open(serverPlayer, skillTree, page);
    }
  }

  private static final class SkillTreeOptionsScreenHandler extends GenericContainerScreenHandler {
    private final SkillTreeService skillTree;
    private final SkillTreeMenuService menu;
    private final int returnPage;

    private SkillTreeOptionsScreenHandler(int syncId, PlayerInventory playerInventory, Inventory inventory, PlayerEntity owner,
                                          SkillTreeService skillTree, SkillTreeMenuService menu, int returnPage) {
      super(ScreenHandlerType.GENERIC_9X1, syncId, playerInventory, inventory, 1);
      this.skillTree = skillTree;
      this.menu = menu;
      this.returnPage = Math.max(1, returnPage);
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity serverPlayer)) return;
      if (slotIndex == OPTION_RESET_SLOT) {
        SkillTreeService.CommandResult result = skillTree.reset(serverPlayer.getUuid());
        serverPlayer.sendMessage(Text.literal(TemplateEngine.render(result.message(), Map.of())));
        menu.open(serverPlayer, skillTree, 1);
        return;
      }
      if (slotIndex == OPTION_BACK_SLOT) {
        menu.open(serverPlayer, skillTree, returnPage);
      }
    }
  }
}
