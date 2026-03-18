package dev.sogki.rpmanager.service;

import dev.sogki.rpmanager.model.PackEntry;
import net.fabricmc.loader.api.FabricLoader;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PackDownloadService {
  private static final Pattern FILENAME_DISPOSITION = Pattern.compile("filename=\"?([^\";]+)\"?");

  private PackDownloadService() {
  }

  public static List<String> downloadAll(List<PackEntry> packs) {
    List<String> logs = new ArrayList<>();
    Path targetDir = FabricLoader.getInstance().getGameDir().resolve("resourcepacks");

    try {
      Files.createDirectories(targetDir);
    } catch (IOException e) {
      logs.add("Failed to create resourcepacks directory: " + e.getMessage());
      return logs;
    }

    for (PackEntry pack : packs) {
      try {
        logs.add(downloadSingle(pack, targetDir));
      } catch (Exception e) {
        logs.add("Failed: " + pack.url() + " -> " + e.getMessage());
      }
    }
    return logs;
  }

  public static String downloadOne(PackEntry pack) throws Exception {
    Path targetDir = FabricLoader.getInstance().getGameDir().resolve("resourcepacks");
    Files.createDirectories(targetDir);
    return downloadSingle(pack, targetDir);
  }

  private static String downloadSingle(PackEntry pack, Path targetDir) throws Exception {
    HttpURLConnection conn = open(pack.url());
    conn.setRequestMethod("GET");
    conn.setConnectTimeout(12000);
    conn.setReadTimeout(30000);
    conn.setInstanceFollowRedirects(true);
    conn.setRequestProperty("Accept", "application/zip,*/*");

    int code = conn.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new IOException("HTTP " + code);
    }

    String fileName = (pack.fileName() != null && !pack.fileName().isBlank())
      ? pack.fileName()
      : inferFilename(pack.url(), conn);
    if (!fileName.toLowerCase(Locale.ROOT).endsWith(".zip")) {
      fileName = fileName + ".zip";
    }
    fileName = sanitizeFileName(fileName);
    Path out = targetDir.resolve(fileName);

    MessageDigest digest = MessageDigest.getInstance("SHA-1");

    try (InputStream in = conn.getInputStream(); OutputStream os = Files.newOutputStream(out)) {
      byte[] buffer = new byte[8192];
      int n;
      while ((n = in.read(buffer)) > 0) {
        digest.update(buffer, 0, n);
        os.write(buffer, 0, n);
      }
    }

    String sha1 = toHex(digest.digest());
    if (pack.sha1() != null && !pack.sha1().isBlank() && !pack.sha1().equalsIgnoreCase(sha1)) {
      Files.deleteIfExists(out);
      throw new IOException("SHA1 mismatch. Expected " + pack.sha1() + ", got " + sha1);
    }

    return "Downloaded: " + fileName;
  }

  private static HttpURLConnection open(String urlText) throws IOException {
    URL url = URI.create(urlText).toURL();
    return (HttpURLConnection) url.openConnection();
  }

  private static String inferFilename(String sourceUrl, HttpURLConnection conn) {
    String disposition = conn.getHeaderField("Content-Disposition");
    if (disposition != null) {
      Matcher m = FILENAME_DISPOSITION.matcher(disposition);
      if (m.find()) return m.group(1);
    }
    String path = URI.create(sourceUrl).getPath();
    int idx = path.lastIndexOf('/');
    String fallback = idx >= 0 ? path.substring(idx + 1) : path;
    if (fallback == null || fallback.isBlank()) return "server-pack-" + System.currentTimeMillis() + ".zip";
    return fallback;
  }

  private static String sanitizeFileName(String fileName) {
    return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
  }

  private static String toHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }
}
