package io.github.nh1980mg.witchhat.aibuilder.client;

import io.github.nh1980mg.witchhat.aibuilder.network.PreviewPayload;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewState;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;

public final class AiBuilderClient implements ClientModInitializer {
    private static final PreviewState PREVIEW = new PreviewState(PreviewPayload.MAX_PLACEMENTS);

    @Override
    public void onInitializeClient() {
        ClientPlayNetworking.registerGlobalReceiver(
                PreviewPayload.TYPE,
                (payload, context) -> context.client().execute(() -> PREVIEW.replace(
                        payload.planId(),
                        payload.dimension(),
                        payload.expiresAt(),
                        payload.placements())));
        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> PREVIEW.clear());
        WorldRenderEvents.AFTER_ENTITIES.register(
                context -> PreviewRenderer.render(context, PREVIEW));
    }
}
