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
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Unit;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class TitleMenuService {
  private static final int SIZE = 54;
  private static final int PREV_SLOT = 45;
  private static final int CLEAR_SLOT = 48;
  private static final int INFO_SLOT = 49;
  private static final int NEXT_SLOT = 50;
  private static final int CLOSE_SLOT = 53;
  private static final int PAGE_SIZE = 45;

  public void open(ServerPlayerEntity player, TitleService titles, TeamService teams, int requestedPage) {
    if (player == null || titles == null || teams == null) return;
    TeamId playerTeam = teams.getTeam(player.getUuid());
    String teamId = playerTeam == null ? "unassigned" : playerTeam.id();
    List<TitleService.TitleDefinition> available = titles.titlesForPlayer(player.getUuid(), teamId);
    int maxPage = Math.max(1, (int) Math.ceil(available.size() / (double) PAGE_SIZE));
    int page = Math.max(1, Math.min(maxPage, requestedPage));
    int start = (page - 1) * PAGE_SIZE;
    int end = Math.min(available.size(), start + PAGE_SIZE);

    SimpleInventory inventory = new SimpleInventory(SIZE);
    fillBackground(inventory);
    Map<Integer, String> slotToTitleId = new HashMap<>();

    int slot = 0;
    for (int i = start; i < end; i++) {
      TitleService.TitleDefinition title = available.get(i);
      if (title == null) continue;
      inventory.setStack(slot, titleIcon(player, titles, title));
      slotToTitleId.put(slot, title.id);
      slot++;
    }

    placeControls(inventory, titles, page, maxPage);
    Text title = Text.literal(TemplateEngine.render(titles.menuTitle() + " &8| &7Page &f" + page + "&8/&f" + maxPage, Map.of()));
    player.openHandledScreen(new SimpleNamedScreenHandlerFactory((syncId, playerInventory, owner) ->
      new TitleScreenHandler(syncId, playerInventory, inventory, owner, titles, teams, this, slotToTitleId, page), title));
  }

  private void fillBackground(SimpleInventory inventory) {
    ItemStack filler = new ItemStack(Items.BLACK_STAINED_GLASS_PANE);
    filler.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
    for (int i = 0; i < inventory.size(); i++) {
      inventory.setStack(i, filler.copy());
    }
  }

  private void placeControls(SimpleInventory inventory, TitleService titles, int page, int maxPage) {
    ItemStack prev = new ItemStack(Items.ARROW);
    prev.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Previous Page", Map.of())));
    inventory.setStack(PREV_SLOT, prev);

    ItemStack clear = new ItemStack(Items.BARRIER);
    clear.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&cClear Title", Map.of())));
    clear.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&7Removes your selected title.", Map.of()))
    )));
    inventory.setStack(CLEAR_SLOT, clear);

    ItemStack info = new ItemStack(Items.NAME_TAG);
    info.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&bTitle Controls", Map.of())));
    info.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&eLeft Click &7= Set as prefix", Map.of())),
      Text.literal(TemplateEngine.render("&eRight Click &7= Set as suffix", Map.of())),
      Text.literal(TemplateEngine.render("&eMiddle Click &7= Use title default", Map.of())),
      Text.literal(TemplateEngine.render("&8Page " + page + "/" + maxPage, Map.of()))
    )));
    inventory.setStack(INFO_SLOT, info);

    ItemStack next = new ItemStack(Items.SPECTRAL_ARROW);
    next.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Next Page", Map.of())));
    inventory.setStack(NEXT_SLOT, next);

    ItemStack close = new ItemStack(Items.OAK_DOOR);
    close.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render("&7Close", Map.of())));
    inventory.setStack(CLOSE_SLOT, close);
  }

  private ItemStack titleIcon(ServerPlayerEntity player, TitleService titles, TitleService.TitleDefinition title) {
    Item item = itemFromId(title.iconItemId);
    ItemStack stack = new ItemStack(item);
    // Strip inherited tooltip components from modded items so only title-menu lore is shown.
    stack.remove(DataComponentTypes.LORE);
    stack.set(DataComponentTypes.HIDE_ADDITIONAL_TOOLTIP, Unit.INSTANCE);
    stack.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render(safe(title.display), Map.of())));
    TitleService.Selection selected = titles.selected(player.getUuid());
    boolean selectedThis = safe(selected.titleId()).equalsIgnoreCase(safe(title.id));
    List<Text> lore = new ArrayList<>();
    String desc = safe(title.description);
    if (!desc.isBlank()) lore.add(Text.literal(TemplateEngine.render("&7" + desc, Map.of())));
    lore.add(Text.literal(" "));
    lore.add(Text.literal(TemplateEngine.render("&eLeft Click: &7Use as prefix", Map.of())));
    lore.add(Text.literal(TemplateEngine.render("&eRight Click: &7Use as suffix", Map.of())));
    lore.add(Text.literal(TemplateEngine.render("&eMiddle Click: &7Use default (" + safe(title.defaultPosition) + ")", Map.of())));
    if (selectedThis) {
      lore.add(Text.literal(TemplateEngine.render("&aSelected (&f" + selected.position() + "&a)", Map.of())));
      stack.set(DataComponentTypes.ENCHANTMENT_GLINT_OVERRIDE, true);
    }
    stack.set(DataComponentTypes.LORE, new LoreComponent(lore));
    return stack;
  }

  private Item itemFromId(String itemIdRaw) {
    Identifier id = Identifier.tryParse(safe(itemIdRaw));
    if (id != null && Registries.ITEM.containsId(id)) return Registries.ITEM.get(id);
    return Items.NAME_TAG;
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private static final class TitleScreenHandler extends GenericContainerScreenHandler {
    private final PlayerEntity owner;
    private final TitleService titles;
    private final TeamService teams;
    private final TitleMenuService menu;
    private final Map<Integer, String> slotToTitleId;
    private final int page;

    private TitleScreenHandler(int syncId, PlayerInventory playerInventory, Inventory inventory, PlayerEntity owner,
                               TitleService titles, TeamService teams, TitleMenuService menu,
                               Map<Integer, String> slotToTitleId, int page) {
      super(ScreenHandlerType.GENERIC_9X6, syncId, playerInventory, inventory, 6);
      this.owner = owner;
      this.titles = titles;
      this.teams = teams;
      this.menu = menu;
      this.slotToTitleId = slotToTitleId;
      this.page = page;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof ServerPlayerEntity serverPlayer)) return;
      if (slotIndex == CLOSE_SLOT) {
        serverPlayer.closeHandledScreen();
        return;
      }
      if (slotIndex == PREV_SLOT) {
        menu.open(serverPlayer, titles, teams, Math.max(1, page - 1));
        return;
      }
      if (slotIndex == NEXT_SLOT) {
        menu.open(serverPlayer, titles, teams, page + 1);
        return;
      }
      if (slotIndex == CLEAR_SLOT) {
        TitleService.CommandResult result = titles.clear(serverPlayer.getUuid());
        serverPlayer.sendMessage(Text.literal(TemplateEngine.render(result.message(), Map.of())), false);
        menu.open(serverPlayer, titles, teams, page);
        return;
      }

      String titleId = slotToTitleId.get(slotIndex);
      if (titleId == null || titleId.isBlank()) return;
      String position = switch (button) {
        case 1 -> "suffix";
        case 2 -> "default";
        default -> "prefix";
      };
      if ("default".equals(position)) {
        TitleService.TitleDefinition title = null;
        for (TitleService.TitleDefinition each : titles.titles()) {
          if (each != null && safe(each.id).equalsIgnoreCase(safe(titleId))) {
            title = each;
            break;
          }
        }
        position = title == null ? "prefix" : safe(title.defaultPosition);
      }
      String teamId = teams.getTeam(serverPlayer.getUuid()) == null ? "unassigned" : teams.getTeam(serverPlayer.getUuid()).id();
      TitleService.CommandResult result = titles.select(serverPlayer.getUuid(), titleId, position, teamId);
      serverPlayer.sendMessage(Text.literal(TemplateEngine.render(result.message(), Map.of())), false);
      menu.open(serverPlayer, titles, teams, page);
    }

    private String safe(String value) {
      return value == null ? "" : value.trim();
    }
  }
}
