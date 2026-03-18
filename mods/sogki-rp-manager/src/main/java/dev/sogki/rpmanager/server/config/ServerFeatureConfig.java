package dev.sogki.rpmanager.server.config;

import java.util.ArrayList;
import java.util.List;

public final class ServerFeatureConfig {
  public String brand = "";
  public RemoteConfig remoteConfig = new RemoteConfig();
  public AnnouncementConfig announcements = new AnnouncementConfig();
  public AreaConfig area = new AreaConfig();
  public StreakConfig streak = new StreakConfig();
  public RegionConfig regions = new RegionConfig();
  public CobbletownConfig cobbletown = new CobbletownConfig();
  public ChatConfig chat = new ChatConfig();
  public TablistConfig tablist = new TablistConfig();
  public SidebarConfig sidebar = new SidebarConfig();
  public MessagesConfig messages = new MessagesConfig();

  public static final class RemoteConfig {
    public boolean enabled = false;
    public String url = "";
    public int timeoutMs = 2000;
    public boolean failOpen = true;
  }

  public static final class AnnouncementConfig {
    public boolean enabled = true;
    public int cooldownSeconds = 8;
    public boolean catchAnnouncements = true;
    public boolean shinyCatchAnnouncements = true;
    public boolean battleAnnouncements = false;
    public String catchTemplate = "{player} caught {pokemon}.";
    public String shinyCatchTemplate = "{player} caught a SHINY {pokemon}!";
    public String manualTemplate = "{message}";
  }

  public static final class AreaConfig {
    public boolean enabled = true;
    public int checkIntervalTicks = 20;
    public int perPlayerCooldownSeconds = 8;
    public String enterTemplate = "Entered {area}";
    public String leaveTemplate = "Left {area}";
    public DisplayRoute enterDisplay = new DisplayRoute();
    public DisplayRoute leaveDisplay = new DisplayRoute();
    public DisplayRoute townDisplay = new DisplayRoute();
    public List<TownDefinition> towns = new ArrayList<>();
  }

  public static final class TownDefinition {
    public String id = "spawn";
    public String name = "Spawn";
    public String dimension = "minecraft:overworld";
    public int minX = -128;
    public int minY = -64;
    public int minZ = -128;
    public int maxX = 128;
    public int maxY = 320;
    public int maxZ = 128;
  }

  public static final class StreakConfig {
    public boolean enabled = true;
    public int graceDays = 1;
    public boolean autoNotifyOnJoin = true;
    public List<RewardRule> rewards = new ArrayList<>();
  }

  public static final class RewardRule {
    public int day = 1;
    public String itemId = "minecraft:experience_bottle";
    public int count = 8;
    public String label = "XP Bottles";
    public List<RewardItem> items = new ArrayList<>();
  }

  public static final class RewardItem {
    public String itemId = "minecraft:experience_bottle";
    public int count = 1;
    public String label = "Reward";
  }

  public static final class RegionConfig {
    public boolean enabled = true;
    public boolean protectVillagersFromMobs = true;
    public boolean villagersIgnoreZombieFear = true;
    public List<RegionRule> list = new ArrayList<>();
  }

  public static final class RegionRule {
    public String id = "spawn-protect";
    public String dimension = "minecraft:overworld";
    public boolean useRadius = false;
    public int centerX = 0;
    public int centerZ = 0;
    public int radius = 0;
    public int minX = -64;
    public int minY = -64;
    public int minZ = -64;
    public int maxX = 64;
    public int maxY = 320;
    public int maxZ = 64;
    public boolean denyBlockBreak = true;
    public boolean denyBlockPlace = true;
    public boolean denyExplosives = true;
    public boolean denyMobSpawn = false;
    public boolean isTown = false;
    public String displayName = "Spawn";
  }

  public static final class CobbletownConfig {
    public boolean enabled = true;
    public List<CobbletownTown> towns = new ArrayList<>();
  }

  public static final class CobbletownTown {
    public String townId = "cobbletowns:pallet_town";
    public String displayName = "Pallet Town";
    public String dimension = "minecraft:overworld";
    public boolean useRadius = false;
    public int centerX = 0;
    public int centerZ = 0;
    public int radius = 0;
    public int minX = -128;
    public int minY = -64;
    public int minZ = -128;
    public int maxX = 128;
    public int maxY = 320;
    public int maxZ = 128;
    public boolean denyBlockBreak = true;
    public boolean denyBlockPlace = true;
    public boolean denyExplosives = true;
    public boolean denyMobSpawn = true;
  }

  public static final class ChatConfig {
    public boolean enabled = true;
    public boolean includePlayerInFormat = false;
    public String format = "{message}";
    public boolean mentionHighlights = true;
  }

  public static final class TablistConfig {
    public boolean enabled = true;
    public int refreshTicks = 100;
    public boolean realtimeCoordinates = true;
    public List<String> header = new ArrayList<>(List.of("Online: {online}"));
    public List<String> footer = new ArrayList<>(List.of("Have fun in Loafey's Cobblepals"));
  }

  public static final class SidebarConfig {
    public boolean enabled = true;
    public int refreshTicks = 100;
    public boolean realtimeCoordinates = true;
    public String title = "Server";
    public List<String> lines = new ArrayList<>(List.of(
      "Online: {online}",
      "World: {world}",
      "Streak claims: /claim",
      "RP UI key: P"
    ));
  }

  public static final class MessagesConfig {
    public String configReloaded = "Config reloaded.";
    public String tabPreviewRefreshed = "Tablist preview refreshed.";
    public String sidebarPreviewRefreshed = "Sidebar refresh attempted.";

    public String claimPlayerOnly = "Claim is player-only.";
    public String claimMenuPlayerOnly = "Claim menu is player-only.";
    public String claimDisabled = "Daily rewards are disabled.";
    public String claimAlreadyClaimed = "You already claimed today's reward.";
    public String claimSuccess = "Claimed day {day}: {rewards}";
    public String claimNoRewardRule = "Claimed streak day {day}, but no reward rule was configured.";

    public String streakJoinStatus = "Login streak: {streak} day(s). {status}";
    public String streakStatusClaimed = "Already claimed today's reward.";
    public String streakStatusAvailable = "You can claim today's reward.";
    public String streakJoinClaimHint = "Click to claim reward";
    public String streakMenuTitle = "Daily Rewards";
    public String streakMenuCurrent = "Current streak: {streak} day(s)";
    public String streakMenuStatusClaimed = "Status: already claimed today";
    public String streakMenuStatusAvailable = "Status: claim available";
    public String spawnPlayerOnly = "Spawn is player-only.";
    public String spawnNotSet = "Spawn is not set yet.";
    public String spawnTeleported = "Teleported to spawn ({world} @ {x}, {y}, {z}).";
    public String setSpawnPlayerOnly = "Setspawn is player-only.";
    public String setSpawnSuccess = "Spawn set to {world} @ {x}, {y}, {z}.";

    public String regionDenyBreak = "You cannot break blocks in {region}.";
    public String regionDenyPlace = "You cannot place blocks in {region}.";
    public String regionDenyExplosives = "You cannot use explosives in {region}.";
    public String enteredTown = "Entered {town}";
  }

  public static final class DisplayRoute {
    public boolean showActionBar = true;
    public boolean showChat = false;
    public boolean showTitle = false;
    public int titleFadeInTicks = 5;
    public int titleStayTicks = 40;
    public int titleFadeOutTicks = 10;
  }
}
