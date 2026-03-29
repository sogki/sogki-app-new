package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
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
import java.util.List;
import java.util.Map;

public final class TeamSelectionMenuService {
  public void open(PlayerEntity player, ServerFeatureConfig cfg, TeamService teams) {
    if (player == null || cfg == null || teams == null) return;
    SimpleInventory inventory = new SimpleInventory(9);
    TeamId currentTeam = teams.getTeam(player.getUuid());
    ItemStack filler = fillerPane();
    for (int i = 0; i < inventory.size(); i++) {
      inventory.setStack(i, filler.copy());
    }
    inventory.setStack(2, icon(TeamId.VALOR, cfg, teams, Items.BLAZE_POWDER, currentTeam));
    inventory.setStack(4, icon(TeamId.MYSTIC, cfg, teams, Items.LAPIS_LAZULI, currentTeam));
    inventory.setStack(6, icon(TeamId.INSTINCT, cfg, teams, Items.GOLD_INGOT, currentTeam));
    Text title = Text.literal(TemplateEngine.render(cfg.messages.teamMenuTitle, Map.of()));
    player.openHandledScreen(new SimpleNamedScreenHandlerFactory((syncId, playerInventory, owner) ->
      new TeamSelectionScreenHandler(syncId, playerInventory, inventory, owner, cfg, teams), title));
  }

  private ItemStack fillerPane() {
    ItemStack filler = new ItemStack(Items.GRAY_STAINED_GLASS_PANE);
    filler.set(DataComponentTypes.CUSTOM_NAME, Text.literal(" "));
    return filler;
  }

  private ItemStack icon(TeamId team, ServerFeatureConfig cfg, TeamService teams, Item item, TeamId currentTeam) {
    ItemStack stack = new ItemStack(item);
    sanitizeDisplayStack(stack);
    String display = teams.teamDisplay(cfg, team);
    stack.set(DataComponentTypes.CUSTOM_NAME, Text.literal(TemplateEngine.render(display, Map.of())));
    stack.set(DataComponentTypes.LORE, new LoreComponent(buildLore(team, cfg, currentTeam)));
    if (team == currentTeam) {
      stack.set(DataComponentTypes.ENCHANTMENT_GLINT_OVERRIDE, true);
    }
    return stack;
  }

  private void sanitizeDisplayStack(ItemStack stack) {
    if (stack == null) return;
    stack.remove(DataComponentTypes.LORE);
    stack.set(DataComponentTypes.HIDE_ADDITIONAL_TOOLTIP, Unit.INSTANCE);
  }

  private List<Text> buildLore(TeamId team, ServerFeatureConfig cfg, TeamId currentTeam) {
    List<Text> lines = new ArrayList<>();
    if (team == currentTeam) {
      lines.add(Text.literal(TemplateEngine.render("&aCurrent Team", Map.of())));
    } else {
      lines.add(Text.literal(TemplateEngine.render("&7Click to join this team.", Map.of())));
    }
    lines.add(Text.literal(" "));
    lines.add(Text.literal(TemplateEngine.render("&bPassive Buffs", Map.of())));
    List<String> buffLines = buffLines(team, cfg);
    if (buffLines.isEmpty()) {
      lines.add(Text.literal(TemplateEngine.render("&8- None configured", Map.of())));
    } else {
      for (String line : buffLines) {
        lines.add(Text.literal(TemplateEngine.render("&7- " + line, Map.of())));
      }
    }
    lines.add(Text.literal(" "));
    lines.add(Text.literal(TemplateEngine.render("&aDaily Rewards", Map.of())));
    List<String> daily = rewardLines(team, cfg, true);
    if (daily.isEmpty()) {
      lines.add(Text.literal(TemplateEngine.render("&8- None configured", Map.of())));
    } else {
      for (String line : daily) {
        lines.add(Text.literal(TemplateEngine.render("&7- " + line, Map.of())));
      }
    }
    lines.add(Text.literal(" "));
    lines.add(Text.literal(TemplateEngine.render("&dMilestone Rewards", Map.of())));
    List<String> milestones = rewardLines(team, cfg, false);
    if (milestones.isEmpty()) {
      lines.add(Text.literal(TemplateEngine.render("&8- None configured", Map.of())));
    } else {
      for (String line : milestones) {
        lines.add(Text.literal(TemplateEngine.render("&7- " + line, Map.of())));
      }
    }
    return lines;
  }

