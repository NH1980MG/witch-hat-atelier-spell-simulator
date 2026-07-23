package io.github.nh1980mg.witchhat.aibuilder;

import io.github.nh1980mg.witchhat.aibuilder.command.AiBuilderCommands;
import io.github.nh1980mg.witchhat.aibuilder.fabric.AiBuilderRuntime;
import io.github.nh1980mg.witchhat.aibuilder.fabric.PreviewPublisher;
import java.util.IdentityHashMap;
import java.util.Map;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;

public final class AiBuilderMod implements ModInitializer {
    public static final String MOD_ID = "witchhat_ai_builder";
    private static final Map<MinecraftServer, AiBuilderRuntime> RUNTIMES = new IdentityHashMap<>();

    @Override
    public void onInitialize() {
        CommandRegistrationCallback.EVENT.register(
                (dispatcher, registryAccess, environment) ->
                        AiBuilderCommands.register(dispatcher, AiBuilderMod::runtime));
        ServerTickEvents.END_SERVER_TICK.register(server -> runtime(server).builds().tick());
        ServerLifecycleEvents.SERVER_STOPPED.register(RUNTIMES::remove);
    }

    private static synchronized AiBuilderRuntime runtime(MinecraftServer server) {
        return RUNTIMES.computeIfAbsent(
                server,
                current -> AiBuilderRuntime.create(current, PreviewPublisher.noop()));
    }
}
