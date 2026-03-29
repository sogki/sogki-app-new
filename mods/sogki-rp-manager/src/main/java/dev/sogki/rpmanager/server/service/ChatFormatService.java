package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ChatFormatService {
  private static final Pattern LEADING_ANGLE_TAG = Pattern.compile("^<([^>]+)>\\s*");

  public MutableText format(MinecraftServer server, ServerPlayerEntity sender, Text message, ServerFeatureConfig config) {
    if (!config.chat.enabled || sender == null) return message.copy();
    String msg = stripExistingSenderPrefix(sender.getGameProfile().getName(), message.getString());
    Map<String, String> values = TemplateEngine.baseMap(server, sender, config.brand);
    String template = (config.chat.format == null || config.chat.format.isBlank()) ? "{message}" : config.chat.format;
    values.put("message", msg);
    String formatted = TemplateEngine.render(template, values).trim();
    return Text.literal(formatted);
  }

  private String stripExistingSenderPrefix(String senderName, String rawMessage) {
    if (rawMessage == null) return "";
    String msg = rawMessage.trim();
    if (senderName == null || senderName.isBlank()) return msg;

    Matcher angle = LEADING_ANGLE_TAG.matcher(msg);
    if (angle.find()) {
      String tagged = angle.group(1);
      if (tagged != null && tagged.trim().equalsIgnoreCase(senderName.trim())) {
        return msg.substring(angle.end()).trim();
      }
    }

    String colonPrefix = senderName + ":";
    if (msg.startsWith(colonPrefix)) {
      return msg.substring(colonPrefix.length()).replaceFirst("^\\s+", "").trim();
    }

    return msg;
  }
}
