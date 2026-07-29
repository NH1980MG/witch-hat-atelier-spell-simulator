package io.github.nh1980mg.witchhat.magic;

import io.github.nh1980mg.witchhat.magic.network.NotebookNetworking;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import net.fabricmc.api.ModInitializer;

public final class WitchHatMagicMod implements ModInitializer {
    public static final String MOD_ID = "witch_hat_magic";

    @Override
    public void onInitialize() {
        MagicComponents.register();
        MagicItems.register();
        NotebookNetworking.registerPayloads();
        NotebookNetworking.registerServerReceivers();
    }
}
