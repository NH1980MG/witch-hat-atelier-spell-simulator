package io.github.nh1980mg.witchhat.magic.quest;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;

/** Per-world quest state: each player's stage plus the witch lair position. */
public class QuestWorldState extends SavedData {
    private static final String ID = WitchHatMagicMod.MOD_ID + "_quest";

    private final Map<UUID, Integer> stages = new HashMap<>();
    private BlockPos lairPos;
    private boolean bossSpawned;

    public static QuestWorldState get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(
                new SavedData.Factory<>(
                        QuestWorldState::new,
                        QuestWorldState::load,
                        null),
                ID);
    }

    private static QuestWorldState load(CompoundTag tag, HolderLookup.Provider registries) {
        QuestWorldState state = new QuestWorldState();
        CompoundTag players = tag.getCompound("players");
        for (String key : players.getAllKeys()) {
            state.stages.put(UUID.fromString(key), players.getInt(key));
        }
        if (tag.contains("lair")) {
            state.lairPos = BlockPos.of(tag.getLong("lair"));
        }
        state.bossSpawned = tag.getBoolean("boss_spawned");
        return state;
    }

    @Override
    public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        CompoundTag players = new CompoundTag();
        stages.forEach((uuid, stage) -> players.putInt(uuid.toString(), stage));
        tag.put("players", players);
        if (lairPos != null) {
            tag.putLong("lair", lairPos.asLong());
        }
        tag.putBoolean("boss_spawned", bossSpawned);
        return tag;
    }

    public int stage(UUID playerId) {
        return stages.getOrDefault(playerId, 0);
    }

    public boolean bossSpawned() {
        return bossSpawned;
    }

    public void setBossSpawned(boolean spawned) {
        bossSpawned = spawned;
        setDirty();
    }

    public void setStage(UUID playerId, int stage) {
        stages.put(playerId, stage);
        setDirty();
    }

    public BlockPos lairPos(MinecraftServer server) {
        if (lairPos == null) {
            long seed = server.overworld().getSeed();
            double angle = (seed % 360) * Math.PI / 180.0;
            double distance = 1200 + Math.abs(seed % 700);
            lairPos = BlockPos.containing(
                    Math.cos(angle) * distance, 80, Math.sin(angle) * distance);
            setDirty();
        }
        return lairPos;
    }
}
