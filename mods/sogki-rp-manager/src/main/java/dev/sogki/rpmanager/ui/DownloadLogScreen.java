package dev.sogki.rpmanager.ui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.List;

public final class DownloadLogScreen extends Screen {
  private static final int COLOR_WHITE = 0xFFFFFFFF;
  private static final int COLOR_MUTED = 0xFFBBBBBB;
  private static final int COLOR_BODY = 0xFFE0E0E0;
  private static final int COLOR_SOFT = 0xFF9A9A9A;
  private final Screen parent;
  private final List<String> logs;

  public DownloadLogScreen(Screen parent, List<String> logs) {
    super(Text.literal("Resource Pack Download Results"));
    this.parent = parent;
    this.logs = logs;
  }

  @Override
  protected void init() {
    int centerX = this.width / 2;
    addDrawableChild(ButtonWidget.builder(Text.literal("Close"), button -> close())
      .dimensions(centerX - 60, this.height - 32, 120, 20)
      .build());
  }

  @Override
  public void close() {
    if (client != null) {
      client.setScreen(parent);
    }
  }

  @Override
  public void render(DrawContext context, int mouseX, int mouseY, float delta) {
    renderBackground(context, mouseX, mouseY, delta);
    context.drawCenteredTextWithShadow(this.textRenderer, this.title, this.width / 2, 16, COLOR_WHITE);
    context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Open Resource Packs in options to enable them."), this.width / 2, 32, COLOR_MUTED);

    int y = 54;
    int maxLines = Math.min(logs.size(), 14);
    for (int i = 0; i < maxLines; i++) {
      String line = logs.get(i);
      context.drawTextWithShadow(this.textRenderer, trim(line, 90), 24, y, COLOR_BODY);
      y += 12;
    }
    if (logs.size() > maxLines) {
      context.drawTextWithShadow(this.textRenderer, "... and " + (logs.size() - maxLines) + " more lines", 24, y, COLOR_SOFT);
    }
    super.render(context, mouseX, mouseY, delta);
  }

  private static String trim(String line, int maxChars) {
    if (line.length() <= maxChars) return line;
    return line.substring(0, maxChars - 3) + "...";
  }
}
