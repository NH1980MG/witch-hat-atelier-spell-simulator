package io.github.nh1980mg.witchhat.aibuilder.command;

public final class CommandPolicy {
    private CommandPolicy() {
    }

    public static boolean canMutate(int permissionLevel, boolean creative) {
        return permissionLevel >= 2 && creative;
    }
}