  private List<String> buffLines(TeamId team, ServerFeatureConfig cfg) {
    List<String> out = new ArrayList<>();
    if (cfg.teams == null || cfg.teams.buffs == null) return out;
    for (ServerFeatureConfig.TeamBuffDefinition buff : cfg.teams.buffs) {
      if (buff == null || !team.id().equalsIgnoreCase(safe(buff.teamId))) continue;
      Identifier id = Identifier.tryParse(safe(buff.effectId));
      if (id == null || !Registries.STATUS_EFFECT.containsId(id)) {
        out.add(safe(buff.effectId) + " " + ampLabel(buff.amplifier));
        continue;
      }
      String name = Registries.STATUS_EFFECT.get(id).getName().getString();
      out.add(name + " " + ampLabel(buff.amplifier) + " &8(" + Math.max(1, buff.durationSeconds) + "s refresh)");
    }
    return out;
  }

  private List<String> rewardLines(TeamId team, ServerFeatureConfig cfg, boolean daily) {
    List<String> out = new ArrayList<>();
    if (cfg.teams == null) return out;
    if (daily && cfg.teams.dailyRewards != null) {
      for (ServerFeatureConfig.TeamRewardDefinition reward : cfg.teams.dailyRewards) {
        if (reward == null || !team.id().equalsIgnoreCase(safe(reward.teamId))) continue;
        appendItems(out, reward.items, null);
      }
      return out;
    }
    if (!daily && cfg.teams.longTermRewards != null) {
      for (ServerFeatureConfig.TeamMilestoneReward reward : cfg.teams.longTermRewards) {
        if (reward == null || !team.id().equalsIgnoreCase(safe(reward.teamId))) continue;
        String summary = summarizeItems(reward.items);
        if (!summary.isBlank()) {
          out.add("&8[" + Math.max(1, reward.daysInTeam) + "d] &7" + summary);
        }
      }
    }
    return out;
  }

  private void appendItems(List<String> out, List<ServerFeatureConfig.RewardItem> items, String prefix) {
    if (items == null) return;
    for (ServerFeatureConfig.RewardItem item : items) {
      if (item == null) continue;
      String label = itemLabel(item);
      String base = label + " x" + Math.max(1, item.count);
      if (prefix != null) base = "&8[" + prefix + "] &7" + base;
      out.add(base);
    }
  }

  private String summarizeItems(List<ServerFeatureConfig.RewardItem> items) {
    if (items == null || items.isEmpty()) return "";
    StringBuilder builder = new StringBuilder();
    for (ServerFeatureConfig.RewardItem item : items) {
      if (item == null) continue;
      if (!builder.isEmpty()) builder.append(", ");
      builder.append(itemLabel(item)).append(" x").append(Math.max(1, item.count));
    }
    return builder.toString();
  }

  private String itemLabel(ServerFeatureConfig.RewardItem item) {
    String explicit = safe(item.label);
    if (!explicit.isBlank()) return explicit;
    Identifier id = Identifier.tryParse(safe(item.itemId));
    if (id == null || !Registries.ITEM.containsId(id)) return safe(item.itemId);
    return Registries.ITEM.get(id).getName().getString();
  }

  private String ampLabel(int amplifier) {
    int level = Math.max(0, amplifier) + 1;
    return switch (level) {
      case 1 -> "I";
      case 2 -> "II";
      case 3 -> "III";
      case 4 -> "IV";
      case 5 -> "V";
      default -> String.valueOf(level);
    };
  }

  private String safe(String value) {
    return value == null ? "" : value.trim();
  }

  private static final class TeamSelectionScreenHandler extends GenericContainerScreenHandler {
    private final PlayerEntity owner;
    private final ServerFeatureConfig cfg;
    private final TeamService teams;

    private TeamSelectionScreenHandler(int syncId, PlayerInventory playerInventory, Inventory inventory, PlayerEntity owner,
                                       ServerFeatureConfig cfg, TeamService teams) {
      super(ScreenHandlerType.GENERIC_9X1, syncId, playerInventory, inventory, 1);
      this.owner = owner;
      this.cfg = cfg;
      this.teams = teams;
    }

    @Override
    public ItemStack quickMove(PlayerEntity player, int slot) {
      return ItemStack.EMPTY;
    }

    @Override
    public void onSlotClick(int slotIndex, int button, SlotActionType actionType, PlayerEntity player) {
      if (!(player instanceof net.minecraft.server.network.ServerPlayerEntity serverPlayer)) return;
      TeamId picked = switch (slotIndex) {
        case 2 -> TeamId.VALOR;
        case 4 -> TeamId.MYSTIC;
        case 6 -> TeamId.INSTINCT;
        default -> null;
      };
      if (picked == null) return;
      TeamService.CommandResult result = teams.chooseTeam(serverPlayer, cfg, picked);
      serverPlayer.sendMessage(Text.literal(result.message()));
      serverPlayer.closeHandledScreen();
    }
  }
}
