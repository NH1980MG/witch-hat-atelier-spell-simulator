package io.github.nh1980mg.witchhat.aibuilder.build;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class BuildManager {
    private final WorldMutationPort world;
    private final TransactionStore transactionStore;
    private BuildSession session;

    public BuildManager(WorldMutationPort world, TransactionStore transactionStore) {
        this.world = world;
        this.transactionStore = transactionStore;
    }

    public synchronized void start(
            String planId,
            List<ResolvedPlacement> placements,
            int blocksPerTick) {
        if (session != null && session.isActive()) {
            throw new IllegalStateException("A build is already active");
        }
        if (placements.isEmpty()) {
            throw new IllegalArgumentException("A build requires at least one placement");
        }
        if (blocksPerTick < 1) {
            throw new IllegalArgumentException("blocksPerTick must be positive");
        }

        String dimension = placements.getFirst().dimension();
        Map<Position, BuildTransaction.Entry> originals = new LinkedHashMap<>();
        for (ResolvedPlacement placement : placements) {
            if (!dimension.equals(placement.dimension())) {
                throw new IllegalArgumentException("A build cannot span dimensions");
            }
            if (world.isProtected(placement)) {
                throw new IllegalArgumentException(
                        "Build touches a protected block at "
                                + placement.x() + "," + placement.y() + "," + placement.z());
            }
            Position key = new Position(placement.x(), placement.y(), placement.z());
            originals.computeIfAbsent(
                    key,
                    ignored -> new BuildTransaction.Entry(
                            placement.x(),
                            placement.y(),
                            placement.z(),
                            world.getBlockState(placement)));
        }

        BuildTransaction transaction = new BuildTransaction(
                1,
                UUID.randomUUID().toString(),
                dimension,
                new ArrayList<>(originals.values()));
        transactionStore.save(transaction);
        session = new BuildSession(planId, placements, blocksPerTick, world);
    }

    public synchronized void tick() {
        if (session != null) {
            session.tick();
        }
    }

    public synchronized boolean pause() {
        return session != null && session.pause();
    }

    public synchronized boolean resume() {
        return session != null && session.resume();
    }

    public synchronized boolean cancel() {
        return session != null && session.cancel();
    }

    public synchronized boolean undo() {
        if (session != null && session.isActive()) {
            throw new IllegalStateException("Cancel or finish the active build before undo");
        }
        var stored = transactionStore.load();
        if (stored.isEmpty()) {
            return false;
        }
        BuildTransaction transaction = stored.get();
        List<BuildTransaction.Entry> entries = new ArrayList<>(transaction.entries());
        Collections.reverse(entries);
        for (BuildTransaction.Entry entry : entries) {
            world.setBlockState(
                    new ResolvedPlacement(
                            transaction.dimension(),
                            "undo",
                            entry.x(),
                            entry.y(),
                            entry.z(),
                            entry.state()),
                    entry.state());
        }
        transactionStore.clear();
        session = null;
        return true;
    }

    public synchronized BuildSession.BuildStatus status() {
        return session == null ? BuildSession.BuildStatus.idle() : session.status();
    }

    private record Position(int x, int y, int z) {
    }
}
