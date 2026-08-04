package dev.sogki.rpmanager.server.wildtrainer;

import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;

import java.util.ArrayList;

/**
 * Loads {@link WildTrainerFileConfig} from YAML. Used when {@code trainers.yml} is present.
 */
public final class WildTrainerConfigLoader {
  private WildTrainerConfigLoader() {
  }

  public static WildTrainerFileConfig loadYaml(String raw) {
    if (raw == null || raw.isBlank()) {
      return WildTrainerFileConfig.empty();
    }
    LoaderOptions options = new LoaderOptions();
    options.setCodePointLimit(8 * 1024 * 1024);
    Yaml yaml = new Yaml(new Constructor(WildTrainerFileConfig.class, options));
    Object loaded = yaml.load(raw);
    if (!(loaded instanceof WildTrainerFileConfig cfg)) {
      return WildTrainerFileConfig.empty();
    }
    if (cfg.trainers == null) {
      cfg.trainers = new ArrayList<>();
    }
    return cfg;
  }
}
