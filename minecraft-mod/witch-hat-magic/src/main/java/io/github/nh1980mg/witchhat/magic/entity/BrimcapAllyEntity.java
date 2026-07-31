package io.github.nh1980mg.witchhat.magic.entity;

import java.util.UUID;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

/**
 * A Brimmed Cap witch sworn to a brotherhood member: follows her member,
 * never hurts them, and answers their enemies with her own spells.
 */
public class BrimcapAllyEntity extends BrimcapWitchEntity {
    private UUID ownerId;

    public BrimcapAllyEntity(EntityType<? extends Witch> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAllyAttributes() {
        return BrimcapWitchEntity.createBrimcapAttributes()
                .add(Attributes.MAX_HEALTH, 40.0)
                .add(Attributes.FOLLOW_RANGE, 32.0);
    }

    public UUID ownerId() {
        return ownerId;
    }

    public void setOwnerId(UUID id) {
        ownerId = id;
    }

    @Override
    public boolean isAlliedTo(net.minecraft.world.entity.Entity other) {
        if (other instanceof Player player && player.getUUID().equals(ownerId)) {
            return true;
        }
        if (other instanceof BrimcapAllyEntity ally && ally.ownerId != null
                && ally.ownerId.equals(ownerId)) {
            return true;
        }
        return super.isAlliedTo(other);
    }

    @Override
    protected void customServerAiStep() {
        super.customServerAiStep();
        if (ownerId == null || tickCount % 20 != 0) {
            return;
        }
        Player owner = level().getPlayerByUUID(ownerId);
        if (owner == null) {
            return;
        }
        // Never target our member; answer whoever hurt them.
        if (getTarget() == owner) {
            setTarget(null);
        }
        if (getTarget() == null && owner.getLastHurtByMob() != null
                && owner.getLastHurtByMob().isAlive()
                && !(owner.getLastHurtByMob() instanceof BrimcapAllyEntity)) {
            setTarget(owner.getLastHurtByMob());
        }
        if (distanceToSqr(owner) > 64.0 && getTarget() == null) {
            getNavigation().moveTo(owner, 1.1);
        }
    }

    @Override
    public void addAdditionalSaveData(CompoundTag tag) {
        super.addAdditionalSaveData(tag);
        if (ownerId != null) {
            tag.putUUID("OwnerId", ownerId);
        }
    }

    @Override
    public void readAdditionalSaveData(CompoundTag tag) {
        super.readAdditionalSaveData(tag);
        if (tag.hasUUID("OwnerId")) {
            ownerId = tag.getUUID("OwnerId");
        }
    }
}
