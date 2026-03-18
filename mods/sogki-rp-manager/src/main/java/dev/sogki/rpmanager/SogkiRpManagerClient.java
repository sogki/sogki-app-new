package dev.sogki.rpmanager;

import dev.sogki.rpmanager.config.RpManagerConfig;
import dev.sogki.rpmanager.model.PackEntry;
import dev.sogki.rpmanager.service.PackDiscoveryService;
import dev.sogki.rpmanager.ui.JoinPromptScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.lwjgl.glfw.GLFW;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class SogkiRpManagerClient implements ClientModInitializer {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiRpManager");
  private static RpManagerConfig config;
  private static KeyBinding openManagerKey;
  private static boolean promptShownForConnection = false;

  @Override
  public void onInitializeClient() {
    config = RpManagerConfig.load();
    logStartupHeader();
    openManagerKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
      "key.sogkirpmanager.open_manager",
      InputUtil.Type.KEYSYM,
      GLFW.GLFW_KEY_P,
      "category.sogkirpmanager"
    ));
    // Avoid resolving localized key text here; GLFW may not be initialized yet.
    LOGGER.info("[SogkiRP] Keybind registered: Open Resource Pack Manager (default key: P)");

    // Fetch and print active packs once when client starts.
    logFetchedPacksOnStartup();

    ClientPlayConnectionEvents.JOIN.register((handler, sender, client) -> {
      if (!config.promptOnJoin || promptShownForConnection) return;
      promptShownForConnection = true;
      client.execute(() -> client.setScreen(new JoinPromptScreen(client.currentScreen, config)));
    });

    ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> promptShownForConnection = false);

    ClientTickEvents.END_CLIENT_TICK.register(client -> {
      while (openManagerKey.wasPressed()) {
        client.setScreen(new JoinPromptScreen(client.currentScreen, config));
      }
    });
  }

  public static Text titleText() {
    return Text.literal("Sogki Resource Pack Manager");
  }

  public static String openKeyLabel() {
    if (openManagerKey == null) return "P";
    try {
      return openManagerKey.getBoundKeyLocalizedText().getString();
    } catch (Throwable ignored) {
      return "P";
    }
  }

  private static void logFetchedPacksOnStartup() {
    CompletableFuture
      .supplyAsync(() -> {
        try {
          return PackDiscoveryService.discoverActivePacks(config);
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      })
      .thenAccept(SogkiRpManagerClient::logPackList)
      .exceptionally(error -> {
        LOGGER.warn("============================================================");
        LOGGER.warn("[SogkiRP] RESOURCE PACK FETCH FAILED");
        LOGGER.warn("[SogkiRP] Endpoint: {}", config.activeEndpoint);
        LOGGER.warn("[SogkiRP] Reason: {}", rootMessage(error));
        LOGGER.warn("============================================================");
        return null;
      });
  }

  private static void logPackList(List<PackEntry> packs) {
    if (packs == null || packs.isEmpty()) {
      LOGGER.info("============================================================");
      LOGGER.info("[SogkiRP] RESOURCE PACKS (STARTUP)");
      LOGGER.info("[SogkiRP] Endpoint: {}", config.activeEndpoint);
      LOGGER.info("[SogkiRP] No active packs found.");
      LOGGER.info("============================================================");
      return;
    }

    LOGGER.info("============================================================");
    LOGGER.info("[SogkiRP] RESOURCE PACKS (STARTUP)");
    LOGGER.info("[SogkiRP] Endpoint: {}", config.activeEndpoint);
    LOGGER.info("[SogkiRP] Active pack count: {}", packs.size());
    LOGGER.info("------------------------------------------------------------");
    for (int i = 0; i < packs.size(); i++) {
      PackEntry pack = packs.get(i);
      LOGGER.info(
        "[SogkiRP] {}. {} | {} | {} | {}",
        String.format("%02d", i + 1),
        pack.name(),
        pack.version(),
        formatBytes(pack.size()),
        pack.url()
      );
    }
    LOGGER.info("============================================================");
  }

  private static void logStartupHeader() {
    LOGGER.info("============================================================");
    LOGGER.info("[SogkiRP] Initializing Sogki Resource Pack Manager");
    LOGGER.info("[SogkiRP] Active endpoint: {}", config.activeEndpoint);
    LOGGER.info("[SogkiRP] Prompt on join: {}", config.promptOnJoin);
    LOGGER.info("============================================================");
  }

  private static String rootMessage(Throwable error) {
    Throwable curr = error;
    while (curr.getCause() != null) curr = curr.getCause();
    return curr.getMessage() == null ? "Unknown error" : curr.getMessage();
  }

  private static String formatBytes(int bytes) {
    if (bytes <= 0) return "0 B";
    String[] units = new String[] {"B", "KB", "MB", "GB"};
    double value = bytes;
    int idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024.0;
      idx++;
    }
    String rounded = value >= 10 ? String.format("%.0f", value) : String.format("%.1f", value);
    return rounded + " " + units[idx];
  }
}
