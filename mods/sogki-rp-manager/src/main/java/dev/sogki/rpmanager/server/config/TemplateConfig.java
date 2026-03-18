package dev.sogki.rpmanager.server.config;

import java.util.ArrayList;
import java.util.List;

public final class TemplateConfig {
  public ChatTemplates chat = new ChatTemplates();
  public TablistTemplates tablist = new TablistTemplates();
  public SidebarTemplates sidebar = new SidebarTemplates();

  public static final class ChatTemplates {
    public boolean includePlayerInFormat = false;
    public String format = "{message}";
  }

  public static final class TablistTemplates {
    public boolean realtimeCoordinates = true;
    public List<String> header = new ArrayList<>(List.of("Online: {online}"));
    public List<String> footer = new ArrayList<>(List.of("Welcome to Loafey's Cobblepals"));
  }

  public static final class SidebarTemplates {
    public boolean realtimeCoordinates = true;
    public String title = "Server";
    public List<String> lines = new ArrayList<>(List.of(
      "Online: {online}",
      "Dimension: {world}",
      "Use /claim",
      "Have a great day!"
    ));
  }
}
