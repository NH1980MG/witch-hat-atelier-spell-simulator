package io.github.nh1980mg.witchhat.aibuilder.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ConfigRepositoryTest {
    @TempDir
    Path tempDir;

    @Test
    void createsAndLoadsDefaults() {
        Path file = tempDir.resolve("config.json");
        AiBuilderConfig loaded = new ConfigRepository(file).load();

        assertEquals(AiBuilderConfig.defaults(), loaded);
        org.junit.jupiter.api.Assertions.assertTrue(Files.isRegularFile(file));
    }

    @Test
    void malformedOrUnsafeConfigFallsBackToDefaults() throws Exception {
        Path malformed = tempDir.resolve("malformed.json");
        Files.writeString(malformed, "{");
        assertEquals(AiBuilderConfig.defaults(), new ConfigRepository(malformed).load());

        Path unsafe = tempDir.resolve("unsafe.json");
        Files.writeString(unsafe, """
                {
                  "enabledOutsideDevelopment": true,
                  "maxBlocks": -1,
                  "maxDimension": 0,
                  "maxDistance": -2,
                  "blocksPerTick": 0,
                  "protectedBlocks": []
                }
                """);
        assertEquals(AiBuilderConfig.defaults(), new ConfigRepository(unsafe).load());
    }
}
