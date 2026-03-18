package dev.sogki.rpmanager.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import dev.sogki.rpmanager.config.RpManagerConfig;
import dev.sogki.rpmanager.model.PackEntry;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public final class PackDiscoveryService {
  private static final String DIRECT_SUPABASE_ACTIVE = "https://vwdrdqkzjkfdmycomfvf.supabase.co/functions/v1/resourcepacks-api/active";

  private PackDiscoveryService() {
  }

  public static List<PackEntry> discoverActivePacks(RpManagerConfig config) throws IOException {
    if (config.activeEndpoint == null || config.activeEndpoint.isBlank()) {
      return new ArrayList<>();
    }
    return resolveActiveEndpoint(config.activeEndpoint);
  }

  private static List<PackEntry> resolveActiveEndpoint(String endpoint) throws IOException {
    String body = requestText(endpoint);
    if (looksLikeHtml(body) && endpoint.contains("sogki.dev/api/resourcepacks/active")) {
      body = requestText(DIRECT_SUPABASE_ACTIVE);
    }
    JsonElement root = JsonParser.parseString(body);
    if (!root.isJsonArray()) return List.of();

    JsonArray arr = root.getAsJsonArray();
    List<PackEntry> packs = new ArrayList<>();
    for (JsonElement element : arr) {
      if (!element.isJsonObject()) continue;
      JsonObject obj = element.getAsJsonObject();
      String url = getAsString(obj, "url");
      String sha1 = getAsString(obj, "sha1");
      String name = getAsString(obj, "name");
      String version = getAsString(obj, "version");
      String fileName = getAsString(obj, "file_name");
      int size = getAsInt(obj, "size");
      if (url != null && !url.isBlank()) {
        packs.add(new PackEntry(
          url,
          (sha1 == null || sha1.isBlank()) ? null : sha1,
          defaultValue(name, "resource-pack"),
          defaultValue(version, "latest"),
          Math.max(0, size),
          defaultValue(fileName, inferFileName(url))
        ));
      }
    }
    return packs;
  }

  private static String requestText(String url) throws IOException {
    HttpURLConnection conn = open(url);
    conn.setRequestMethod("GET");
    conn.setRequestProperty("Accept", "application/json");
    conn.setConnectTimeout(8000);
    conn.setReadTimeout(12000);
    int code = conn.getResponseCode();
    InputStream stream = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
    if (stream == null) throw new IOException("No response stream for " + url);
    byte[] bytes = stream.readAllBytes();
    String body = new String(bytes, StandardCharsets.UTF_8);
    if (code < 200 || code >= 300) throw new IOException("Request failed (" + code + ") for " + url + ": " + body);
    return body;
  }

  private static HttpURLConnection open(String urlText) throws IOException {
    URL url = URI.create(urlText).toURL();
    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
    conn.setInstanceFollowRedirects(true);
    return conn;
  }

  private static String getAsString(JsonObject obj, String key) {
    JsonElement value = obj.get(key);
    if (value == null || value.isJsonNull()) return null;
    return value.getAsString();
  }

  private static int getAsInt(JsonObject obj, String key) {
    JsonElement value = obj.get(key);
    if (value == null || value.isJsonNull()) return 0;
    try {
      return value.getAsInt();
    } catch (Exception ignored) {
      return 0;
    }
  }

  private static boolean looksLikeHtml(String body) {
    String trimmed = body == null ? "" : body.trim().toLowerCase();
    return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
  }

  private static String defaultValue(String value, String fallback) {
    return (value == null || value.isBlank()) ? fallback : value;
  }

  private static String inferFileName(String url) {
    try {
      String path = URI.create(url).getPath();
      int idx = path.lastIndexOf('/');
      if (idx >= 0 && idx < path.length() - 1) {
        return path.substring(idx + 1);
      }
    } catch (Exception ignored) {
    }
    return "resource-pack.zip";
  }
}
