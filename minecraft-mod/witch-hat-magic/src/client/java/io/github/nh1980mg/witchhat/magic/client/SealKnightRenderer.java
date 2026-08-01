package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.entity.SealKnightEntity;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.resources.ResourceLocation;

/** Seal Knight renderer — picks one of three skins (two squires, one knightess). */
public class SealKnightRenderer
        extends HumanoidMobRenderer<SealKnightEntity, PointedHatModel<SealKnightEntity>> {
    private static final ResourceLocation[] TEXTURES = {
        ResourceLocation.fromNamespaceAndPath(
                WitchHatMagicMod.MOD_ID, "textures/entity/seal_knight_1.png"),
        ResourceLocation.fromNamespaceAndPath(
                WitchHatMagicMod.MOD_ID, "textures/entity/seal_knight_2.png"),
        ResourceLocation.fromNamespaceAndPath(
                WitchHatMagicMod.MOD_ID, "textures/entity/seal_knight_3.png"),
    };

    public SealKnightRenderer(EntityRendererProvider.Context context) {
        super(context, new PointedHatModel<>(
                context.bakeLayer(MagicModelLayers.SEAL_KNIGHT)), 0.5F);
    }

    @Override
    public ResourceLocation getTextureLocation(SealKnightEntity entity) {
        return TEXTURES[Math.abs(entity.getVariant()) % TEXTURES.length];
    }
}
