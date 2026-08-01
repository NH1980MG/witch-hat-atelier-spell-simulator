package io.github.nh1980mg.witchhat.magic.quest;

import io.github.nh1980mg.witchhat.magic.entity.BrimcapAllyEntity;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapBossEntity;
import io.github.nh1980mg.witchhat.magic.entity.BrimcapWitchEntity;
import io.github.nh1980mg.witchhat.magic.entity.SealKnightEntity;
import io.github.nh1980mg.witchhat.magic.registry.MagicEntities;
import java.util.Map;
import java.util.WeakHashMap;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.Difficulty;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.level.levelgen.Heightmap;

/**
 * Brimmed Cap pressure rises as the player nears the lair: scouts appear
 * around questing players more and more often, and the boss herself spawns
 * once someone steps inside her territory.
 */
public final class BrimcapSpawnService {
    private static final int CHECK_INTERVAL = 20;
    private static final double BOSS_TRIGGER_DISTANCE_SQR = 80.0 * 80.0;
    private static final Map<ServerPlayer, Integer> cooldowns = new WeakHashMap<>();

    private BrimcapSpawnService() {}

    public static void tick(MinecraftServer server) {
        if (server.getTickCount() % CHECK_INTERVAL != 0
                || server.overworld().getDifficulty() == Difficulty.PEACEFUL) {
            return;
        }
        QuestWorldState state = QuestWorldState.get(server);
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            BrotherhoodService.pollMembership(player);
            BlockPos lair = state.lairPos(server);
            double distanceSqr = player.distanceToSqr(
                    lair.getX() + 0.5, lair.getY(), lair.getZ() + 0.5);

            // The matriarch answers any intruder, whatever their quest stage.
            if (distanceSqr < BOSS_TRIGGER_DISTANCE_SQR && !state.bossSpawned()
                    && !state.isBrotherhoodMember(player.getUUID())) {
                spawnBoss(player, state, lair);
                continue;
            }
            if (state.stage(player.getUUID()) < 6) {
                continue;
            }
            int interval = intervalFor(distanceSqr);
            int cooldown = cooldowns.getOrDefault(player, 0) - CHECK_INTERVAL;
            if (cooldown <= 0) {
                boolean member = state.isBrotherhoodMember(player.getUUID());
                boolean spawned = member
                        ? (trySpawnKnight(player) || trySpawnAlly(player))
                        : trySpawnScout(player);
                cooldown = spawned ? interval : interval / 2;
            }
            cooldowns.put(player, cooldown);
        }
    }

    /** Knights hunt members at half the scout rate — allies outnumber them. */
    private static boolean trySpawnKnight(ServerPlayer player) {
        return player.getRandom().nextInt(3) == 0
                && spawnNear(player, () -> {
                    SealKnightEntity knight = MagicEntities.SEAL_KNIGHT.create(player.serverLevel());
                    return knight;
                });
    }

    /** Up to two allies follow a member at a time. */
    private static boolean trySpawnAlly(ServerPlayer player) {
        long nearby = player.serverLevel().getEntitiesOfClass(
                io.github.nh1980mg.witchhat.magic.entity.BrimcapAllyEntity.class,
                new net.minecraft.world.phys.AABB(player.blockPosition()).inflate(32.0),
                ally -> player.getUUID().equals(ally.ownerId())).size();
        if (nearby >= 2) {
            return false;
        }
        return spawnNear(player, () -> {
            BrimcapAllyEntity ally = MagicEntities.BRIMCAP_ALLY.create(player.serverLevel());
            if (ally != null) {
                ally.setOwnerId(player.getUUID());
                ally.setPersistenceRequired();
            }
            return ally;
        });
    }

    private interface SpawnFactory<T extends net.minecraft.world.entity.Mob> {
        T create();
    }

    private static <T extends net.minecraft.world.entity.Mob> boolean spawnNear(
            ServerPlayer player, SpawnFactory<T> factory) {
        ServerLevel level = player.serverLevel();
        RandomSource random = level.getRandom();
        double angle = random.nextDouble() * Math.PI * 2.0;
        double distance = 16 + random.nextInt(13);
        int x = (int) (player.getX() + Math.cos(angle) * distance);
        int z = (int) (player.getZ() + Math.sin(angle) * distance);
        int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
        BlockPos pos = new BlockPos(x, y, z);
        if (!level.getBlockState(pos).isAir()
                || !level.getBlockState(pos.above()).isAir()
                || !level.getBlockState(pos.below()).isSolidRender(level, pos.below())) {
            return false;
        }
        T mob = factory.create();
        if (mob == null) {
            return false;
        }
        mob.moveTo(x + 0.5, y, z + 0.5, random.nextFloat() * 360.0F, 0.0F);
        mob.finalizeSpawn(level, level.getCurrentDifficultyAt(pos), MobSpawnType.NATURAL, null);
        level.addFreshEntity(mob);
        return true;
    }

    /** Far: rare. Close: frequent. */
    private static int intervalFor(double distanceSqr) {
        double distance = Math.sqrt(distanceSqr);
        if (distance > 1000) return 4800;
        if (distance > 500) return 2400;
        if (distance > 250) return 1200;
        return 500;
    }

    private static boolean trySpawnScout(ServerPlayer player) {
        ServerLevel level = player.serverLevel();
        RandomSource random = level.getRandom();
        double angle = random.nextDouble() * Math.PI * 2.0;
        double distance = 16 + random.nextInt(13);
        int x = (int) (player.getX() + Math.cos(angle) * distance);
        int z = (int) (player.getZ() + Math.sin(angle) * distance);
        int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
        BlockPos pos = new BlockPos(x, y, z);
        if (!level.getBlockState(pos).isAir()
                || !level.getBlockState(pos.above()).isAir()
                || !level.getBlockState(pos.below()).isSolidRender(level, pos.below())) {
            return false;
        }
        BrimcapWitchEntity witch = MagicEntities.BRIMCAP_WITCH.create(level);
        if (witch == null) {
            return false;
        }
        witch.moveTo(x + 0.5, y, z + 0.5, random.nextFloat() * 360.0F, 0.0F);
        witch.finalizeSpawn(level, level.getCurrentDifficultyAt(pos), MobSpawnType.NATURAL, null);
        level.addFreshEntity(witch);
        return true;
    }

    private static void spawnBoss(ServerPlayer player, QuestWorldState state, BlockPos lair) {
        ServerLevel level = player.serverLevel();
        // She steps out to meet the intruder: surface, 20 blocks ahead of the player.
        double angle = Math.atan2(
                lair.getZ() + 0.5 - player.getZ(), lair.getX() + 0.5 - player.getX());
        int x = (int) (player.getX() + Math.cos(angle) * 20.0);
        int z = (int) (player.getZ() + Math.sin(angle) * 20.0);
        int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
        BlockPos pos = new BlockPos(x, y, z);
        BrimcapBossEntity boss = MagicEntities.BRIMCAP_BOSS.create(level);
        if (boss == null) {
            return;
        }
        boss.moveTo(pos.getX() + 0.5, y, pos.getZ() + 0.5, 0.0F, 0.0F);
        boss.finalizeSpawn(level, level.getCurrentDifficultyAt(pos), MobSpawnType.NATURAL, null);
        boss.setPersistenceRequired();
        level.addFreshEntity(boss);
        state.setBossSpawned(true);
        player.sendSystemMessage(net.minecraft.network.chat.Component.translatable(
                        "quest.witch_hat_magic.boss_arrival")
                .withStyle(net.minecraft.ChatFormatting.RED, net.minecraft.ChatFormatting.BOLD));
    }
}
