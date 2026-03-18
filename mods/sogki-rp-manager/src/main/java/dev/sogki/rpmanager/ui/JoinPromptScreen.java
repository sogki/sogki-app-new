package dev.sogki.rpmanager.ui;

import dev.sogki.rpmanager.SogkiRpManagerClient;
import dev.sogki.rpmanager.config.RpManagerConfig;
import dev.sogki.rpmanager.model.PackEntry;
import dev.sogki.rpmanager.service.PackDiscoveryService;
import dev.sogki.rpmanager.service.PackDownloadService;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class JoinPromptScreen extends Screen {
  private static final int ROWS_PER_PAGE = 4;
  private static final int COLOR_WHITE = 0xFFFFFFFF;
  private static final int COLOR_MUTED = 0xFFBBBBBB;
  private static final int COLOR_SOFT = 0xFFA4A4B0;
  private static final int COLOR_BODY = 0xFFE0E0E0;
  private static final int COLOR_HELP = 0xFFB5C9FF;
  private static final int COLOR_TITLE = 0xFFB486FF;
  private static final int COLOR_BACKGROUND = 0xFF000000;
  private static final int COLOR_PANEL = 0xFF141722;
  private static final int COLOR_PANEL_BORDER = 0xFF3A3A48;
  private static final int COLOR_ROW = 0xFF1B1B2A;
  private static final int COLOR_ROW_BORDER = 0xFF50506A;
  private final Screen parent;
  private final RpManagerConfig config;
  private List<PackEntry> packs = new ArrayList<>();
  private final List<ButtonWidget> rowButtons = new ArrayList<>();
  private String fetchError = "";
  private boolean loading = false;
  private int listOffset = 0;
  private boolean discovered = false;
  private ButtonWidget downloadButton;
  private ButtonWidget refreshButton;
  private ButtonWidget closeButton;
  private int panelLeft;
  private int panelTop;
  private int panelWidth;
  private int panelHeight;
  private int listLeft;
  private int listWidth;
  private int listTop;

  public JoinPromptScreen(Screen parent, RpManagerConfig config) {
    super(Text.literal("Server Resource Packs"));
    this.parent = parent;
    this.config = config;
  }

  @Override
  protected void init() {
    clearChildren();
    rowButtons.clear();

    int centerX = width / 2;
    panelWidth = Math.min(460, width - 40);
    panelHeight = Math.min(320, height - 30);
    panelLeft = centerX - panelWidth / 2;
    panelTop = (height - panelHeight) / 2;
    int listActionsY = panelTop + 88;
    listTop = panelTop + 116;
    listLeft = panelLeft + 12;
    listWidth = panelWidth - 24;
    int bottomButtonsY = panelTop + panelHeight - 28;

    // Panel background and rows as a drawable in the same screen render pipeline.
    addDrawable((context, mouseX, mouseY, delta) -> drawPanelAndRows(context));

    downloadButton = addDrawableChild(ButtonWidget.builder(Text.literal("Download All"), button -> startDownload())
      .dimensions(listLeft, listActionsY, 112, 20)
      .build());
    refreshButton = addDrawableChild(ButtonWidget.builder(Text.literal("Refresh"), button -> {
        SogkiRpManagerClient.logUiEvent("Refresh button clicked.");
        discoverPacks("refresh");
      })
      .dimensions(listLeft + 118, listActionsY, 84, 20)
      .build());
    closeButton = addDrawableChild(ButtonWidget.builder(Text.literal("I'll do this later"), button -> close())
      .dimensions(centerX - 66, bottomButtonsY, 132, 20)
      .build());

    // Text drawable added after buttons for consistent layering.
    addDrawable((context, mouseX, mouseY, delta) -> drawOverlayText(context));

    refreshRowButtons();
    if (!discovered) {
      discovered = true;
      SogkiRpManagerClient.logUiEvent("RP manager screen opened.");
      discoverPacks("initial-open");
    }
  }

  private void discoverPacks(String reason) {
    setLoading(true);
    fetchError = "";
    SogkiRpManagerClient.logUiEvent("Fetching active packs (" + reason + ").");
    CompletableFuture
      .supplyAsync(() -> {
        try {
          return PackDiscoveryService.discoverActivePacks(config);
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      })
      .thenAccept(result -> {
        if (client == null) return;
        client.execute(() -> {
          packs = result;
          listOffset = 0;
          fetchError = "";
          setLoading(false);
          refreshRowButtons();
          SogkiRpManagerClient.logUiEvent("Fetched " + packs.size() + " active pack(s).");
        });
      })
      .exceptionally(error -> {
        if (client != null) {
          client.execute(() -> {
            fetchError = "Could not load active packs. Press Refresh and try again.";
            setLoading(false);
            refreshRowButtons();
            SogkiRpManagerClient.logUiEvent("Fetch failed: " + error.getMessage());
          });
        }
        return null;
      });
  }

  private void startDownload() {
    if (packs.isEmpty()) {
      return;
    }
    setLoading(true);

    CompletableFuture
      .supplyAsync(() -> PackDownloadService.downloadAll(packs))
      .thenAccept(logs -> {
        if (client != null) {
          client.execute(() -> {
            setLoading(false);
            client.setScreen(new DownloadLogScreen(this, logs));
          });
        }
      })
      .exceptionally(error -> {
        if (client != null) {
          client.execute(() -> {
            fetchError = "Download failed. Please try again or contact Sogki.";
            setLoading(false);
          });
        }
        return null;
      });
  }

  private void downloadSingle(PackEntry pack) {
    setLoading(true);
    CompletableFuture
      .supplyAsync(() -> {
        try {
          return List.of(PackDownloadService.downloadOne(pack));
        } catch (Exception e) {
          throw new RuntimeException(e);
        }
      })
      .thenAccept(logs -> {
        if (client != null) {
          client.execute(() -> {
            setLoading(false);
            client.setScreen(new DownloadLogScreen(this, logs));
          });
        }
      })
      .exceptionally(error -> {
        if (client != null) {
          client.execute(() -> {
            fetchError = "Download failed for " + pack.name() + ".";
            setLoading(false);
            refreshRowButtons();
          });
        }
        return null;
      });
  }

  private void refreshRowButtons() {
    for (ButtonWidget button : rowButtons) {
      remove(button);
    }
    rowButtons.clear();

    int startY = listTop;
    int shown = Math.min(ROWS_PER_PAGE, Math.max(0, packs.size() - listOffset));
    for (int i = 0; i < shown; i++) {
      int index = listOffset + i;
      PackEntry pack = packs.get(index);
      int rowY = startY + i * 44;

      ButtonWidget downloadOneButton = addDrawableChild(ButtonWidget.builder(Text.literal("Download"), button -> downloadSingle(pack))
        .dimensions(listLeft + listWidth - 96, rowY + 12, 84, 20)
        .build());
      rowButtons.add(downloadOneButton);
    }

    for (ButtonWidget button : rowButtons) {
      button.active = !loading;
    }
  }

  private void setLoading(boolean loading) {
    this.loading = loading;
    if (downloadButton != null) {
      downloadButton.active = !loading && !packs.isEmpty();
    }
    if (refreshButton != null) {
      refreshButton.active = !loading;
    }
    if (closeButton != null) {
      closeButton.active = !loading;
    }
    refreshRowButtons();
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

  private void drawPanelAndRows(DrawContext context) {
    context.fill(panelLeft, panelTop, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL);
    context.fill(panelLeft, panelTop, panelLeft + panelWidth, panelTop + 1, COLOR_PANEL_BORDER);
    context.fill(panelLeft, panelTop + panelHeight - 1, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL_BORDER);
    context.fill(panelLeft, panelTop, panelLeft + 1, panelTop + panelHeight, COLOR_PANEL_BORDER);
    context.fill(panelLeft + panelWidth - 1, panelTop, panelLeft + panelWidth, panelTop + panelHeight, COLOR_PANEL_BORDER);

    int y = listTop;
    int shown = Math.min(ROWS_PER_PAGE, Math.max(0, packs.size() - listOffset));
    for (int i = 0; i < shown; i++) {
      int rowY = y + i * 44;
      int rowLeft = listLeft;
      int rowRight = listLeft + listWidth;
      context.fill(rowLeft, rowY, rowRight, rowY + 42, COLOR_ROW);
      context.fill(rowLeft, rowY, rowRight, rowY + 1, COLOR_ROW_BORDER);
      context.fill(rowLeft, rowY + 41, rowRight, rowY + 42, COLOR_ROW_BORDER);
      context.fill(rowLeft, rowY, rowLeft + 1, rowY + 42, COLOR_ROW_BORDER);
      context.fill(rowRight - 1, rowY, rowRight, rowY + 42, COLOR_ROW_BORDER);
      y += 44;
    }
  }

  private void drawOverlayText(DrawContext context) {
    int centerX = width / 2;
    context.drawCenteredTextWithShadow(textRenderer, Text.literal("Sogki's Cobblemon Resource Pack Manager"), centerX, panelTop + 12, COLOR_TITLE);
    context.drawCenteredTextWithShadow(textRenderer, Text.literal("Browse active packs and download one-by-one or all at once."), centerX, panelTop + 26, COLOR_MUTED);
    context.drawCenteredTextWithShadow(textRenderer, Text.literal("Need help? Contact Sogki on Discord or ping in Loafey's Pokepal server."), centerX, panelTop + 40, COLOR_HELP);
    context.drawTextWithShadow(textRenderer, "Texture Packs", listLeft, panelTop + 72, COLOR_WHITE);
    context.drawTextWithShadow(textRenderer, "Open again anytime with keybind: " + SogkiRpManagerClient.openKeyLabel(), listLeft + 150, panelTop + 72, COLOR_SOFT);

    int textY = listTop;
    int shown = Math.min(ROWS_PER_PAGE, Math.max(0, packs.size() - listOffset));
    for (int i = 0; i < shown; i++) {
      int index = listOffset + i;
      PackEntry pack = packs.get(index);
      int rowY = textY + i * 44;
      String heading = pack.name() + "  " + pack.version();
      String details = trim(pack.fileName(), 36) + "  •  " + formatBytes(pack.size());
      context.drawTextWithShadow(textRenderer, heading, listLeft + 8, rowY + 6, COLOR_WHITE);
      context.drawTextWithShadow(textRenderer, details, listLeft + 8, rowY + 18, COLOR_SOFT);
      if (pack.description() != null && !pack.description().isBlank()) {
        context.drawTextWithShadow(textRenderer, trim(pack.description(), 56), listLeft + 8, rowY + 30, COLOR_MUTED);
      }
    }

    if (loading) {
      context.drawTextWithShadow(textRenderer, "Loading packs...", listLeft + 4, listTop + 12, COLOR_MUTED);
    } else if (packs.isEmpty()) {
      context.drawTextWithShadow(textRenderer, "No active packs currently listed.", listLeft + 4, listTop + 12, COLOR_MUTED);
      context.drawTextWithShadow(textRenderer, "Ask staff to activate packs in the admin panel and press Refresh.", listLeft + 4, listTop + 26, COLOR_SOFT);
      if (!fetchError.isBlank()) {
        context.drawTextWithShadow(textRenderer, trim(fetchError, 68), listLeft + 4, listTop + 42, COLOR_HELP);
      }
    }

    if (packs.size() > ROWS_PER_PAGE) {
      int currentStart = listOffset + 1;
      int currentEnd = Math.min(listOffset + ROWS_PER_PAGE, packs.size());
      context.drawTextWithShadow(textRenderer, "Showing " + currentStart + "-" + currentEnd + " of " + packs.size() + " (use mouse wheel to scroll)", listLeft, panelTop + panelHeight - 44, COLOR_SOFT);
    }
  }

  @Override
  public boolean mouseScrolled(double mouseX, double mouseY, double horizontalAmount, double verticalAmount) {
    int maxOffset = Math.max(0, packs.size() - ROWS_PER_PAGE);
    if (verticalAmount < 0 && listOffset < maxOffset) {
      listOffset++;
      refreshRowButtons();
      return true;
    }
    if (verticalAmount > 0 && listOffset > 0) {
      listOffset--;
      refreshRowButtons();
      return true;
    }
    return super.mouseScrolled(mouseX, mouseY, horizontalAmount, verticalAmount);
  }

  private static String trim(String value, int maxChars) {
    if (value.length() <= maxChars) return value;
    return value.substring(0, maxChars - 3) + "...";
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
