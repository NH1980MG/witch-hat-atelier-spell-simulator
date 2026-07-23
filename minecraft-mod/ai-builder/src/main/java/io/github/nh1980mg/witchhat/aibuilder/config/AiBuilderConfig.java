package io.github.nh1980mg.witchhat.aibuilder.config;

import java.util.Set;

public record AiBuilderConfig(
        boolean enabledOutsideDevelopment,
        int maxBlocks,
        int maxDimension,
        int maxDistance,
        int blocksPerTick,
        Set<String> protectedBlocks) {
    public AiBuilderConfig {
        protectedBlocks = Set.copyOf(protectedBlocks);
        if (maxBlocks < 1 || maxDimension < 1 || maxDistance < 1 || blocksPerTick < 1) {
            throw new IllegalArgumentException("AI Builder limits must be positive");
        }
    }

    public static AiBuilderConfig defaults() {
        return new AiBuilderConfig(
                false,
                50_000,
                256,
                64,
                128,
                Set.of(
                        "minecraft:bedrock",
                        "minecraft:end_portal",
                        "minecraft:end_portal_frame"));
    }
}
