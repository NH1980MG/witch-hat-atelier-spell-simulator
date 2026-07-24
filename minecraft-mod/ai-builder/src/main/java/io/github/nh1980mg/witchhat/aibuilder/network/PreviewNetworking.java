package io.github.nh1980mg.witchhat.aibuilder.network;

import io.github.nh1980mg.witchhat.aibuilder.build.ResolvedPlacement;
import io.github.nh1980mg.witchhat.aibuilder.fabric.MinecraftWorldMutationPort;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewPlacement;
import java.util.List;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.server.level.ServerPlayer;

public final class PreviewNetworking {
    private PreviewNetworking() {
    }

    public static void registerPayload() {
        PayloadTypeRegistry.playS2C().register(PreviewPayload.TYPE, PreviewPayload.CODEC);
    }

    public static void send(
            ServerPlayer player,
            String planId,
            List<ResolvedPlacement> placements,
            MinecraftWorldMutationPort world) {
        if (!ServerPlayNetworking.canSend(player, PreviewPayload.TYPE)) {
            throw new IllegalStateException("The player client does not support AI Builder previews");
        }
        List<PreviewPlacement> preview = placements.stream()
                .map(placement -> new PreviewPlacement(
                        placement.x(),
                        placement.y(),
                        placement.z(),
                        world.previewStatus(placement)))
                .toList();
        long expiresAt = player.serverLevel().getGameTime() + 20L * 30L;
        ServerPlayNetworking.send(
                player,
                new PreviewPayload(
                        planId,
                        player.serverLevel().dimension().location().toString(),
                        expiresAt,
                        preview));
    }
}
