package dev.sogki.rpmanager.ui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.List;

public final class DownloadLogScreen extends Screen {
  private static final int COLOR_WHITE = 0xFFFFFFFF;
  private static final int COLOR_MUTED = 0xFFBBBBBB;
  private static final int COLOR_BODY = 0xFFE0E0E0;
  private static final int COLOR_SOFT = 0xFF9A9A9A;
  private static final int COLOR_SUCCESS = 0xFF80E0A0;
  private static final int COLOR_ERROR = 0xFFFF8B8B;
  private static final int COLOR_TITLE = 0xFFB486FF;
  private static final int COLOR_BACKGROUND = 0xFF000000;
  private static final int COLOR_PANEL = 0xFF141722;
  private static final int COLOR_PANEL_BORDER = 0xFF3A3A48;
  private final Screen parent;
  private final List<String> logs;
  private int panelLeft;
  private int panelTop;
  private int panelWidth;
  private int panelHeight;

  public DownloadLogScreen(Screen parent, List<String> logs) {
    super(Text.literal("Resource Pack Download Results"));
    this.parent = parent;
    this.logs = logs;
  }

  @Override
  protected void init() {
    int centerX = this.width / 2;
    panelWidth = Math.min(460, width - 40);
    panelHeight = Math.min(300, height - 30);
    panelLeft = centerX - panelWidth / 2;
    panelTop = (height - panelHeight) / 2;

    addDrawable((context, mouseX, mouseY, delta) -> drawPanelAndText(context));

    addDrawableChild(ButtonWidget.builder(Text.literal("Open Options"), button -> openOptions())
      .dimensions(centerX - 166, panelTop + panelHeight - 28, 108, 20)
      .build());
    addDrawableChild(ButtonWidget.builder(Text.literal("Back"), button -> close())
      .dimensions(centerX - 52, panelTop + panelHeight - 28, 80, 20)
      .build());
    addDrawableChild(ButtonWidget.builder(Text.literal("Done"), button -> close())
      .dimensions(centerX + 34, panelTop + panelHeight - 28, 80, 20)
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
    super.render(context, mouseX, mouseY, delta);
  }

  private void drawPanelAndText(DrawContext context) {
    context.fill(panelLeft, panelTop, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL);
    context.fill(panelLeft, panelTop, panelLeft + panelWidth, panelTop + 1, COLOR_PANEL_BORDER);
    context.fill(panelLeft, panelTop + panelHeight - 1, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL_BORDER);
    context.fill(panelLeft, panelTop, panelLeft + 1, panelTop + panelHeight, COLOR_PANEL_BORDER);
    context.fill(panelLeft + panelWidth - 1, panelTop, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL_BORDER);

    context.drawCenteredTextWithShadow(this.textRenderer, this.title, this.width / 2, panelTop + 12, COLOR_TITLE);
    context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Packs were downloaded to your resourcepacks folder."), this.width / 2, panelTop + 28, COLOR_MUTED);
    context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Open Options -> Resource Packs to enable them."), this.width / 2, panelTop + 40, COLOR_SOFT);

    int successCount = 0;
    int failCount = 0;
    for (String line : logs) {
      if (line.startsWith("Downloaded:")) successCount++;
      if (line.startsWith("Failed:")) failCount++;
    }
    context.drawTextWithShadow(this.textRenderer, "Downloaded: " + successCount, panelLeft + 12, panelTop + 56, COLOR_SUCCESS);
    context.drawTextWithShadow(this.textRenderer, "Failed: " + failCount, panelLeft + 132, panelTop + 56, failCount > 0 ? COLOR_ERROR : COLOR_SOFT);

    int y = panelTop + 74;
    int maxLines = Math.min(logs.size(), 14);
    for (int i = 0; i < maxLines; i++) {
      String line = logs.get(i);
      int color = line.startsWith("Failed:") ? COLOR_ERROR : line.startsWith("Downloaded:") ? COLOR_SUCCESS : COLOR_BODY;
      context.drawTextWithShadow(this.textRenderer, trim(line, 72), panelLeft + 12, y, color);
      y += 12;
    }
    if (logs.size() > maxLines) {
      context.drawTextWithShadow(this.textRenderer, "... and " + (logs.size() - maxLines) + " more lines", panelLeft + 12, y, COLOR_SOFT);
    }
  }

  private void openOptions() {
    if (client != null) {
      client.setScreen(new OptionsScreen(this, client.options));
    }
  }

  private static String trim(String line, int maxChars) {
    if (line.length() <= maxChars) return line;
    return line.substring(0, maxChars - 3) + "...";
  }
}
