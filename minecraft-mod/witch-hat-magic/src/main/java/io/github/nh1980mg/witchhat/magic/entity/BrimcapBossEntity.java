package io.github.nh1980mg.witchhat.magic.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.level.Level;

/** The Brimmed Cap boss awaiting in her lair — scaled-wolf cloak, taller, far stronger. */
public class BrimcapBossEntity extends Witch {
    public BrimcapBossEntity(EntityType<? extends Witch> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createBossAttributes() {
        return Witch.createAttributes()
                .add(Attributes.MAX_HEALTH, 120.0)
                .add(Attributes.SCALE, 1.35)
                .add(Attributes.MOVEMENT_SPEED, 0.28)
                .add(Attributes.ATTACK_DAMAGE, 6.0)
                .add(Attributes.FOLLOW_RANGE, 48.0);
    }
}
