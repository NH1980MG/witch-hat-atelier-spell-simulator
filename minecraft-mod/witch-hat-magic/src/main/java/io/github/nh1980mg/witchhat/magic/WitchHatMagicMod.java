package io.github.nh1980mg.witchhat.magic;

import io.github.nh1980mg.witchhat.magic.network.NotebookNetworking;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import io.github.nh1980mg.witchhat.magic.spell.SpellManifestationService;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;

public final class WitchHatMagicMod implements ModInitializer {
    public static final String MOD_ID = "witch_hat_magic";

    @Override
    public void onInitialize() {
        MagicComponents.register();
        MagicItems.register();
        NotebookNetworking.registerPayloads();
        NotebookNetworking.registerServerReceivers();
        ServerTickEvents.END_SERVER_TICK.register(
                server -> SpellManifestationService.scheduler().tick());
    }
}
