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
    private final java.util.Set<UUID> brotherhoodMembers = new java.util.HashSet<>();
    private final Map<UUID, Map<io.github.nh1980mg.witchhat.magic.body.BodyPart, io.github.nh1980mg.witchhat.magic.notebook.NotebookPage>> tattoos = new HashMap<>();
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
        CompoundTag members = tag.getCompound("brotherhood");
        for (String key : members.getAllKeys()) {
            state.brotherhoodMembers.add(UUID.fromString(key));
        }
        CompoundTag tattooTag = tag.getCompound("tattoos");
        for (String playerKey : tattooTag.getAllKeys()) {
            CompoundTag parts = tattooTag.getCompound(playerKey);
            for (String partKey : parts.getAllKeys()) {
                io.github.nh1980mg.witchhat.magic.notebook.NotebookPage.CODEC
                        .parse(net.minecraft.nbt.NbtOps.INSTANCE, parts.getCompound(partKey))
                        .result()
                        .ifPresent(page -> state.setTattoo(
                                UUID.fromString(playerKey),
                                io.github.nh1980mg.witchhat.magic.body.BodyPart.valueOf(partKey),
                                page));
            }
        }
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
        CompoundTag members = new CompoundTag();
        brotherhoodMembers.forEach(uuid -> members.putBoolean(uuid.toString(), true));
        tag.put("brotherhood", members);
        CompoundTag tattooTag = new CompoundTag();
        tattoos.forEach((uuid, parts) -> {
            CompoundTag partTag = new CompoundTag();
            parts.forEach((part, page) -> io.github.nh1980mg.witchhat.magic.notebook.NotebookPage.CODEC
                    .encodeStart(net.minecraft.nbt.NbtOps.INSTANCE, page)
                    .result()
                    .ifPresent(encoded -> partTag.put(part.name(), encoded)));
            tattooTag.put(uuid.toString(), partTag);
        });
        tag.put("tattoos", tattooTag);
        return tag;
    }

    public int stage(UUID playerId) {
        return stages.getOrDefault(playerId, 0);
    }

    public boolean bossSpawned() {
        return bossSpawned;
    }

    public boolean isBrotherhoodMember(UUID playerId) {
        return brotherhoodMembers.contains(playerId);
    }

    public void addBrotherhoodMember(UUID playerId) {
        brotherhoodMembers.add(playerId);
        setDirty();
    }

    public io.github.nh1980mg.witchhat.magic.notebook.NotebookPage tattoo(
            UUID playerId,
            io.github.nh1980mg.witchhat.magic.body.BodyPart part) {
        return tattoos.getOrDefault(playerId, Map.of()).get(part);
    }

    public Map<io.github.nh1980mg.witchhat.magic.body.BodyPart, io.github.nh1980mg.witchhat.magic.notebook.NotebookPage> tattoos(UUID playerId) {
        return Map.copyOf(tattoos.getOrDefault(playerId, Map.of()));
    }

    public void setTattoo(
            UUID playerId,
            io.github.nh1980mg.witchhat.magic.body.BodyPart part,
            io.github.nh1980mg.witchhat.magic.notebook.NotebookPage page) {
        tattoos.computeIfAbsent(playerId, id -> new java.util.EnumMap<>(
                io.github.nh1980mg.witchhat.magic.body.BodyPart.class)).put(part, page);
        setDirty();
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
