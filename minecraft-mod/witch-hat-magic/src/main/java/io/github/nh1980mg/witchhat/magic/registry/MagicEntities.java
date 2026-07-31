package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapAllyEntity;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapBossEntity;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapWitchEntity;
import io.github.nh1980mg.witchhat.magic.entity.SealKnightEntity;
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

    public static final EntityType<BrimcapAllyEntity> BRIMCAP_ALLY = Registry.register(
            BuiltInRegistries.ENTITY_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "brimcap_ally"),
            EntityType.Builder.of(BrimcapAllyEntity::new, MobCategory.CREATURE)
                    .sized(0.6F, 1.95F)
                    .build(ResourceLocation.fromNamespaceAndPath(
                            WitchHatMagicMod.MOD_ID, "brimcap_ally").toString()));

    public static final EntityType<SealKnightEntity> SEAL_KNIGHT = Registry.register(
            BuiltInRegistries.ENTITY_TYPE,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "seal_knight"),
            EntityType.Builder.of(SealKnightEntity::new, MobCategory.MONSTER)
                    .sized(0.6F, 1.95F)
                    .build(ResourceLocation.fromNamespaceAndPath(
                            WitchHatMagicMod.MOD_ID, "seal_knight").toString()));

    private MagicEntities() {
    }

    public static void register() {
        FabricDefaultAttributeRegistry.register(
                BRIMCAP_WITCH, BrimcapWitchEntity.createBrimcapAttributes());
        FabricDefaultAttributeRegistry.register(
                BRIMCAP_BOSS, BrimcapBossEntity.createBossAttributes());
        FabricDefaultAttributeRegistry.register(
                BRIMCAP_ALLY, BrimcapAllyEntity.createAllyAttributes());
        FabricDefaultAttributeRegistry.register(
                SEAL_KNIGHT, SealKnightEntity.createKnightAttributes());
    }
}
