package dev.sogki.rpmanager.model;

public record PackEntry(
  String url,
  String sha1,
  String name,
  String version,
  String description,
  int size,
  String fileName
) {
}
