package dev.sogki.rpmanager;

import dev.sogki.rpmanager.config.RpManagerConfig;
import dev.sogki.rpmanager.ui.JoinPromptScreen;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.text.Text;
import org.lwjgl.glfw.GLFW;

public final class SogkiRpManagerClient implements ClientModInitializer {
  private static RpManagerConfig config;
  private static KeyBinding openManagerKey;
  private static boolean promptShownForConnection = false;

  @Override
  public void onInitializeClient() {
    config = RpManagerConfig.load();
    openManagerKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
      "key.sogkirpmanager.open_manager",
      InputUtil.Type.KEYSYM,
      GLFW.GLFW_KEY_P,
      "category.sogkirpmanager"
    ));

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
    return openManagerKey.getBoundKeyLocalizedText().getString();
  }
}
