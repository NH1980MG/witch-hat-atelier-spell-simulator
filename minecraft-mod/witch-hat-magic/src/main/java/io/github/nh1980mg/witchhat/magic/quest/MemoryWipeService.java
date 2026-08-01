package io.github.nh1980mg.witchhat.magic.quest;

import io.github.nh1980mg.witchhat.magic.entity.SealKnightEntity;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.phys.AABB;

/**
 * Seal Knight capture: held within arm's reach of a hunting knight for ten
 * unbroken seconds, a brother loses every memory of the craft — the spell
 * notebook goes silent until fresh ink brings them back.
 */
public final class MemoryWipeService {
    private static final int CAPTURE_RANGE_SQR = 9; // 3 blocks
    private static final int CAPTURE_TICKS = 200;   // 10 seconds

    private static final Map<ServerPlayer, Integer> heldTicks = new WeakHashMap<>();

    private MemoryWipeService() {}

    public static void tick(MinecraftServer server) {
        if (server.getTickCount() % 10 != 0) {
            return;
        }
        QuestWorldState state = QuestWorldState.get(server);
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            boolean held = !player.serverLevel().getEntitiesOfClass(
                    SealKnightEntity.class,
                    new AABB(player.blockPosition()).inflate(3.0),
                    knight -> knight.getTarget() == player).isEmpty();

            if (held && state.isBrotherhoodMember(player.getUUID())
                    && !state.isMemoryWiped(player.getUUID())) {
                int held_ = heldTicks.getOrDefault(player, 0) + 10;
                heldTicks.put(player, held_);
                if (held_ >= CAPTURE_TICKS) {
                    wipe(player, state);
                }
            } else {
                heldTicks.remove(player);
            }

            if (state.isMemoryWiped(player.getUUID())
                    && player.getInventory().hasAnyOf(java.util.Set.of(MagicItems.MAGIC_INK))) {
                state.setMemoryWiped(player.getUUID(), false);
                player.sendSystemMessage(Component.translatable(
                                "quest.witch_hat_magic.memories_return")
                        .withStyle(ChatFormatting.DARK_AQUA));
            }
        }
    }

    private static void wipe(ServerPlayer player, QuestWorldState state) {
        state.setMemoryWiped(player.getUUID(), true);
        state.setStage(player.getUUID(), 1);
        heldTicks.remove(player);
        player.sendSystemMessage(Component.translatable(
                        "quest.witch_hat_magic.memories_lost")
                .withStyle(ChatFormatting.DARK_RED, ChatFormatting.BOLD));
    }
}
