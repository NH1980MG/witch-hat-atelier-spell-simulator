package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapBossEntity;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapWitchEntity;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;

public final class MagicEntities {
    public static final EntityType<BrimcapWitchEntity> BRIMCAP_WITCH = Registry.register(
            BuiltInRegistries.ENTITY_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "brimcap_witch"),
            EntityType.Builder.of(BrimcapWitchEntity::new, MobCategory.MONSTER)
                    .sized(0.6F, 1.95F)
                    .build(ResourceLocation.fromNamespaceAndPath(
                            WitchHatMagicMod.MOD_ID, "brimcap_witch").toString()));

    public static final EntityType<BrimcapBossEntity> BRIMCAP_BOSS = Registry.register(
            BuiltInRegistries.ENTITY_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "brimcap_boss"),
            EntityType.Builder.of(BrimcapBossEntity::new, MobCategory.MONSTER)
                    .sized(0.7F, 2.2F)
                    .build(ResourceLocation.fromNamespaceAndPath(
                            WitchHatMagicMod.MOD_ID, "brimcap_boss").toString()));

    private MagicEntities() {
    }

    public static void register() {
        FabricDefaultAttributeRegistry.register(
                BRIMCAP_WITCH, BrimcapWitchEntity.createBrimcapAttributes());
        FabricDefaultAttributeRegistry.register(
                BRIMCAP_BOSS, BrimcapBossEntity.createBossAttributes());
    }
}
