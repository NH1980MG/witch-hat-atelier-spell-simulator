package io.github.nh1980mg.witchhat.magic.command;

import com.mojang.brigadier.CommandDispatcher;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

/** /rush — creative loadout: every mod item plus elytra and rockets. */
public final class RushCommand {
    private RushCommand() {
    }

    public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(Commands.literal("rush")
                .requires(source -> source.hasPermission(2))
                .executes(context -> run(context.getSource())));
    }

    private static int run(CommandSourceStack source) {
        ServerPlayer player = source.getPlayer();
        if (player == null) {
            source.sendFailure(Component.literal("Only players can use /rush"));
            return 0;
        }
        Item[] modItems = {
                MagicItems.MAGIC_CIRCLE_NOTEBOOK,
                MagicItems.CANVAS_SQUARE,
                MagicItems.LARGE_CANVAS,
                MagicItems.SYLPH_SHOES,
                MagicItems.MAGIC_CIRCLE_PAGE,
                MagicItems.INKWOOD_LOG,
                MagicItems.INKWOOD_LEAVES,
                MagicItems.INKWOOD_SAPLING,
                MagicItems.INK_CAULDRON,
                MagicItems.INK_POD,
                MagicItems.MAGIC_INK,
                MagicItems.BLOOD_VIAL,
                MagicItems.BLOOD_VIAL_FULL,
                MagicItems.BLOOD_INK,
        };
        for (Item item : modItems) {
            give(player, new ItemStack(item, item.getDefaultMaxStackSize()));
        }
        give(player, new ItemStack(Items.ELYTRA));
        give(player, new ItemStack(Items.FIREWORK_ROCKET, 64));
        give(player, new ItemStack(Items.FIREWORK_ROCKET, 64));
        source.sendSuccess(
                () -> Component.translatable("command.witch_hat_magic.rush"), true);
        return modItems.length + 3;
    }

    private static void give(ServerPlayer player, ItemStack stack) {
        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
    }
}
