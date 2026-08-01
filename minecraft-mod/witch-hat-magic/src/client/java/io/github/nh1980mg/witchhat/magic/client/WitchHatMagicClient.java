package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.block.AbstractCanvasBlock;
import io.github.nh1980mg.witchhat.magic.network.CanvasActivationResultPayload;
import io.github.nh1980mg.witchhat.magic.network.OpenCanvasPayload;
import io.github.nh1980mg.witchhat.magic.network.OpenNotebookPayload;
import io.github.nh1980mg.witchhat.magic.network.SpellActivationResultPayload;
import io.github.nh1980mg.witchhat.magic.network.SyncCanvasPayload;
import io.github.nh1980mg.witchhat.magic.network.SyncNotebookPayload;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;

public final class WitchHatMagicClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        net.fabricmc.fabric.api.client.rendering.v1.EntityModelLayerRegistry.registerModelLayer(
                MagicModelLayers.BRIMCAP_WITCH, PointedHatModel::createWitchLayer);
        net.fabricmc.fabric.api.client.rendering.v1.EntityModelLayerRegistry.registerModelLayer(
                MagicModelLayers.SEAL_KNIGHT, PointedHatModel::createKnightLayer);
        net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry.register(
                io.github.nh1980mg.witchhat.magic.registry.MagicEntities.BRIMCAP_WITCH,
                context -> new BrimcapWitchRenderer<>(context, "brimcap_witch"));
        net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry.register(
                io.github.nh1980mg.witchhat.magic.registry.MagicEntities.BRIMCAP_BOSS,
                context -> new BrimcapWitchRenderer<>(context, "brimcap_boss"));
        net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry.register(
                io.github.nh1980mg.witchhat.magic.registry.MagicEntities.BRIMCAP_ALLY,
                context -> new BrimcapWitchRenderer<>(context, "brimcap_witch"));
        net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry.register(
                io.github.nh1980mg.witchhat.magic.registry.MagicEntities.SEAL_KNIGHT,
                SealKnightRenderer::new);

        ClientPlayNetworking.registerGlobalReceiver(
                OpenNotebookPayload.TYPE,
                (payload, context) -> context.client().setScreen(
                        new MagicNotebookScreen(
                                payload.hand(), payload.data(), payload.brotherhood())));

        ClientPlayNetworking.registerGlobalReceiver(
                SyncNotebookPayload.TYPE,
                (payload, context) -> {
                    if (context.client().screen instanceof MagicNotebookScreen screen
                            && screen.transportKey().equals(payload.hand())) {
                        screen.acceptAuthoritative(payload.data());
                    }
                });

        ClientPlayNetworking.registerGlobalReceiver(
                SpellActivationResultPayload.TYPE,
                (payload, context) -> {
                    if (payload.status() == ActivationStatus.SUCCESS
                            && context.client().player != null) {
                        showSuccessMessage(context,
                                ActivationFeedback.localizedSigils(
                                        payload.sigilIds(), isFrench(context)),
                                payload.power(), payload.durationTicks(), null);
                    }
                    if (context.client().screen instanceof MagicNotebookScreen screen) {
                        screen.acceptActivationResult(payload);
                    }
                });

        ClientPlayNetworking.registerGlobalReceiver(
                OpenCanvasPayload.TYPE,
                (payload, context) -> context.client().setScreen(
                        new MagicNotebookScreen(
                                new CanvasTransport(
                                        payload.pos(), canvasSupportAt(context, payload.pos())),
                                payload.data())));

        ClientPlayNetworking.registerGlobalReceiver(
                SyncCanvasPayload.TYPE,
                (payload, context) -> {
                    if (context.client().screen instanceof MagicNotebookScreen screen
                            && screen.transportKey().equals(payload.pos())) {
                        screen.acceptAuthoritative(payload.data());
                    }
                });

        ClientPlayNetworking.registerGlobalReceiver(
                io.github.nh1980mg.witchhat.magic.network.OpenBodyPayload.TYPE,
                (payload, context) -> context.client().setScreen(
                        new BodyPaintScreen(payload.tattoos())));

        ClientPlayNetworking.registerGlobalReceiver(
                CanvasActivationResultPayload.TYPE,
                (payload, context) -> {
                    if (payload.status() == ActivationStatus.SUCCESS
                            && context.client().player != null) {
                        showSuccessMessage(context,
                                ActivationFeedback.localizedSigils(
                                        payload.sigilIds(), isFrench(context)),
                                payload.power(), payload.durationTicks(),
                                payload.remainingActivations());
                    }
                    if (context.client().screen instanceof MagicNotebookScreen screen) {
                        screen.acceptActivationResult(payload);
                    }
                });
    }

    private static boolean isFrench(ClientPlayNetworking.Context context) {
        return context.client().getLanguageManager().getSelected().equals("fr_fr");
    }

    private static CircleSupport canvasSupportAt(ClientPlayNetworking.Context context, BlockPos pos) {
        if (context.client().level != null
                && context.client().level.getBlockState(pos).getBlock()
                        instanceof AbstractCanvasBlock canvasBlock) {
            return canvasBlock.support();
        }
        return CircleSupport.CANVAS_SQUARE;
    }

    private static void showSuccessMessage(
            ClientPlayNetworking.Context context,
            String sigils,
            double power,
            int durationTicks,
            Integer remainingActivations) {
        String powerText = String.format(java.util.Locale.ROOT, "%.1f", power);
        Component message = remainingActivations == null
                ? Component.translatable(
                        "screen.witch_hat_magic.activation.success",
                        sigils, powerText, durationTicks / 20)
                : Component.translatable(
                        "screen.witch_hat_magic.activation.canvas_success",
                        sigils, powerText, durationTicks / 20, remainingActivations);
        context.client().player.displayClientMessage(message, true);
    }
}
