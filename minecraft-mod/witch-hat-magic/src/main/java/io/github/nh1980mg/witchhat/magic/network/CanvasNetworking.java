package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.blockentity.CanvasBlockEntity;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.CanvasActivationService;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.block.entity.BlockEntity;

public final class CanvasNetworking {
    private static final double MAX_INTERACTION_DISTANCE_SQR = 64.0;

    private CanvasNetworking() {
    }

    public static void registerPayloads() {
        PayloadTypeRegistry.playS2C().register(OpenCanvasPayload.TYPE, OpenCanvasPayload.CODEC);
        PayloadTypeRegistry.playS2C().register(SyncCanvasPayload.TYPE, SyncCanvasPayload.CODEC);
        PayloadTypeRegistry.playS2C().register(
                CanvasActivationResultPayload.TYPE, CanvasActivationResultPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(SaveCanvasPayload.TYPE, SaveCanvasPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(
                ActivateCanvasPayload.TYPE, ActivateCanvasPayload.CODEC);
    }

    public static void registerServerReceivers() {
        ServerPlayNetworking.registerGlobalReceiver(
                SaveCanvasPayload.TYPE,
                CanvasNetworking::handleSave);
        ServerPlayNetworking.registerGlobalReceiver(
                ActivateCanvasPayload.TYPE,
                CanvasNetworking::handleActivation);
    }

    public static void open(ServerPlayer player, BlockPos pos) {
        BlockEntity blockEntity = player.serverLevel().getBlockEntity(pos);
        if (blockEntity instanceof CanvasBlockEntity canvas) {
            ServerPlayNetworking.send(player, new OpenCanvasPayload(pos, canvas.drawing()));
        }
    }

    private static CanvasBlockEntity canvasAt(ServerPlayer player, BlockPos pos) {
        if (player.distanceToSqr(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5)
                > MAX_INTERACTION_DISTANCE_SQR) {
            return null;
        }
        BlockEntity blockEntity = player.serverLevel().getBlockEntity(pos);
        return blockEntity instanceof CanvasBlockEntity canvas ? canvas : null;
    }

    private static void handleSave(
            SaveCanvasPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        CanvasBlockEntity canvas = canvasAt(player, payload.pos());
        if (canvas == null) {
            return;
        }
        try {
            NotebookData validated = NotebookLimits.validate(payload.data());
            if (validated.pages().size() != 1) {
                throw new IllegalArgumentException("A canvas holds exactly one page");
            }
            canvas.setDrawing(validated);
            ServerPlayNetworking.send(
                    player, new SyncCanvasPayload(payload.pos(), validated));
        } catch (IllegalArgumentException exception) {
            ServerPlayNetworking.send(
                    player, new SyncCanvasPayload(payload.pos(), canvas.drawing()));
        }
    }

    private static void handleActivation(
            ActivateCanvasPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        CanvasBlockEntity canvas = canvasAt(player, payload.pos());
        if (canvas == null) {
            ServerPlayNetworking.send(player, CanvasActivationResultPayload.from(
                    payload.pos(),
                    ActivationResult.failure(ActivationStatus.CANVAS_NOT_FOUND, payload.pageId()),
                    0));
            return;
        }
        CanvasActivationService.CanvasActivationOutcome outcome =
                CanvasActivationService.evaluate(player.serverLevel(), payload.pos(), payload.pageId());
        ActivationResult result = outcome.result();
        boolean manifestationAllowed = result.status() != ActivationStatus.SUCCESS
                || ActivationRateLimits.tryAcquire(player);
        if (manifestationAllowed && result.status() == ActivationStatus.SUCCESS) {
            CanvasActivationService.commit(player.serverLevel(), payload.pos(), result, canvas, player);
        } else if (result.status() == ActivationStatus.SUCCESS) {
            result = ActivationResult.failure(ActivationStatus.COOLDOWN, result.pageId());
        }
        ServerPlayNetworking.send(player, CanvasActivationResultPayload.from(
                payload.pos(), result, canvas.remainingActivations()));
    }
}
