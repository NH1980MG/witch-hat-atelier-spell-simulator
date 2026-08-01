package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;

/** Player-model renderer for the Brimmed Cap witches (scouts, sisters, matriarch). */
public class BrimcapWitchRenderer<T extends net.minecraft.world.entity.Mob>
        extends HumanoidMobRenderer<T, PointedHatModel<T>> {
    private final ResourceLocation texture;

    public BrimcapWitchRenderer(EntityRendererProvider.Context context, String textureName) {
        super(context, new PointedHatModel<>(
                context.bakeLayer(MagicModelLayers.BRIMCAP_WITCH)), 0.5F);
        texture = ResourceLocation.fromNamespaceAndPath(
                WitchHatMagicMod.MOD_ID, "textures/entity/" + textureName + ".png");
    }

    @Override
    public ResourceLocation getTextureLocation(T entity) {
        return texture;
    }
}
