package dev.sogki.rpmanager.server.util;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;

public final class MessageDisplay {
  private MessageDisplay() {
  }

  public static void send(ServerPlayerEntity player, String message, ServerFeatureConfig.DisplayRoute route) {
    if (player == null || message == null || message.isBlank() || route == null) return;
    Text text = Text.literal(message);
    if (route.showActionBar) {
      player.sendMessage(text, true);
    }
    if (route.showChat) {
      player.sendMessage(text, false);
    }
    if (route.showTitle) {
      sendTitle(player, text, route);
    }
  }

  private static void sendTitle(ServerPlayerEntity player, Text title, ServerFeatureConfig.DisplayRoute route) {
    try {
      Class<?> fadeClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleFadeS2CPacket");
      Object fadePacket = fadeClass.getDeclaredConstructor(int.class, int.class, int.class)
        .newInstance(
          Math.max(0, route.titleFadeInTicks),
          Math.max(1, route.titleStayTicks),
          Math.max(0, route.titleFadeOutTicks)
        );
      player.networkHandler.sendPacket((net.minecraft.network.packet.Packet<?>) fadePacket);
    } catch (Throwable ignored) {
    }
    try {
      Class<?> titleClass = Class.forName("net.minecraft.network.packet.s2c.play.TitleS2CPacket");
      Object titlePacket = titleClass.getDeclaredConstructor(Text.class).newInstance(title);
      player.networkHandler.sendPacket((net.minecraft.network.packet.Packet<?>) titlePacket);
    } catch (Throwable ignored) {
    }
  }
}
