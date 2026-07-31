package io.github.nh1980mg.witchhat.magic.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.level.Level;

/** A rank-and-file Brimmed Cap witch — hostile spellcaster of the brotherhood. */
public class BrimcapWitchEntity extends Witch {
    public BrimcapWitchEntity(EntityType<? extends Witch> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createBrimcapAttributes() {
        return Witch.createAttributes();
    }
}
