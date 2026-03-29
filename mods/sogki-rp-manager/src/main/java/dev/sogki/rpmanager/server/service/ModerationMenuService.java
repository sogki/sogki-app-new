package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.component.type.LoreComponent;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.entity.player.PlayerInventory;
import net.minecraft.inventory.Inventory;
import net.minecraft.inventory.SimpleInventory;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Items;
import net.minecraft.screen.GenericContainerScreenHandler;
import net.minecraft.screen.ScreenHandlerType;
import net.minecraft.screen.SimpleNamedScreenHandlerFactory;
import net.minecraft.screen.slot.SlotActionType;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.Unit;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public final class ModerationMenuService {
  private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
    .withLocale(Locale.ROOT)
    .withZone(ZoneOffset.UTC);

  private static final int WARN_SLOT = 11;
  private static final int MUTE_SLOT = 13;
  private static final int BAN_SLOT = 15;
  private static final int TYPE_CLOSE_SLOT = 22;

  private static final int DURATION_2H_SLOT = 10;
  private static final int DURATION_1D_SLOT = 12;
  private static final int DURATION_4D_SLOT = 14;
  private static final int DURATION_7D_SLOT = 16;
  private static final int DURATION_PERM_SLOT = 22;
  private static final int DURATION_BACK_SLOT = 18;
  private static final int REASON_BACK_SLOT = 22;

  private static final int PREV_SLOT = 45;
  private static final int INFO_SLOT = 49;
  private static final int NEXT_SLOT = 53;
  private static final int PAGE_SIZE = 45;

  public void openPunishMenu(ServerPlayerEntity staff, ModerationService service, ModerationService.ResolvedTarget target) {
    if (staff == null || service == null || target == null) return;
    SimpleInventory inventory = new SimpleInventory(27);
    fill(inventory, Items.GRAY_STAINED_GLASS_PANE);
    inventory.setStack(WARN_SLOT, actionIcon(
      Items.PAPER,
      service.guiActionWarnName(),
      List.of("&7Permanent warning record.", "&eChoose a reason.")
    ));
    inventory.setStack(MUTE_SLOT, actionIcon(
      Items.CLOCK,
      service.guiActionMuteName(),
      List.of("&7Choose reason and duration.", "&eClick to continue.")
    ));
    inventory.setStack(BAN_SLOT, actionIcon(
      Items.BARRIER,
      service.guiActionBanName(),
      List.of("&7Choose reason and duration.", "&eClick to continue.")
    ));
    inventory.setStack(TYPE_CLOSE_SLOT, actionIcon(
      Items.OAK_DOOR,
      service.guiActionCloseName(),
      List.of("&8Exit moderation panel.")
    ));

    String title = service.guiPunishMenuTitle(target.name());
    staff.openHandledScreen(new SimpleNamedScreenHandlerFactory(
      (syncId, playerInventory, owner) -> new PunishTypeScreenHandler(syncId, playerInventory, inventory, owner, this, service, target),
      Text.literal(TemplateEngine.render(title, Map.of()))
    ));
  }

  private void openReasonMenu(ServerPlayerEntity staff,
                              ModerationService service,
                              ModerationService.ResolvedTarget target,
                              ModerationService.PunishmentType type) {
    List<String> reasons = service.reasonsFor(type);
    SimpleInventory inventory = new SimpleInventory(27);
    fill(inventory, Items.GRAY_STAINED_GLASS_PANE);
    int slot = 10;
    for (String reason : reasons) {
      if (slot >= 17) break;
      inventory.setStack(slot++, reasonIcon(type, reason));
    }
    inventory.setStack(REASON_BACK_SLOT, actionIcon(Items.ARROW, service.guiActionBackName(), List.of("&8Return to punishment type.")));
    String title = service.guiReasonMenuTitle(type, target.name());
    staff.openHandledScreen(new SimpleNamedScreenHandlerFactory(
      (syncId, playerInventory, owner) ->
        new ReasonScreenHandler(syncId, playerInventory, inventory, owner, this, service, target, type, reasons),
      Text.literal(TemplateEngine.render(title, Map.of()))
    ));
  }

  private void openDurationMenu(ServerPlayerEntity staff,
                                ModerationService service,
                                ModerationService.ResolvedTarget target,
                                ModerationService.PunishmentType type,
                                String reason) {
    SimpleInventory inventory = new SimpleInventory(27);
    fill(inventory, Items.BLACK_STAINED_GLASS_PANE);
    inventory.setStack(DURATION_2H_SLOT, durationIcon("&f2 Hours", Duration.ofHours(2)));
    inventory.setStack(DURATION_1D_SLOT, durationIcon("&f1 Day", Duration.ofDays(1)));
    inventory.setStack(DURATION_4D_SLOT, durationIcon("&f4 Days", Duration.ofDays(4)));
    inventory.setStack(DURATION_7D_SLOT, durationIcon("&f7 Days", Duration.ofDays(7)));
    inventory.setStack(DURATION_BACK_SLOT, actionIcon(Items.ARROW, service.guiActionBackName(), List.of("&8Return to reason selection.")));
    if (type == ModerationService.PunishmentType.BAN) {
      inventory.setStack(DURATION_PERM_SLOT, actionIcon(
        Items.OBSIDIAN,
        service.guiActionPermanentBanName(),
        List.of("&7No expiry.", "&cUse with care.")
      ));
    } else {
      inventory.setStack(DURATION_PERM_SLOT, actionIcon(
        Items.OAK_DOOR,
        service.guiActionCloseName(),
        List.of("&8Exit moderation panel.")
      ));
    }
    String title = service.guiDurationMenuTitle(type, target.name(), reason);
    staff.openHandledScreen(new SimpleNamedScreenHandlerFactory(
      (syncId, playerInventory, owner) ->
        new DurationScreenHandler(syncId, playerInventory, inventory, owner, this, service, target, type, reason),
      Text.literal(TemplateEngine.render(title, Map.of()))
    ));
  }

  public void openHistory(ServerPlayerEntity viewer,
                          ModerationService service,
                          ModerationService.ResolvedTarget target,
                          int requestedPage) {
    if (viewer == null || service == null || target == null) return;
    List<ModerationService.PunishmentEntry> history = service.history(target.uuid());
    int maxPage = Math.max(1, (int) Math.ceil(history.size() / (double) PAGE_SIZE));
    int page = Math.max(1, Math.min(maxPage, requestedPage));
    int start = (page - 1) * PAGE_SIZE;
    int end = Math.min(history.size(), start + PAGE_SIZE);

    SimpleInventory inventory = new SimpleInventory(54);
    fill(inventory, Items.BLACK_STAINED_GLASS_PANE);
    int slot = 0;
    for (int i = start; i < end; i++) {
      inventory.setStack(slot++, historyIcon(history.get(i)));
    }

    inventory.setStack(PREV_SLOT, actionIcon(Items.ARROW, "&7Previous Page", List.of("&8Page " + page + "/" + maxPage)));
    inventory.setStack(INFO_SLOT, actionIcon(
      Items.BOOK,
      "&bModeration History",
      List.of("&7Target: &f" + safe(target.name()), "&7Entries: &f" + history.size(), "&8Page " + page + "/" + maxPage)
    ));
    inventory.setStack(NEXT_SLOT, actionIcon(Items.SPECTRAL_ARROW, "&7Next Page", List.of("&8Page " + page + "/" + maxPage)));

    String title = service.guiHistoryMenuTitle(target.name());
    viewer.openHandledScreen(new SimpleNamedScreenHandlerFactory(
      (syncId, playerInventory, owner) ->
        new HistoryScreenHandler(syncId, playerInventory, inventory, owner, this, service, target, page),
      Text.literal(TemplateEngine.render(title, Map.of()))
    ));
  }

  private ItemStack historyIcon(ModerationService.PunishmentEntry entry) {
    ModerationService.PunishmentType type = parseType(entry.type);
    ItemStack stack = switch (type) {
      case WARNING -> new ItemStack(Items.PAPER);
      case MUTE -> new ItemStack(Items.CLOCK);
      case BAN -> new ItemStack(Items.BARRIER);
    };
    sanitize(stack);
    String created = TS_FMT.format(Instant.ofEpochMilli(Math.max(0L, entry.createdAtEpochMs)));
    String status;
    if (!entry.active) {
      status = "&8Expired";
    } else if (entry.expiresAtEpochMs == null) {
      status = "&aActive (Permanent)";
    } else if (entry.expiresAtEpochMs <= Instant.now().toEpochMilli()) {
      status = "&8Expired";
    } else {
      status = "&aActive";
    }
    String until = entry.expiresAtEpochMs == null
      ? "Permanent"
      : TS_FMT.format(Instant.ofEpochMilli(entry.expiresAtEpochMs));
    stack.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render(titleFor(entry), Map.of())));
    stack.set(DataComponentTypes.LORE, new LoreComponent(List.of(
      Text.literal(TemplateEngine.render("&7Staff: &f" + safe(entry.staffName), Map.of())),
      Text.literal(TemplateEngine.render("&7Issued: &f" + created, Map.of())),
      Text.literal(TemplateEngine.render("&7Until: &f" + until, Map.of())),
      Text.literal(TemplateEngine.render("&7Status: " + status, Map.of())),
      Text.literal(TemplateEngine.render("&7Reason: &f" + safe(entry.reason), Map.of()))
    )));
    return stack;
  }

  private String titleFor(ModerationService.PunishmentEntry entry) {
    ModerationService.PunishmentType type = parseType(entry.type);
    return switch (type) {
      case WARNING -> "&eWarning";
      case MUTE -> "&6Mute";
      case BAN -> "&cBan";
    };
  }

  private ModerationService.PunishmentType parseType(String raw) {
    String key = safe(raw).toUpperCase(Locale.ROOT);
    try {
      return ModerationService.PunishmentType.valueOf(key);
    } catch (Exception ignored) {
      return ModerationService.PunishmentType.WARNING;
    }
  }

  private void applyWarning(ServerPlayerEntity staff, ModerationService service, ModerationService.ResolvedTarget target) {
    applyWarning(staff, service, target, "General Misconduct");
  }

  private void applyWarning(ServerPlayerEntity staff,
                            ModerationService service,
                            ModerationService.ResolvedTarget target,
                            String reason) {
    ModerationService.ActionResult result = service.warnWithNotifications(target, staff, reason);
    if (!result.ok()) {
      staff.sendMessage(Text.literal(service.guiFailureMessage(result.message())), false);
      return;
    }
    staff.sendMessage(Text.literal(result.message()), false);
    staff.closeHandledScreen();
  }

  private void applyMute(ServerPlayerEntity staff,
                         ModerationService service,
                         ModerationService.ResolvedTarget target,
                         Duration duration,
                         String reason) {
    ModerationService.ActionResult result = service.muteWithNotifications(target, staff, duration, reason);
    if (!result.ok()) {
      staff.sendMessage(Text.literal(service.guiFailureMessage(result.message())), false);
      return;
    }
    staff.sendMessage(Text.literal(result.message()), false);
    staff.closeHandledScreen();
  }

  private void applyBan(ServerPlayerEntity staff,
                        ModerationService service,
                        ModerationService.ResolvedTarget target,
                        Duration duration,
                        String reason) {
    ModerationService.ActionResult result = service.banWithNotifications(target, staff, duration, reason);
    if (!result.ok()) {
      staff.sendMessage(Text.literal(service.guiFailureMessage(result.message())), false);
      return;
    }
    staff.sendMessage(Text.literal(result.message()), false);
    staff.closeHandledScreen();
  }

  private String humanDuration(Duration duration) {
    if (duration == null) return "Permanent";
    long minutes = Math.max(1L, duration.toMinutes());
    long days = minutes / (60L * 24L);
    long hours = (minutes % (60L * 24L)) / 60L;
    if (days > 0) return days + "d " + hours + "h";
    return Math.max(1L, duration.toHours()) + "h";
  }

  private ItemStack reasonIcon(ModerationService.PunishmentType type, String reason) {
    net.minecraft.item.Item item = switch (type) {
      case WARNING -> Items.PAPER;
      case MUTE -> Items.CLOCK;
      case BAN -> Items.BARRIER;
    };
    return actionIcon(item, "&f" + safe(reason), List.of("&eClick to select this reason."));
  }

  private ItemStack durationIcon(String name, Duration duration) {
    return actionIcon(Items.CLOCK, name, List.of("&7Duration: &f" + humanDuration(duration), "&eClick to apply."));
  }

  private ItemStack actionIcon(net.minecraft.item.Item item, String name, List<String> lore) {
    ItemStack stack = new ItemStack(item);
    sanitize(stack);
    stack.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render(name, Map.of())));
    List<Text> lines = new ArrayList<>();
    for (String each : lore) {
      lines.add(Text.literal(TemplateEngine.render(each, Map.of())));
    }
    if (!lines.isEmpty()) {
      stack.set(DataComponentTypes.LORE, new LoreComponent(lines));
    }
    return stack;
  }

  private void fill(SimpleInventory inventory, net.minecraft.item.Item fillItem) {
    ItemStack filler = new ItemStack(fillItem);
    filler.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
    for (int i = 0; i < inventory.size(); i++) {
      inventory.setStack(i, filler.copy());
    }
  }

  private void sanitize(ItemStack stack) {
    if (stack == null) return;
    stack.remove(DataComponentTypes.LORE);
    stack.set(DataComponentTypes.HIDE_ADDITIONAL_TOOLTIP, Unit.INSTANCE);
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private static final class PunishTypeScreenHandler extends GenericContainerScreenHandler {
    private final ModerationMenuService menu;
    private final ModerationService service;
    private final ModerationService.ResolvedTarget target;

    private PunishTypeScreenHandler(int syncId,
                                    PlayerInventory playerInventory,
                                    Inventory inventory,
                                    PlayerEntity owner,
                                    ModerationMenuService menu,
                                    ModerationService service,
                                    ModerationService.ResolvedTarget target) {
      super(ScreenHandlerType.GENERIC_9X3, syncId, playerInventory, inventory, 3);
      this.menu = menu;
      this.service = service;
      this.target = target;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof ServerPlayerEntity staff)) return;
      if (slotIndex == TYPE_CLOSE_SLOT) {
        staff.closeHandledScreen();
        return;
      }
      if (slotIndex == WARN_SLOT) {
        menu.openReasonMenu(staff, service, target, ModerationService.PunishmentType.WARNING);
        return;
      }
      if (slotIndex == MUTE_SLOT) {
        menu.openReasonMenu(staff, service, target, ModerationService.PunishmentType.MUTE);
        return;
      }
      if (slotIndex == BAN_SLOT) {
        menu.openReasonMenu(staff, service, target, ModerationService.PunishmentType.BAN);
      }
    }
  }

  private static final class ReasonScreenHandler extends GenericContainerScreenHandler {
    private final ModerationMenuService menu;
    private final ModerationService service;
    private final ModerationService.ResolvedTarget target;
    private final ModerationService.PunishmentType type;
    private final List<String> reasons;

    private ReasonScreenHandler(int syncId,
                                PlayerInventory playerInventory,
                                Inventory inventory,
                                PlayerEntity owner,
                                ModerationMenuService menu,
                                ModerationService service,
                                ModerationService.ResolvedTarget target,
                                ModerationService.PunishmentType type,
                                List<String> reasons) {
      super(ScreenHandlerType.GENERIC_9X3, syncId, playerInventory, inventory, 3);
      this.menu = menu;
      this.service = service;
      this.target = target;
      this.type = type;
      this.reasons = reasons == null ? List.of() : reasons;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof ServerPlayerEntity staff)) return;
      if (slotIndex == REASON_BACK_SLOT) {
        menu.openPunishMenu(staff, service, target);
        return;
      }
      int idx = slotIndex - 10;
      if (idx < 0 || idx >= reasons.size() || idx > 6) return;
      String reason = reasons.get(idx);
      if (type == ModerationService.PunishmentType.WARNING) {
        menu.applyWarning(staff, service, target, reason);
        return;
      }
      menu.openDurationMenu(staff, service, target, type, reason);
    }
  }

  private static final class DurationScreenHandler extends GenericContainerScreenHandler {
    private final ModerationMenuService menu;
    private final ModerationService service;
    private final ModerationService.ResolvedTarget target;
    private final ModerationService.PunishmentType type;
    private final String reason;

    private DurationScreenHandler(int syncId,
                                  PlayerInventory playerInventory,
                                  Inventory inventory,
                                  PlayerEntity owner,
                                  ModerationMenuService menu,
                                  ModerationService service,
                                  ModerationService.ResolvedTarget target,
                                  ModerationService.PunishmentType type,
                                  String reason) {
      super(ScreenHandlerType.GENERIC_9X3, syncId, playerInventory, inventory, 3);
      this.menu = menu;
      this.service = service;
      this.target = target;
      this.type = type;
      this.reason = reason == null ? "General Misconduct" : reason;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof ServerPlayerEntity staff)) return;
      if (slotIndex == DURATION_BACK_SLOT) {
        menu.openReasonMenu(staff, service, target, type);
        return;
      }
      if (slotIndex == DURATION_PERM_SLOT && type == ModerationService.PunishmentType.BAN) {
        menu.applyBan(staff, service, target, null, reason);
        return;
      }
      if (slotIndex == DURATION_PERM_SLOT) {
        staff.closeHandledScreen();
        return;
      }
      Duration duration = switch (slotIndex) {
        case DURATION_2H_SLOT -> Duration.ofHours(2);
        case DURATION_1D_SLOT -> Duration.ofDays(1);
        case DURATION_4D_SLOT -> Duration.ofDays(4);
        case DURATION_7D_SLOT -> Duration.ofDays(7);
        default -> null;
      };
      if (duration == null) return;
      if (type == ModerationService.PunishmentType.MUTE) {
        menu.applyMute(staff, service, target, duration, reason);
        return;
      }
      if (type == ModerationService.PunishmentType.BAN) {
        menu.applyBan(staff, service, target, duration, reason);
      }
    }
  }

  private static final class HistoryScreenHandler extends GenericContainerScreenHandler {
    private final ModerationMenuService menu;
    private final ModerationService service;
    private final ModerationService.ResolvedTarget target;
    private final int page;

    private HistoryScreenHandler(int syncId,
                                 PlayerInventory playerInventory,
                                 Inventory inventory,
                                 PlayerEntity owner,
                                 ModerationMenuService menu,
                                 ModerationService service,
                                 ModerationService.ResolvedTarget target,
                                 int page) {
      super(ScreenHandlerType.GENERIC_9X6, syncId, playerInventory, inventory, 6);
      this.menu = menu;
      this.service = service;
      this.target = target;
      this.page = Math.max(1, page);
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof ServerPlayerEntity viewer)) return;
      if (slotIndex == PREV_SLOT) {
        menu.openHistory(viewer, service, target, Math.max(1, page - 1));
        return;
      }
      if (slotIndex == NEXT_SLOT) {
        menu.openHistory(viewer, service, target, page + 1);
        return;
      }
      if (slotIndex == INFO_SLOT) {
        viewer.closeHandledScreen();
      }
    }
  }
}
