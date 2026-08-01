package io.github.nh1980mg.witchhat.magic.entity;

import io.github.nh1980mg.witchhat.magic.spell.WitchSpells;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.level.Level;

/** The Brimmed Cap boss awaiting in her lair — scaled-wolf cloak, taller, far stronger. */
public class BrimcapBossEntity extends Witch {
    private final ServerBossEvent bossBar = new ServerBossEvent(
            Component.translatable("entity.witch_hat_magic.brimcap_boss"),
            BossEvent.BossBarColor.PURPLE,
            BossEvent.BossBarOverlay.PROGRESS);
    private int castCooldown;
    private int spellIndex;

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

    /** Casts from the matriarch's arsenal instead of throwing potions. */
    @Override
    public void performRangedAttack(LivingEntity target, float distanceFactor) {
        if (castCooldown <= 0) {
            WitchSpells.Spell spell = WitchSpells.BOSS_SPELLS.get(
                    spellIndex++ % WitchSpells.BOSS_SPELLS.size());
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
        bossBar.setProgress(getHealth() / getMaxHealth());
    }

    @Override
    public void startSeenByPlayer(ServerPlayer player) {
        super.startSeenByPlayer(player);
        bossBar.addPlayer(player);
    }

    @Override
    public void stopSeenByPlayer(ServerPlayer player) {
        super.stopSeenByPlayer(player);
        bossBar.removePlayer(player);
    }
}
