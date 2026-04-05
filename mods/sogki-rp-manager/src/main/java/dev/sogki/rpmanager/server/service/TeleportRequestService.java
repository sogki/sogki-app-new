package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.MutableText;
import net.minecraft.text.Style;
import net.minecraft.text.Text;

/**
 * Player teleport requests: either requester goes to target (TPA) or target comes to requester (TPAHERE).
 */
public final class TeleportRequestService {
  public static final int REQUEST_SECONDS = 30;
  public static final int REQUEST_TTL_TICKS = REQUEST_SECONDS * 20;

  public enum TeleportAskKind {
    REQUESTER_TO_TARGET,
    TARGET_TO_REQUESTER
  }

  private static final class Pending {
    final UUID requester;
    final long expireTick;
    final TeleportAskKind kind;

    Pending(UUID requester, long expireTick, TeleportAskKind kind) {
      this.requester = requester;
      this.expireTick = expireTick;
      this.kind = kind;
    }
  }

  private final Map<UUID, Pending> incoming = new HashMap<>();

  public void tick(long serverTick) {
    Iterator<Map.Entry<UUID, Pending>> it = incoming.entrySet().iterator();
    while (it.hasNext()) {
      Map.Entry<UUID, Pending> e = it.next();
      if (serverTick >= e.getValue().expireTick) {
        it.remove();
      }
    }
  }

  /** @return false if the request was not sent (e.g. targeting self). */
  public boolean sendRequest(ServerPlayerEntity requester, ServerPlayerEntity target, long serverTick,
                             ServerFeatureConfig cfg, TeleportAskKind kind) {
    ServerFeatureConfig.MessagesConfig msg = cfg.messages;
    String brand = cfg.brand == null ? "" : cfg.brand;
    MinecraftServer server = requester.getServer();

    if (requester.getUuid().equals(target.getUuid())) {
      Map<String, String> v = TemplateEngine.baseMap(server, requester, brand);
      requester.sendMessage(Text.literal(TemplateEngine.render(msg.tpaCannotSelf, v)));
      return false;
    }
    incoming.put(target.getUuid(), new Pending(requester.getUuid(), serverTick + REQUEST_TTL_TICKS, kind));

    Map<String, String> forTarget = TemplateEngine.baseMap(server, target, brand);
    forTarget.put("requester", safeName(requester));
    forTarget.put("target", safeName(target));
    forTarget.put("seconds", String.valueOf(REQUEST_SECONDS));

    String lead = kind == TeleportAskKind.TARGET_TO_REQUESTER
      ? msg.tpaHereIncomingLead
      : msg.tpaIncomingLead;

    MutableText accept = Text.literal(TemplateEngine.render(msg.tpaAcceptButton, Map.of()))
      .setStyle(Style.EMPTY
        .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/tpaccept"))
        .withHoverEvent(new HoverEvent(
          HoverEvent.Action.SHOW_TEXT,
          Text.literal(TemplateEngine.render(msg.tpaAcceptHover, Map.of())))));
    MutableText deny = Text.literal(TemplateEngine.render(msg.tpaDenyButton, Map.of()))
      .setStyle(Style.EMPTY
        .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/tpdeny"))
        .withHoverEvent(new HoverEvent(
          HoverEvent.Action.SHOW_TEXT,
          Text.literal(TemplateEngine.render(msg.tpaDenyHover, Map.of())))));

    target.sendMessage(
      Text.literal("")
        .append(Text.literal(TemplateEngine.render(lead, forTarget)))
        .append(accept)
        .append(Text.literal(" "))
        .append(deny)
        .append(Text.literal(TemplateEngine.render(msg.tpaIncomingTail, forTarget))));

    Map<String, String> forRequester = TemplateEngine.baseMap(server, requester, brand);
    forRequester.put("requester", safeName(requester));
    forRequester.put("target", safeName(target));
    forRequester.put("seconds", String.valueOf(REQUEST_SECONDS));
    String sent = kind == TeleportAskKind.TARGET_TO_REQUESTER
      ? msg.tpaHereRequestSent
      : msg.tpaRequestSent;
    requester.sendMessage(Text.literal(TemplateEngine.render(sent, forRequester)));
    return true;
  }

