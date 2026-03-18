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
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PackDiscoveryService {
  private static final String DIRECT_SUPABASE_ACTIVE = "https://vwdrdqkzjkfdmycomfvf.supabase.co/functions/v1/resourcepacks-api/active";
  private static final Pattern FILENAME_DISPOSITION = Pattern.compile("filename=\"?([^\";]+)\"?");
  private static final Pattern VERSION_PATTERN = Pattern.compile("(?i)(v?\\d+(?:\\.\\d+){0,3})");

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
        String resolvedFile = defaultValue(fileName, inferFileName(url));
        int resolvedSize = Math.max(0, size);
        if ("resource-pack.zip".equalsIgnoreCase(resolvedFile) || resolvedSize == 0 || name == null || name.isBlank()) {
          ProbeResult probe = probePack(url);
          if (probe.fileName != null && !probe.fileName.isBlank()) resolvedFile = probe.fileName;
          if (probe.size > 0) resolvedSize = probe.size;
        }

        String inferredVersion = defaultValue(version, inferVersion(resolvedFile));
        String inferredName = defaultValue(name, inferName(resolvedFile, inferredVersion));

        packs.add(new PackEntry(url, emptyToNull(sha1), inferredName, inferredVersion, resolvedSize, resolvedFile));
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

  private static ProbeResult probePack(String url) {
    try {
      HttpURLConnection conn = open(url);
      conn.setInstanceFollowRedirects(true);
      conn.setRequestMethod("GET");
      conn.setRequestProperty("Range", "bytes=0-0");
      conn.setConnectTimeout(8000);
      conn.setReadTimeout(12000);
      int code = conn.getResponseCode();
      if (code < 200 || code >= 400) {
        return new ProbeResult(null, 0);
      }
      String fileName = fileNameFromDisposition(conn.getHeaderField("Content-Disposition"));
      if (fileName == null || fileName.isBlank()) {
        fileName = inferFileName(conn.getURL().toString());
      }
      int size = parseContentLength(conn.getHeaderField("Content-Range"), conn.getHeaderField("Content-Length"));
      return new ProbeResult(fileName, size);
    } catch (Exception ignored) {
      return new ProbeResult(null, 0);
    }
  }

  private static String fileNameFromDisposition(String disposition) {
    if (disposition == null) return null;
    Matcher m = FILENAME_DISPOSITION.matcher(disposition);
    if (m.find()) return m.group(1);
    return null;
  }

  private static int parseContentLength(String contentRange, String contentLength) {
    try {
      if (contentRange != null && contentRange.contains("/")) {
        String total = contentRange.substring(contentRange.lastIndexOf('/') + 1).trim();
        return Integer.parseInt(total);
      }
      if (contentLength != null) return Integer.parseInt(contentLength.trim());
    } catch (Exception ignored) {
    }
    return 0;
  }

  private static String inferVersion(String fileName) {
    String base = stripZip(fileName);
    Matcher m = VERSION_PATTERN.matcher(base);
    if (m.find()) {
      String v = m.group(1);
      return v.toLowerCase(Locale.ROOT).startsWith("v") ? v : "v" + v;
    }
    return "latest";
  }

  private static String inferName(String fileName, String version) {
    String base = stripZip(fileName);
    String normalized = base.replace('_', ' ').trim();
    String withoutVersion = normalized;
    if (version != null && !"latest".equalsIgnoreCase(version)) {
      withoutVersion = normalized.replace(version, "").replace(version.replaceFirst("(?i)^v", ""), "").trim();
    }
    withoutVersion = withoutVersion.replaceAll("\\s{2,}", " ").trim();
    return withoutVersion.isBlank() ? normalized : withoutVersion;
  }

  private static String stripZip(String fileName) {
    if (fileName == null) return "resource-pack";
    String trimmed = fileName.trim();
    if (trimmed.toLowerCase(Locale.ROOT).endsWith(".zip")) {
      return trimmed.substring(0, trimmed.length() - 4);
    }
    return trimmed;
  }

  private static String emptyToNull(String value) {
    return (value == null || value.isBlank()) ? null : value;
  }

  private static final class ProbeResult {
    private final String fileName;
    private final int size;

    private ProbeResult(String fileName, int size) {
      this.fileName = fileName;
      this.size = size;
    }
  }
}
