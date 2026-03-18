package dev.sogki.rpmanager.model;

public record PackEntry(
  String url,
  String sha1,
  String name,
  String version,
  int size,
  String fileName
) {
}
