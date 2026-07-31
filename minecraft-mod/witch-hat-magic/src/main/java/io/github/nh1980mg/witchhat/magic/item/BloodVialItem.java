package io.github.nh1980mg.witchhat.magic.item;

import io.github.nh1980mg.witchhat.magic.quest.BrotherhoodService;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/** Empty vial — fill it with your own blood by right-clicking while hurt. */
public class BloodVialItem extends Item {
    public BloodVialItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!level.isClientSide() && player instanceof net.minecraft.server.level.ServerPlayer serverPlayer) {
            boolean filled = BrotherhoodService.tryFillBloodVial(serverPlayer, hand);
            return filled
                    ? InteractionResultHolder.success(stack)
                    : InteractionResultHolder.fail(stack);
        }
        return InteractionResultHolder.pass(stack);
    }
}
