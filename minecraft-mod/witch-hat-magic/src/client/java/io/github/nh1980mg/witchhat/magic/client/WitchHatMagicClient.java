package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.network.OpenNotebookPayload;
import io.github.nh1980mg.witchhat.magic.network.SpellActivationResultPayload;
import io.github.nh1980mg.witchhat.magic.network.SyncNotebookPayload;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.network.chat.Component;

public final class WitchHatMagicClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        ClientPlayNetworking.registerGlobalReceiver(
                OpenNotebookPayload.TYPE,
                (payload, context) -> context.client().setScreen(
                        new MagicNotebookScreen(payload.hand(), payload.data())));

        ClientPlayNetworking.registerGlobalReceiver(
                SyncNotebookPayload.TYPE,
                (payload, context) -> {
                    if (context.client().screen instanceof MagicNotebookScreen screen
                            && screen.hand() == payload.hand()) {
                        screen.acceptAuthoritative(payload.data());
                    }
                });

        ClientPlayNetworking.registerGlobalReceiver(
                SpellActivationResultPayload.TYPE,
                (payload, context) -> {
                    if (payload.status() == ActivationStatus.SUCCESS
                            && context.client().player != null) {
                        boolean french = context.client()
                                .getLanguageManager()
                                .getSelected()
                                .equals("fr_fr");
                        String sigils = ActivationFeedback.localizedSigils(
                                payload.sigilIds(), french);
                        context.client().player.displayClientMessage(
                                Component.translatable(
                                        ActivationFeedback.activationKey(payload.status()),
                                        sigils),
                                true);
                    }
                    if (context.client().screen instanceof MagicNotebookScreen screen) {
                        screen.acceptActivationResult(payload);
                    }
                });
    }
}
