package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.network.OpenNotebookPayload;
import io.github.nh1980mg.witchhat.magic.network.SyncNotebookPayload;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;

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
    }
}
