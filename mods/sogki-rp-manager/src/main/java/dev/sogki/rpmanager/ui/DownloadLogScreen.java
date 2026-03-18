package dev.sogki.rpmanager.ui;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.List;

public final class DownloadLogScreen extends Screen {
  private static final int COLOR_MUTED = 0xFFBBBBBB;
  private static final int COLOR_BODY = 0xFFE0E0E0;
  private static final int COLOR_SOFT = 0xFF9A9A9A;
  private static final int COLOR_SUCCESS = 0xFF80E0A0;
  private static final int COLOR_ERROR = 0xFFFF8B8B;
  private static final int COLOR_TITLE = 0xFFB486FF;
  private static final int COLOR_PANEL = 0xFF141722;
  private static final int COLOR_PANEL_BORDER = 0xFF3A3A48;
  private static final int COLOR_SECTION = 0xFF1B1B2A;
  private static final int COLOR_SECTION_BORDER = 0xFF50506A;
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
    panelWidth = Math.min(560, Math.max(320, width - 24));
    panelWidth = Math.min(panelWidth, width - 8);
    panelHeight = Math.min(360, Math.max(230, height - 20));
    panelHeight = Math.min(panelHeight, height - 8);
    panelLeft = centerX - panelWidth / 2;
    panelTop = (height - panelHeight) / 2;
    int buttonY = panelTop + panelHeight - 26;
    int buttonGap = 8;
    int optionsWidth = Math.min(132, Math.max(100, panelWidth / 4));
    int smallWidth = Math.min(96, Math.max(78, panelWidth / 6));
    int totalButtonsWidth = optionsWidth + smallWidth + smallWidth + (buttonGap * 2);
    int buttonsLeft = centerX - (totalButtonsWidth / 2);

    addDrawable((context, mouseX, mouseY, delta) -> drawPanelAndText(context));

    addDrawableChild(ButtonWidget.builder(Text.literal("Open Options"), button -> openOptions())
      .dimensions(buttonsLeft, buttonY, optionsWidth, 20)
      .build());
    addDrawableChild(ButtonWidget.builder(Text.literal("Back"), button -> close())
      .dimensions(buttonsLeft + optionsWidth + buttonGap, buttonY, smallWidth, 20)
      .build());
    addDrawableChild(ButtonWidget.builder(Text.literal("Done"), button -> close())
      .dimensions(buttonsLeft + optionsWidth + buttonGap + smallWidth + buttonGap, buttonY, smallWidth, 20)
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
    context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Packs are now in your resourcepacks folder."), this.width / 2, panelTop + 28, COLOR_MUTED);
    context.drawCenteredTextWithShadow(this.textRenderer, Text.literal("Open Options -> Resource Packs to enable them in game."), this.width / 2, panelTop + 40, COLOR_SOFT);

    int successCount = 0;
    int failCount = 0;
    for (String line : logs) {
      if (line.startsWith("Downloaded:")) successCount++;
      if (line.startsWith("Failed:")) failCount++;
    }
    int statsTop = panelTop + 54;
    int statBoxHeight = 18;
    int successBoxLeft = panelLeft + 12;
    int successBoxRight = successBoxLeft + 122;
    int failedBoxLeft = successBoxRight + 8;
    int failedBoxRight = failedBoxLeft + 102;
    context.fill(successBoxLeft, statsTop, successBoxRight, statsTop + statBoxHeight, COLOR_SECTION);
    context.fill(successBoxLeft, statsTop, successBoxRight, statsTop + 1, COLOR_SECTION_BORDER);
    context.fill(successBoxLeft, statsTop + statBoxHeight - 1, successBoxRight, statsTop + statBoxHeight, COLOR_SECTION_BORDER);
    context.fill(failedBoxLeft, statsTop, failedBoxRight, statsTop + statBoxHeight, COLOR_SECTION);
    context.fill(failedBoxLeft, statsTop, failedBoxRight, statsTop + 1, COLOR_SECTION_BORDER);
    context.fill(failedBoxLeft, statsTop + statBoxHeight - 1, failedBoxRight, statsTop + statBoxHeight, COLOR_SECTION_BORDER);

    context.drawTextWithShadow(this.textRenderer, "Downloaded: " + successCount, successBoxLeft + 6, statsTop + 5, COLOR_SUCCESS);
    context.drawTextWithShadow(this.textRenderer, "Failed: " + failCount, failedBoxLeft + 6, statsTop + 5, failCount > 0 ? COLOR_ERROR : COLOR_SOFT);

    int logTop = panelTop + 78;
    int logBottom = panelTop + panelHeight - 36;
    int logLeft = panelLeft + 12;
    int logRight = panelLeft + panelWidth - 12;
    context.fill(logLeft, logTop, logRight, logBottom, COLOR_SECTION);
    context.fill(logLeft, logTop, logRight, logTop + 1, COLOR_SECTION_BORDER);
    context.fill(logLeft, logBottom - 1, logRight, logBottom, COLOR_SECTION_BORDER);
    context.fill(logLeft, logTop, logLeft + 1, logBottom, COLOR_SECTION_BORDER);
    context.fill(logRight - 1, logTop, logRight, logBottom, COLOR_SECTION_BORDER);

    int y = logTop + 7;
    int maxLinesByHeight = Math.max(1, (logBottom - logTop - 14) / 12);
    int maxLines = Math.min(logs.size(), maxLinesByHeight);
    for (int i = 0; i < maxLines; i++) {
      String line = prettify(logs.get(i));
      int color = line.startsWith("Failed:") ? COLOR_ERROR : line.startsWith("Downloaded:") ? COLOR_SUCCESS : COLOR_BODY;
      context.drawTextWithShadow(this.textRenderer, trim(line, 72), logLeft + 8, y, color);
      y += 12;
    }
    if (logs.size() > maxLines) {
      context.drawTextWithShadow(this.textRenderer, "... and " + (logs.size() - maxLines) + " more lines", logLeft + 8, y, COLOR_SOFT);
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

  private static String prettify(String line) {
    if (line == null || line.isBlank()) return "";
    if (line.startsWith("Downloaded: ")) {
      return line.replaceFirst("^Downloaded:\\s+\\d{10,}-", "Downloaded: ");
    }
    if (line.startsWith("Failed: ")) {
      return line.replaceFirst("^Failed:\\s+\\d{10,}-", "Failed: ");
    }
    return line;
  }
}
