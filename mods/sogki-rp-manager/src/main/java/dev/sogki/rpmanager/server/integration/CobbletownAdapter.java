package dev.sogki.rpmanager.server.integration;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.network.ServerPlayerEntity;
import org.slf4j.Logger;

import java.util.Optional;

public final class CobbletownAdapter {
  private static final String MOD_ID = "cobbletown";
  private final Logger logger;
  private boolean logged;

  public CobbletownAdapter(Logger logger) {
    this.logger = logger;
  }

  public Optional<String> resolveTownName(ServerPlayerEntity player) {
    if (!FabricLoader.getInstance().isModLoaded(MOD_ID)) {
      return Optional.empty();
    }
    if (!logged) {
      logged = true;
      logger.info("[SogkiCobblemon] Cobbletown detected. Using adapter fallback for town naming (config regions/towns remain primary).");
    }
    // Integration point for Cobbletown APIs if exposed by the target server stack.
    // Left intentionally non-fatal: mod keeps running even when API signatures change.
    return Optional.empty();
  }
}