  public void accept(ServerPlayerEntity target, MinecraftServer server, ServerFeatureConfig cfg) {
    ServerFeatureConfig.MessagesConfig msg = cfg.messages;
    String brand = cfg.brand == null ? "" : cfg.brand;
    Pending p = incoming.remove(target.getUuid());
    if (p == null) {
      Map<String, String> v = TemplateEngine.baseMap(server, target, brand);
      target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaNoPending, v)));
      return;
    }
    ServerPlayerEntity requester = server.getPlayerManager().getPlayer(p.requester);
    if (requester == null) {
      Map<String, String> v = TemplateEngine.baseMap(server, target, brand);
      target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaRequesterOffline, v)));
      return;
    }
    if (requester.getUuid().equals(target.getUuid())) {
      return;
    }

    if (p.kind == TeleportAskKind.REQUESTER_TO_TARGET) {
      requester.teleport(
        target.getServerWorld(),
        target.getX(),
        target.getY(),
        target.getZ(),
        target.getYaw(),
        target.getPitch());
      Map<String, String> forTarget = TemplateEngine.baseMap(server, target, brand);
      forTarget.put("requester", safeName(requester));
      forTarget.put("target", safeName(target));
      putDestCoords(forTarget, target);
      target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaAcceptedTarget, forTarget)));

      Map<String, String> forRequester = TemplateEngine.baseMap(server, requester, brand);
      forRequester.put("requester", safeName(requester));
      forRequester.put("target", safeName(target));
      putDestCoords(forRequester, target);
      forRequester.put("world", target.getWorld().getRegistryKey().getValue().toString());
      requester.sendMessage(Text.literal(TemplateEngine.render(msg.tpaAcceptedRequester, forRequester)));
    } else {
      target.teleport(
        requester.getServerWorld(),
        requester.getX(),
        requester.getY(),
        requester.getZ(),
        requester.getYaw(),
        requester.getPitch());
      Map<String, String> forTarget = TemplateEngine.baseMap(server, target, brand);
      forTarget.put("requester", safeName(requester));
      forTarget.put("target", safeName(target));
      putDestCoords(forTarget, requester);
      target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaHereAcceptedTarget, forTarget)));

      Map<String, String> forRequester = TemplateEngine.baseMap(server, requester, brand);
      forRequester.put("requester", safeName(requester));
      forRequester.put("target", safeName(target));
      requester.sendMessage(Text.literal(TemplateEngine.render(msg.tpaHereAcceptedRequester, forRequester)));
    }
  }

  public void deny(ServerPlayerEntity target, ServerFeatureConfig cfg) {
    ServerFeatureConfig.MessagesConfig msg = cfg.messages;
    String brand = cfg.brand == null ? "" : cfg.brand;
    MinecraftServer server = target.getServer();
    Pending p = incoming.remove(target.getUuid());
    if (p == null) {
      Map<String, String> v = TemplateEngine.baseMap(server, target, brand);
      target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaNoPending, v)));
      return;
    }
    Map<String, String> forTarget = TemplateEngine.baseMap(server, target, brand);
    forTarget.put("target", safeName(target));
    target.sendMessage(Text.literal(TemplateEngine.render(msg.tpaDeniedTarget, forTarget)));

    ServerPlayerEntity requester = server.getPlayerManager().getPlayer(p.requester);
    if (requester != null) {
      Map<String, String> forRequester = TemplateEngine.baseMap(server, requester, brand);
      forRequester.put("target", safeName(target));
      forRequester.put("requester", safeName(requester));
      requester.sendMessage(Text.literal(TemplateEngine.render(msg.tpaDeniedRequester, forRequester)));
    }
  }

  private static void putDestCoords(Map<String, String> values, ServerPlayerEntity dest) {
    String bx = TemplateEngine.formatBlockCoord(dest.getX());
    String by = TemplateEngine.formatBlockCoord(dest.getY());
    String bz = TemplateEngine.formatBlockCoord(dest.getZ());
    values.put("bx", bx);
    values.put("by", by);
    values.put("bz", bz);
    values.put("x", bx);
    values.put("y", by);
    values.put("z", bz);
    values.put("world", dest.getWorld().getRegistryKey().getValue().toString());
  }

  private static String safeName(ServerPlayerEntity player) {
    if (player == null || player.getGameProfile() == null || player.getGameProfile().getName() == null) {
      return "";
    }
    return player.getGameProfile().getName();
  }
}
