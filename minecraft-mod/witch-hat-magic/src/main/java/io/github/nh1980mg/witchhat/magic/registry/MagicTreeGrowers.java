package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import java.util.Optional;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.level.block.grower.TreeGrower;
import net.minecraft.world.level.levelgen.feature.ConfiguredFeature;

public final class MagicTreeGrowers {
    public static final ResourceKey<ConfiguredFeature<?, ?>> INKWOOD_TREE = ResourceKey.create(
            Registries.CONFIGURED_FEATURE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "inkwood_tree"));

    public static final TreeGrower INKWOOD = new TreeGrower(
            "inkwood",
            Optional.empty(),
            Optional.of(INKWOOD_TREE),
            Optional.empty());

    private MagicTreeGrowers() {
    }
}
