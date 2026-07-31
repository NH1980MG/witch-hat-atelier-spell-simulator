package io.github.nh1980mg.witchhat.magic.quest;

import io.github.nh1980mg.witchhat.magic.registry.MagicEntities;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ManifestationPlan;
import io.github.nh1980mg.witchhat.magic.spell.SpellManifestationService;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.WeakHashMap;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;

/**
 * The Brimmed Cap brotherhood: fill a vial with your own blood while hurt,
 * brew it into blood ink, and you are one of them — scouts become allies
 * that follow you and echo your spells, and the Seal Knights take their
 * place as your hunters.
 */
public final class BrotherhoodService {
    private static final int HURT_WINDOW_TICKS = 60;
    private static final double ALLY_MIMIC_RANGE = 24.0;

    private static final Map<UUID, Integer> lastHurtTick = new WeakHashMap<>();

    private BrotherhoodService() {}

    public static void onPlayerHurt(ServerPlayer player, DamageSource source, float amount) {
        lastHurtTick.put(player.getUUID(), player.tickCount);
    }

    public static boolean isMember(ServerPlayer player) {
        MinecraftServer server = Objects.requireNonNull(player.getServer());
        return QuestWorldState.get(server).isBrotherhoodMember(player.getUUID());
    }

    /** Empty vial + recent pain = a vial of your own blood. */
    public static boolean tryFillBloodVial(ServerPlayer player, InteractionHand hand) {
        Integer hurtTick = lastHurtTick.get(player.getUUID());
        if (hurtTick == null || player.tickCount - hurtTick > HURT_WINDOW_TICKS) {
            player.sendSystemMessage(Component.translatable(
                            "quest.witch_hat_magic.blood_vial_not_hurt")
                    .withStyle(ChatFormatting.GRAY));
            return false;
        }
        ItemStack stack = player.getItemInHand(hand);
        if (!stack.is(MagicItems.BLOOD_VIAL)) {
            return false;
        }
        stack.shrink(1);
        ItemStack filled = new ItemStack(MagicItems.BLOOD_VIAL_FULL);
        if (!player.getInventory().add(filled)) {
            player.drop(filled, false);
        }
        player.sendSystemMessage(Component.translatable(
                        "quest.witch_hat_magic.blood_vial_filled")
                .withStyle(ChatFormatting.DARK_RED));
        return true;
    }

    /** Brewing blood ink seals the pact — check inventory each poll. */
    public static void pollMembership(ServerPlayer player) {
        MinecraftServer server = Objects.requireNonNull(player.getServer());
        QuestWorldState state = QuestWorldState.get(server);
        if (state.isBrotherhoodMember(player.getUUID())) {
            return;
        }
        if (!player.getInventory().hasAnyOf(java.util.Set.of(MagicItems.BLOOD_INK))) {
            return;
        }
        state.addBrotherhoodMember(player.getUUID());
        player.sendSystemMessage(Component.translatable(
                        "quest.witch_hat_magic.brotherhood_welcome")
                .withStyle(ChatFormatting.DARK_PURPLE, ChatFormatting.BOLD));
        player.sendSystemMessage(Component.translatable(
                        "quest.witch_hat_magic.brotherhood_warning")
                .withStyle(ChatFormatting.DARK_RED, ChatFormatting.ITALIC));
    }

    /** Allies echo their member's spells with a small manifestation. */
    public static void notifyAllySpell(ServerPlayer player, ActivationResult result) {
        if (!isMember(player) || result.status() != io.github.nh1980mg.witchhat.magic.spell.ActivationStatus.SUCCESS) {
            return;
        }
        List<io.github.nh1980mg.witchhat.magic.entity.BrimcapAllyEntity> allies =
                player.serverLevel().getEntitiesOfClass(
                        io.github.nh1980mg.witchhat.magic.entity.BrimcapAllyEntity.class,
                        new AABB(player.blockPosition()).inflate(ALLY_MIMIC_RANGE),
                        ally -> player.getUUID().equals(ally.ownerId()));
        for (var ally : allies) {
            ManifestationPlan echo = ManifestationPlan.createAnchored(
                    ally.getEyePosition().add(ally.getLookAngle().scale(1.5)),
                    ally.getLookAngle(),
                    result);
            SpellManifestationService.enqueue(
                    echo,
                    Math.min(result.durationTicks(), 60),
                    player.serverLevel(),
                    net.minecraft.world.phys.Vec3.ZERO);
        }
    }
}
