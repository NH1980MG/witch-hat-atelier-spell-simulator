package io.github.nh1980mg.witchhat.magic.entity;

import io.github.nh1980mg.witchhat.magic.spell.WitchSpells;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.level.Level;

/** A rank-and-file Brimmed Cap witch — hostile spellcaster of the brotherhood. */
public class BrimcapWitchEntity extends Witch {
    private int castCooldown;

    public BrimcapWitchEntity(EntityType<? extends Witch> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createBrimcapAttributes() {
        return Witch.createAttributes();
    }

    /** Casts from the scout arsenal instead of throwing potions. */
    @Override
    public void performRangedAttack(LivingEntity target, float distanceFactor) {
        if (castCooldown <= 0) {
            WitchSpells.Spell spell = WitchSpells.SCOUT_SPELLS.get(
                    random.nextInt(WitchSpells.SCOUT_SPELLS.size()));
            WitchSpells.cast(this, target, spell);
            castCooldown = spell.cooldownTicks();
        }
    }

    @Override
    protected void customServerAiStep() {
        super.customServerAiStep();
        if (castCooldown > 0) {
            castCooldown--;
        }
    }
}
