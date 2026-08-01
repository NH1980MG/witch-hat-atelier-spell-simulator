package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayDeque;
import java.util.Deque;

/** Delayed callbacks for witch channels — the seal itself runs on the shared scheduler. */
public final class CastCircleService {
    private static final CastCircleService INSTANCE = new CastCircleService();

    private final Deque<Runnable> due = new ArrayDeque<>();
    private final Deque<Integer> delays = new ArrayDeque<>();

    private CastCircleService() {}

    public static CastCircleService instance() {
        return INSTANCE;
    }

    public void schedule(int delayTicks, Runnable callback) {
        delays.addLast(Math.max(1, delayTicks));
        due.addLast(callback);
    }

    public void tick() {
        int size = delays.size();
        for (int index = 0; index < size; index++) {
            int remaining = delays.pollFirst() - 1;
            Runnable callback = due.pollFirst();
            if (remaining <= 0) {
                callback.run();
            } else {
                delays.addLast(remaining);
                due.addLast(callback);
            }
        }
    }
}
