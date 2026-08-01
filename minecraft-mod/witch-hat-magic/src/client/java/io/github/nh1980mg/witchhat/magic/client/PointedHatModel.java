package io.github.nh1980mg.witchhat.magic.client;

import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.builders.CubeDeformation;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;

/**
 * Player-proportioned body topped with the manga's pointed hat, a hanging
 * cape, and (for Seal Knights) a winged helm. The texture is a 64x128 skin:
 * standard player layout on top, hat/cape UV space below (y64+).
 */
public class PointedHatModel<T extends LivingEntity> extends HumanoidModel<T> {
    public PointedHatModel(ModelPart root) {
        super(root);
    }

    public static LayerDefinition createWitchLayer() {
        return createLayer(false);
    }

    public static LayerDefinition createKnightLayer() {
        return createLayer(true);
    }

    private static LayerDefinition createLayer(boolean wings) {
        MeshDefinition mesh = HumanoidModel.createMesh(CubeDeformation.NONE, 0.0F);
        PartDefinition root = mesh.getRoot();
        PartDefinition head = root.getChild("head");
        head.addOrReplaceChild("pointed_hat", CubeListBuilder.create()
                        .texOffs(0, 64).addBox(-6.0F, -2.0F, -6.0F, 12, 2, 12)
                        .texOffs(0, 78).addBox(-4.0F, -6.0F, -4.0F, 8, 4, 8)
                        .texOffs(0, 90).addBox(-3.0F, -10.0F, -3.0F, 6, 4, 6)
                        .texOffs(0, 102).addBox(-2.0F, -13.0F, -2.0F, 4, 3, 4)
                        .texOffs(0, 112).addBox(-1.0F, -16.0F, -1.0F, 2, 3, 2),
                PartPose.ZERO);
        if (wings) {
            head.addOrReplaceChild("wing_left", CubeListBuilder.create()
                            .texOffs(48, 64).addBox(4.0F, -10.0F, -1.0F, 2, 6, 2),
                    PartPose.ZERO);
            head.addOrReplaceChild("wing_right", CubeListBuilder.create()
                            .texOffs(56, 64).addBox(-6.0F, -10.0F, -1.0F, 2, 6, 2),
                    PartPose.ZERO);
        }
        root.getChild("body").addOrReplaceChild("cape", CubeListBuilder.create()
                        .texOffs(0, 116).addBox(-7.0F, 0.0F, 2.0F, 14, 10, 1),
                PartPose.ZERO);
        return LayerDefinition.create(mesh, 64, 128);
    }

    public static ModelLayerLocation layer(String name) {
        return new ModelLayerLocation(
                ResourceLocation.fromNamespaceAndPath(
                        io.github.nh1980mg.witchhat.magic.WitchHatMagicMod.MOD_ID, name),
                "main");
    }
}
