package io.github.nh1980mg.witchhat.aibuilder.fabric;

import io.github.nh1980mg.witchhat.aibuilder.build.BuildManager;
import io.github.nh1980mg.witchhat.aibuilder.build.TransactionStore;
import io.github.nh1980mg.witchhat.aibuilder.config.AiBuilderConfig;
import io.github.nh1980mg.witchhat.aibuilder.config.ConfigRepository;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanLimits;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanParser;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanRepository;
import java.nio.file.Path;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.MinecraftServer;

public record AiBuilderRuntime(
        AiBuilderConfig config,
        PlanLimits planLimits,
        PlanRepository plans,
        PlanResolver resolver,
        BuildManager builds,
        PreviewPublisher previews) {
    public static AiBuilderRuntime create(MinecraftServer server, PreviewPublisher previews) {
        Path root = FabricLoader.getInstance()
                .getConfigDir()
                .resolve("witchhat-ai-builder");
        AiBuilderConfig config = new ConfigRepository(root.resolve("config.json")).load();
        MinecraftWorldMutationPort world = new MinecraftWorldMutationPort(
                server,
                config.protectedBlocks());
        return new AiBuilderRuntime(
                config,
                new PlanLimits(config.maxBlocks(), config.maxDimension()),
                new PlanRepository(root.resolve("plans"), new PlanParser()),
                new PlanResolver(config),
                new BuildManager(world, new TransactionStore(root.resolve("history/latest.json"))),
                previews);
    }
}
