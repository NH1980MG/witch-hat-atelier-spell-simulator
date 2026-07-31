package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.WitchRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.Witch;

public class BrimcapBossRenderer extends WitchRenderer {
    private static final ResourceLocation TEXTURE = ResourceLocation.fromNamespaceAndPath(
            WitchHatMagicMod.MOD_ID, "textures/entity/brimcap_boss.png");

    public BrimcapBossRenderer(EntityRendererProvider.Context context) {
        super(context);
    }

    @Override
    public ResourceLocation getTextureLocation(Witch entity) {
        return TEXTURE;
    }
}
