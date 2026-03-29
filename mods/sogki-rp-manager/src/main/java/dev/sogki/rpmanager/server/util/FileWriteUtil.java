package dev.sogki.rpmanager.server.util;

import com.google.gson.Gson;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public final class FileWriteUtil {
  private FileWriteUtil() {
  }

  public static void writeStringAtomic(Path path, String content) throws IOException {
    if (path == null) throw new IOException("Path is null");
    Path parent = path.getParent();
    if (parent != null) Files.createDirectories(parent);
    Path tmp = Files.createTempFile(parent, path.getFileName().toString(), ".tmp");
    try {
      Files.writeString(tmp, content == null ? "" : content, StandardCharsets.UTF_8);
      moveAtomicOrReplace(tmp, path);
    } finally {
      Files.deleteIfExists(tmp);
    }
  }

  public static void writeJsonAtomic(Path path, Gson gson, Object value) throws IOException {
    String json = gson == null ? String.valueOf(value) : gson.toJson(value);
    writeStringAtomic(path, json);
  }

  private static void moveAtomicOrReplace(Path source, Path target) throws IOException {
    try {
      Files.move(
        source,
        target,
        StandardCopyOption.ATOMIC_MOVE,
        StandardCopyOption.REPLACE_EXISTING
      );
    } catch (IOException atomicFailure) {
      Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
    }
  }
}
