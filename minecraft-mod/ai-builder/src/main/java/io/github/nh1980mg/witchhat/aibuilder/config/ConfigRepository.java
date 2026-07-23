package io.github.nh1980mg.witchhat.aibuilder.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;

public final class ConfigRepository {
    private final Path file;
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public ConfigRepository(Path file) {
        this.file = file.toAbsolutePath().normalize();
    }

    public AiBuilderConfig load() {
        if (!Files.isRegularFile(file)) {
            AiBuilderConfig defaults = AiBuilderConfig.defaults();
            save(defaults);
            return defaults;
        }
        try (Reader reader = Files.newBufferedReader(file)) {
            AiBuilderConfig loaded = gson.fromJson(reader, AiBuilderConfig.class);
            if (loaded == null) {
                return AiBuilderConfig.defaults();
            }
            return new AiBuilderConfig(
                    loaded.enabledOutsideDevelopment(),
                    loaded.maxBlocks(),
                    loaded.maxDimension(),
                    loaded.maxDistance(),
                    loaded.blocksPerTick(),
                    loaded.protectedBlocks() == null
                            ? AiBuilderConfig.defaults().protectedBlocks()
                            : loaded.protectedBlocks());
        } catch (Exception ignored) {
            return AiBuilderConfig.defaults();
        }
    }

    private void save(AiBuilderConfig config) {
        try {
            Files.createDirectories(file.getParent());
            try (Writer writer = Files.newBufferedWriter(file)) {
                gson.toJson(config, writer);
            }
        } catch (Exception error) {
            throw new IllegalStateException("Unable to create AI Builder config", error);
        }
    }
}
