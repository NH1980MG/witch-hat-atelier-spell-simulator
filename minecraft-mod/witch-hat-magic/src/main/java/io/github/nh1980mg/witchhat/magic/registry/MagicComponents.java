package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import net.minecraft.core.Registry;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;

public final class MagicComponents {
    public static final DataComponentType<NotebookData> NOTEBOOK_DATA = Registry.register(
            BuiltInRegistries.DATA_COMPONENT_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "notebook_data"),
            DataComponentType.<NotebookData>builder()
                    .persistent(NotebookData.CODEC)
                    .networkSynchronized(NotebookData.STREAM_CODEC)
                    .build());

    public static final DataComponentType<NotebookPage> PAGE_DATA = Registry.register(
            BuiltInRegistries.DATA_COMPONENT_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "page_data"),
            DataComponentType.<NotebookPage>builder()
                    .persistent(NotebookPage.CODEC)
                    .networkSynchronized(NotebookPage.STREAM_CODEC)
                    .build());

    private MagicComponents() {
    }

    public static void register() {
        // Loading this class performs the registry insertion.
    }
}
