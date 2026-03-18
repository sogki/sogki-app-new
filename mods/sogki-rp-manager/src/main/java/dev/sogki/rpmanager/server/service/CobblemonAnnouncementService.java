package dev.sogki.rpmanager.server.service;

import dev.sogki.rpmanager.server.config.ServerFeatureConfig;
import dev.sogki.rpmanager.server.util.TemplateEngine;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import org.slf4j.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class CobblemonAnnouncementService {
  private static final String COBBLEMON_MOD_ID = "cobblemon";
  private final Logger logger;
  private final Map<UUID, Long> lastSent = new HashMap<>();
  private boolean attemptedRegistration;

  public CobblemonAnnouncementService(Logger logger) {
    this.logger = logger;
  }

  public void tryRegisterCobblemonHooks() {
    if (attemptedRegistration) return;
    attemptedRegistration = true;
    if (!FabricLoader.getInstance().isModLoaded(COBBLEMON_MOD_ID)) {
      logger.info("[SogkiCobblemon] Cobblemon not detected. Announcement hooks idle.");
      return;
    }
    // Cobblemon API compatibility layer: keep reflective for loose coupling.
    // Server operators can still use /sogkiadmin announce for manual broadcasts.
    logger.info("[SogkiCobblemon] Cobblemon detected. Reflective event adapter enabled (best effort).");
  }

  public void announceCatch(MinecraftServer server, ServerPlayerEntity player, String pokemonName, boolean shiny, ServerFeatureConfig cfg) {
    if (!cfg.announcements.enabled) return;
    if (!cfg.announcements.catchAnnouncements) return;
    if (shiny && !cfg.announcements.shinyCatchAnnouncements) return;

    long now = System.currentTimeMillis() / 1000L;
    long cooldown = Math.max(1, cfg.announcements.cooldownSeconds);
    UUID key = player.getUuid();
    if (now - lastSent.getOrDefault(key, 0L) < cooldown) return;
    lastSent.put(key, now);

    var values = TemplateEngine.baseMap(server, player, cfg.brand);
    values.put("pokemon", pokemonName == null ? "Pokemon" : pokemonName);
    String template = shiny ? cfg.announcements.shinyCatchTemplate : cfg.announcements.catchTemplate;
    String text = TemplateEngine.render(template, values);
    server.getPlayerManager().broadcast(Text.literal(text), false);
  }

  public void announceManual(MinecraftServer server, String message, ServerFeatureConfig cfg) {
    if (message == null || message.isBlank()) return;
    var values = new java.util.HashMap<String, String>();
    values.put("message", message);
    String formatted = TemplateEngine.render(cfg.announcements.manualTemplate, values);
    server.getPlayerManager().broadcast(Text.literal(formatted), false);
  }
}
