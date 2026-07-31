package io.github.nh1980mg.witchhat.magic.quest;

import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import java.util.Objects;
import java.util.Optional;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.component.LodestoneTracker;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.phys.Vec3;

/**
 * The narrator: greets each new apprentice with a quest compass pointing to
 * the witch lair, then watches their progress (ink, notebook, first spell,
 * canvas, sylph shoes, lair) and narrates the next step, master-witch style.
 */
public final class QuestService {
    public static final int MAX_STAGE = 7;
    private static final int POLL_INTERVAL_TICKS = 40;
    private static final double LAIR_ARRIVAL_DISTANCE_SQR = 100.0 * 100.0;

    private QuestService() {}

    public static void onPlayerJoin(ServerPlayer player) {
        MinecraftServer server = Objects.requireNonNull(player.getServer());
        QuestWorldState state = QuestWorldState.get(server);
        if (state.stage(player.getUUID()) != 0) {
            return;
        }
        advance(player, 1);
        ItemStack compass = createQuestCompass(state.lairPos(server), player.level());
        if (!player.getInventory().add(compass)) {
            player.drop(compass, false);
        }
    }

    public static void notifySpellActivated(ServerPlayer player) {
        MinecraftServer server = Objects.requireNonNull(player.getServer());
        if (QuestWorldState.get(server).stage(player.getUUID()) == 3) {
            advance(player, 4);
        }
    }

    public static void tick(MinecraftServer server) {
        if (server.getTickCount() % POLL_INTERVAL_TICKS != 0) {
            return;
        }
        QuestWorldState state = QuestWorldState.get(server);
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            int stage = state.stage(player.getUUID());
            switch (stage) {
                case 1 -> {
                    if (player.getInventory().hasAnyOf(java.util.Set.of(MagicItems.MAGIC_INK))) {
                        advance(player, 2);
                    }
                }
                case 2 -> {
                    if (player.getInventory().hasAnyOf(java.util.Set.of(MagicItems.MAGIC_CIRCLE_NOTEBOOK))) {
                        advance(player, 3);
                    }
                }
                case 4 -> {
                    if (player.getInventory().hasAnyOf(java.util.Set.of(
                            MagicItems.CANVAS_SQUARE, MagicItems.LARGE_CANVAS))) {
                        advance(player, 5);
                    }
                }
                case 5 -> {
                    if (player.getInventory().hasAnyOf(java.util.Set.of(MagicItems.SYLPH_SHOES))) {
                        advance(player, 6);
                    }
                }
                case 6 -> {
                    BlockPos lair = state.lairPos(server);
                    Vec3 center = Vec3.atCenterOf(lair);
                    if (player.distanceToSqr(center) < LAIR_ARRIVAL_DISTANCE_SQR) {
                        advance(player, 7);
                    }
                }
                default -> { }
            }
        }
    }

    private static void advance(ServerPlayer player, int stage) {
        MinecraftServer server = Objects.requireNonNull(player.getServer());
        QuestWorldState.get(server).setStage(player.getUUID(), stage);
        player.sendSystemMessage(Component.translatable(
                        "quest.witch_hat_magic.stage." + stage)
                .withStyle(ChatFormatting.DARK_PURPLE, ChatFormatting.ITALIC));
    }

    public static ItemStack createQuestCompass(BlockPos lair, Level level) {
        ItemStack compass = new ItemStack(Items.COMPASS);
        compass.set(DataComponents.LODESTONE_TRACKER, new LodestoneTracker(
                Optional.of(net.minecraft.core.GlobalPos.of(
                        level.dimension(), lair)),
                false));
        compass.set(DataComponents.CUSTOM_NAME, Component.translatable(
                "item.witch_hat_magic.quest_compass"));
        return compass;
    }
}
