package io.github.nh1980mg.witchhat.magic.item;

import io.github.nh1980mg.witchhat.magic.network.NotebookNetworking;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.ItemLike;

public final class MagicCircleNotebookItem extends Item {
    public MagicCircleNotebookItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!level.isClientSide() && player instanceof ServerPlayer serverPlayer) {
            if (io.github.nh1980mg.witchhat.magic.quest.QuestWorldState
                    .get(serverPlayer.getServer())
                    .isMemoryWiped(serverPlayer.getUUID())) {
                serverPlayer.sendSystemMessage(net.minecraft.network.chat.Component.translatable(
                                "quest.witch_hat_magic.notebook_forgotten")
                        .withStyle(net.minecraft.ChatFormatting.GRAY,
                                net.minecraft.ChatFormatting.ITALIC));
                return InteractionResultHolder.fail(stack);
            }
            NotebookNetworking.open(serverPlayer, hand);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    public static ItemStack createDefaultStack(
            ItemLike item,
            DataComponentType<NotebookData> notebookDataComponent) {
        ItemStack stack = new ItemStack(item);
        stack.set(notebookDataComponent, NotebookData.createDefault());
        return stack;
    }
}
