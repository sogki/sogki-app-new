package dev.sogki.rpmanager;

import com.mojang.brigadier.CommandDispatcher;
import dev.sogki.rpmanager.config.RpManagerConfig;
import dev.sogki.rpmanager.model.PackEntry;
import dev.sogki.rpmanager.service.PackDiscoveryService;
import dev.sogki.rpmanager.ui.JoinPromptScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.command.CommandRegistryAccess;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

public final class SogkiRpManagerClient implements ClientModInitializer {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiRpManager");
  private static RpManagerConfig config;
  private static KeyBinding openManagerKey;
  private static boolean promptShownForConnection = false;
  private static boolean startupLogged = false;

  @Override
  public void onInitializeClient() {
    config = RpManagerConfig.load();
    logLine("Client mod loaded (pre-init).");

    openManagerKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
      "key.sogkirpmanager.open_manager",
      InputUtil.Type.KEYSYM,
      GLFW.GLFW_KEY_P,
      "category.sogkirpmanager"
    ));
    logLine("Keybind registered: Open Resource Pack Manager (default key: P)");
    registerClientCommands();

    ClientPlayConnectionEvents.JOIN.register((handler, sender, client) -> {
      if (!config.promptOnJoin || promptShownForConnection) return;
      String serverKey = resolveServerKey(client, handler);
      if (config.hasSeenPromptForServer(serverKey)) {
        promptShownForConnection = true;
        logUiEvent("Join prompt already shown before for server: " + serverKey);
        return;
      }
      config.markPromptSeenForServer(serverKey);
      config.save();
      promptShownForConnection = true;
      logUiEvent("Opening RP manager on first join for server: " + serverKey);
      client.execute(() -> client.setScreen(new JoinPromptScreen(client.currentScreen, config)));
      fetchAndLogPacks("JOIN");
    });

    ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> promptShownForConnection = false);

    ClientTickEvents.END_CLIENT_TICK.register(client -> {
      if (!startupLogged) {
        startupLogged = true;
        logStartupHeader();
        fetchAndLogPacks("STARTUP");
      }
      while (openManagerKey.wasPressed()) {
        logUiEvent("Opening RP manager via keybind: " + openKeyLabel());
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

  public static void logUiEvent(String message) {
    logLine("[UI] " + message);
  }

  private static void registerClientCommands() {
    ClientCommandRegistrationCallback.EVENT.register(SogkiRpManagerClient::registerCommands);
    logLine("Registered /sogkirp operator commands.");
  }

  private static void registerCommands(
    CommandDispatcher<FabricClientCommandSource> dispatcher,
    CommandRegistryAccess registryAccess
  ) {
    dispatcher.register(
      ClientCommandManager.literal("sogkirp")
        .executes(ctx -> runOpCommand(ctx.getSource(), "Use: /sogkirp <open|refresh|list|prompt_on_join on|off>"))
        .then(ClientCommandManager.literal("open")
          .executes(ctx -> runOpCommand(ctx.getSource(), () -> {
            var client = ctx.getSource().getClient();
            client.setScreen(new JoinPromptScreen(client.currentScreen, config));
            logUiEvent("Opened via /sogkirp open command.");
            ctx.getSource().sendFeedback(Text.literal("Opened Sogki RP Manager."));
          })))
        .then(ClientCommandManager.literal("refresh")
          .executes(ctx -> runOpCommand(ctx.getSource(), () -> {
            fetchAndLogPacks("COMMAND:REFRESH");
            ctx.getSource().sendFeedback(Text.literal("Refreshing active pack list. Check client logs for details."));
          })))
        .then(ClientCommandManager.literal("list")
          .executes(ctx -> runOpCommand(ctx.getSource(), () -> {
            fetchAndLogPacks("COMMAND:LIST");
            ctx.getSource().sendFeedback(Text.literal("Fetching active packs. Check client logs for details."));
          })))
        .then(ClientCommandManager.literal("prompt_on_join")
          .then(ClientCommandManager.literal("on")
            .executes(ctx -> runOpCommand(ctx.getSource(), () -> {
              config.promptOnJoin = true;
              config.save();
              logUiEvent("promptOnJoin set to true via command.");
              ctx.getSource().sendFeedback(Text.literal("promptOnJoin enabled."));
            })))
          .then(ClientCommandManager.literal("off")
            .executes(ctx -> runOpCommand(ctx.getSource(), () -> {
              config.promptOnJoin = false;
              config.save();
              logUiEvent("promptOnJoin set to false via command.");
              ctx.getSource().sendFeedback(Text.literal("promptOnJoin disabled."));
            }))))
    );
  }

  private static int runOpCommand(FabricClientCommandSource source, String message) {
    if (!hasOperatorAccess(source)) {
      source.sendError(Text.literal("Operator permission required."));
      return 0;
    }
    source.sendFeedback(Text.literal(message));
    return 1;
  }

  private static int runOpCommand(FabricClientCommandSource source, Runnable action) {
    if (!hasOperatorAccess(source)) {
      source.sendError(Text.literal("Operator permission required."));
      return 0;
    }
    action.run();
    return 1;
  }

  private static boolean hasOperatorAccess(FabricClientCommandSource source) {
    try {
      var player = source.getPlayer();
      return player != null && player.hasPermissionLevel(2);
    } catch (Throwable ignored) {
      return false;
    }
  }

  private static void fetchAndLogPacks(String reason) {
    logUiEvent("Fetching active packs (" + reason + ").");
    CompletableFuture
      .supplyAsync(() -> {
        try {
          return PackDiscoveryService.discoverActivePacks(config);
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      })
      .thenAccept(packs -> logPackListWithReason(reason, packs))
      .exceptionally(error -> {
        String sep = "============================================================";
        LOGGER.warn(sep);
        System.out.println(sep);
        logWarnLine("RESOURCE PACK FETCH FAILED (" + reason + ")");
        logWarnLine("Endpoint: " + config.activeEndpoint);
        logWarnLine("Reason: " + rootMessage(error));
        LOGGER.warn(sep);
        System.out.println(sep);
        return null;
      });
  }

  private static void logPackListWithReason(String reason, List<PackEntry> packs) {
    if (packs == null || packs.isEmpty()) {
      logBlock(
        "RESOURCE PACKS (" + reason + ")",
        "Endpoint: " + config.activeEndpoint,
        "No active packs found."
      );
      return;
    }

    String sep = "============================================================";
    String mid = "------------------------------------------------------------";
    LOGGER.info(sep);
    System.out.println(sep);
    logLine("RESOURCE PACKS (" + reason + ")");
    logLine("Endpoint: " + config.activeEndpoint);
    logLine("Active pack count: " + packs.size());
    LOGGER.info(mid);
    System.out.println(mid);
    for (int i = 0; i < packs.size(); i++) {
      PackEntry pack = packs.get(i);
      logLine(String.format("%02d", i + 1) + ". " + pack.name() + " | " + pack.version() + " | " + formatBytes(pack.size()) + " | " + pack.url());
    }
    LOGGER.info(sep);
    System.out.println(sep);
  }

  private static void logStartupHeader() {
    logBlock(
      "INITIALIZING SOGKI RESOURCE PACK MANAGER",
      "Active endpoint: " + config.activeEndpoint,
      "Prompt on join: " + config.promptOnJoin,
      "Keybind: " + openKeyLabel()
    );
  }

  private static void logLine(String message) {
    String line = "[SogkiRP] " + message;
    LOGGER.warn(line);
    System.err.println(line);
  }

  private static void logWarnLine(String message) {
    String line = "[SogkiRP] " + message;
    LOGGER.warn(line);
    System.err.println(line);
  }

  private static void logBlock(String title, String... lines) {
    String sep = "============================================================";
    LOGGER.info(sep);
    System.out.println(sep);
    logLine(title);
    for (String line : lines) {
      logLine(line);
    }
    LOGGER.info(sep);
    System.out.println(sep);
  }

  private static String rootMessage(Throwable error) {
    Throwable curr = error;
    while (curr.getCause() != null) curr = curr.getCause();
    return curr.getMessage() == null ? "Unknown error" : curr.getMessage();
  }

  private static String resolveServerKey(net.minecraft.client.MinecraftClient client, net.minecraft.client.network.ClientPlayNetworkHandler handler) {
    try {
      var server = client.getCurrentServerEntry();
      if (server != null && server.address != null && !server.address.isBlank()) {
        return server.address.trim().toLowerCase(Locale.ROOT);
      }
    } catch (Throwable ignored) {
    }

    try {
      var connection = handler.getConnection();
      if (connection != null && connection.getAddress() != null) {
        String value = connection.getAddress().toString();
        if (value != null && !value.isBlank()) {
          return value.trim().toLowerCase(Locale.ROOT);
        }
      }
    } catch (Throwable ignored) {
    }

    return "unknown-server";
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
