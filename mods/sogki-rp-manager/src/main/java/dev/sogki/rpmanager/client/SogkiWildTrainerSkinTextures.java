package dev.sogki.rpmanager.client;

import com.mojang.authlib.GameProfile;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.util.DefaultSkinHelper;
import net.minecraft.client.util.SkinTextures;
import net.minecraft.util.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Resolves Mojang player skins for {@link dev.sogki.rpmanager.entity.SogkiWildTrainerEntity}.
 * <p>
 * Modern {@link net.minecraft.client.texture.PlayerSkinProvider} keys textures by {@link GameProfile}; using only the
 * offline UUID ({@code OfflinePlayer:&lt;name&gt;}) often never receives the real skin. We therefore resolve the
 * premium UUID via Mojang's public username API (async), then call {@code fetchSkinTextures} with that profile.
 */
public final class SogkiWildTrainerSkinTextures {
  private static final Logger LOGGER = LoggerFactory.getLogger("SogkiWildTrainerSkin");
  private static final HttpClient HTTP = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(8))
    .build();

  private static final Map<String, Identifier> TEXTURE_CACHE = new ConcurrentHashMap<>();
  /** Latest slim/wide hint after a successful skin fetch. */
  private static final Map<String, SkinTextures.Model> MODEL_CACHE = new ConcurrentHashMap<>();
  private static final Set<String> RESOLVE_IN_FLIGHT = ConcurrentHashMap.newKeySet();
  /** Negative cache: usernames that returned 404 from Mojang (avoid hammering API). */
  private static final Set<String> UNKNOWN_NAME = ConcurrentHashMap.newKeySet();

  private SogkiWildTrainerSkinTextures() {
  }

  private static String cacheKey(String name) {
    return name.trim().toLowerCase(Locale.ROOT);
  }

  private static UUID offlineUuid(String name) {
    return UUID.nameUUIDFromBytes(("OfflinePlayer:" + name.trim()).getBytes(StandardCharsets.UTF_8));
  }

  private static Identifier textureId(SkinTextures st) {
    return st == null ? null : st.texture();
  }

  /**
   * True when we have loaded textures and the skin uses the slim arm model.
   */
  public static boolean usesSlimModel(String skinUsername) {
    if (skinUsername == null || skinUsername.isBlank()) {
      return false;
    }
    SkinTextures.Model m = MODEL_CACHE.get(cacheKey(skinUsername));
    return m == SkinTextures.Model.SLIM;
  }

  /**
   * Starts async Mojang UUID + skin fetch if not already cached or in flight.
   */
  public static void warmup(String skinUsername) {
    if (skinUsername == null || skinUsername.isBlank()) {
      return;
    }
    String name = skinUsername.trim();
    String key = cacheKey(name);
    if (TEXTURE_CACHE.containsKey(key)) {
      return;
    }
    if (!RESOLVE_IN_FLIGHT.add(key)) {
      return;
    }
    scheduleFetchSkin(key, name);
  }

  private static void scheduleFetchSkin(String key, String name) {
    resolveMojangUuidAsync(name).thenCompose(uuidOpt -> {
      UUID uuid = uuidOpt.orElseGet(() -> offlineUuid(name));
      GameProfile profile = new GameProfile(uuid, name);
      MinecraftClient client = MinecraftClient.getInstance();
      if (client == null) {
        return CompletableFuture.completedFuture(null);
      }
      return client.getSkinProvider().fetchSkinTextures(profile);
    }).whenComplete((textures, error) -> {
      RESOLVE_IN_FLIGHT.remove(key);
      if (error != null) {
        LOGGER.debug("[SogkiWildTrainer] Skin fetch failed for {}: {}", name, error.toString());
        return;
      }
      if (textures == null) {
        return;
      }
      Identifier id = textureId(textures);
      if (id != null) {
        TEXTURE_CACHE.put(key, id);
      }
      MODEL_CACHE.put(key, textures.model());
    });
  }

  /**
   * Looks up {@code name} on Mojang's profile API (HTTP, off-thread). Empty if unknown / error.
   */
  private static CompletableFuture<Optional<UUID>> resolveMojangUuidAsync(String name) {
    String trimmed = name.trim();
    if (UNKNOWN_NAME.contains(cacheKey(trimmed))) {
      return CompletableFuture.completedFuture(Optional.empty());
    }
    return CompletableFuture.supplyAsync(() -> {
      try {
        String enc = URLEncoder.encode(trimmed, StandardCharsets.UTF_8);
        URI uri = URI.create("https://api.mojang.com/users/profiles/minecraft/" + enc);
        HttpRequest req = HttpRequest.newBuilder(uri)
          .timeout(Duration.ofSeconds(10))
          .header("User-Agent", "SogkiCobblemon-WildTrainer/1.0 (Fabric; +https://github.com)")
          .GET()
          .build();
        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() == 404) {
          UNKNOWN_NAME.add(cacheKey(trimmed));
          return Optional.<UUID>empty();
        }
        if (resp.statusCode() != 200) {
          return Optional.<UUID>empty();
        }
        UUID parsed = parseUuidFromMojangProfileJson(resp.body());
        return Optional.ofNullable(parsed);
      } catch (Exception e) {
        LOGGER.debug("[SogkiWildTrainer] Mojang UUID lookup failed for {}: {}", trimmed, e.toString());
        return Optional.<UUID>empty();
      }
    });
  }

  /** Minimal JSON parse: {@code {"id":"<hex>","name":"..."}} */
  static UUID parseUuidFromMojangProfileJson(String json) {
    if (json == null || json.isBlank()) {
      return null;
    }
    int i = json.indexOf("\"id\":\"");
    if (i < 0) {
      i = json.indexOf("\"id\": \"");
      if (i < 0) {
        return null;
      }
      i += 7;
    } else {
      i += 6;
    }
    int end = json.indexOf('"', i);
    if (end <= i) {
      return null;
    }
    return uuidFromUndashedHex(json.substring(i, end));
  }

  private static UUID uuidFromUndashedHex(String hex) {
    if (hex == null || hex.length() != 32) {
      return null;
    }
    try {
      return new UUID(
        Long.parseUnsignedLong(hex.substring(0, 16), 16),
        Long.parseUnsignedLong(hex.substring(16, 32), 16)
      );
    } catch (Exception e) {
      return null;
    }
  }

  public static Identifier textureFor(String skinUsername) {
    if (skinUsername == null || skinUsername.isBlank()) {
      return DefaultSkinHelper.getTexture();
    }
    String name = skinUsername.trim();
    String key = cacheKey(name);
    Identifier hit = TEXTURE_CACHE.get(key);
    if (hit != null) {
      return hit;
    }
    MinecraftClient client = MinecraftClient.getInstance();
    if (client == null) {
      return DefaultSkinHelper.getTexture();
    }
    warmup(name);
    // Try sync path with offline profile (works for some setups); real skin arrives async.
    GameProfile offline = new GameProfile(offlineUuid(name), name);
    SkinTextures syncTry = client.getSkinProvider().getSkinTextures(offline);
    Identifier syncId = textureId(syncTry);
    if (syncId != null && !syncId.equals(DefaultSkinHelper.getTexture())) {
      TEXTURE_CACHE.put(key, syncId);
      MODEL_CACHE.put(key, syncTry.model());
      return syncId;
    }
    return DefaultSkinHelper.getTexture();
  }
}
