package io.github.nh1980mg.witchhat.aibuilder.command;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import io.github.nh1980mg.witchhat.aibuilder.fabric.AiBuilderRuntime;
import java.util.function.Function;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;

public final class AiBuilderCommands {
    private AiBuilderCommands() {
    }

    public static void register(
            CommandDispatcher<CommandSourceStack> dispatcher,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        dispatcher.register(Commands.literal("whabuilder")
                .then(Commands.literal("list")
                        .executes(context -> list(context.getSource(), runtimes)))
                .then(Commands.literal("preview")
                        .then(Commands.argument("plan", StringArgumentType.word())
                                .executes(context -> preview(
                                        context.getSource(),
                                        StringArgumentType.getString(context, "plan"),
                                        runtimes))))
                .then(Commands.literal("build")
                        .then(Commands.argument("plan", StringArgumentType.word())
                                .executes(context -> build(
                                        context.getSource(),
                                        StringArgumentType.getString(context, "plan"),
                                        runtimes))))
                .then(Commands.literal("pause")
                        .executes(context -> control(context.getSource(), runtimes, Control.PAUSE)))
                .then(Commands.literal("resume")
                        .executes(context -> control(context.getSource(), runtimes, Control.RESUME)))
                .then(Commands.literal("cancel")
                        .executes(context -> control(context.getSource(), runtimes, Control.CANCEL)))
                .then(Commands.literal("undo")
                        .executes(context -> control(context.getSource(), runtimes, Control.UNDO)))
                .then(Commands.literal("status")
                        .executes(context -> status(context.getSource(), runtimes))));
    }

    private static int list(
            CommandSourceStack source,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        return guarded(source, () -> {
            var ids = runtime(source, runtimes).plans().listPlanIds();
            source.sendSuccess(
                    () -> Component.literal(ids.isEmpty()
                            ? "AI Builder plans: none"
                            : "AI Builder plans: " + String.join(", ", ids)),
                    false);
            return ids.size();
        });
    }

    private static int preview(
            CommandSourceStack source,
            String planId,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        return guarded(source, () -> {
            ServerPlayer player = requireCreativePlayer(source, false);
            AiBuilderRuntime runtime = runtime(source, runtimes);
            var plan = runtime.plans().load(planId, runtime.planLimits());
            var placements = runtime.resolver().resolve(plan, player);
            runtime.previews().send(player, planId, placements);
            source.sendSuccess(
                    () -> Component.literal(
                            "Preview ready: " + planId + " (" + placements.size() + " blocks)"),
                    false);
            return placements.size();
        });
    }

    private static int build(
            CommandSourceStack source,
            String planId,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        return guarded(source, () -> {
            ServerPlayer player = requireCreativePlayer(source, true);
            AiBuilderRuntime runtime = runtime(source, runtimes);
            var plan = runtime.plans().load(planId, runtime.planLimits());
            var placements = runtime.resolver().resolve(plan, player);
            runtime.builds().start(planId, placements, runtime.config().blocksPerTick());
            source.sendSuccess(
                    () -> Component.literal(
                            "Build started: " + planId + " (" + placements.size() + " blocks)"),
                    true);
            return placements.size();
        });
    }

    private static int control(
            CommandSourceStack source,
            Function<MinecraftServer, AiBuilderRuntime> runtimes,
            Control control) {
        return guarded(source, () -> {
            requireCreativePlayer(source, true);
            var builds = runtime(source, runtimes).builds();
            boolean changed = switch (control) {
                case PAUSE -> builds.pause();
                case RESUME -> builds.resume();
                case CANCEL -> builds.cancel();
                case UNDO -> builds.undo();
            };
            if (!changed) {
                source.sendFailure(Component.literal("AI Builder: command is not valid in the current state"));
                return 0;
            }
            source.sendSuccess(() -> Component.literal("AI Builder: " + control.label), true);
            return 1;
        });
    }

    private static int status(
            CommandSourceStack source,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        return guarded(source, () -> {
            var status = runtime(source, runtimes).builds().status();
            source.sendSuccess(
                    () -> Component.literal(
                            "AI Builder " + status.state()
                                    + " plan=" + status.planId()
                                    + " blocks=" + status.placedCount() + "/" + status.totalCount()
                                    + " phase=" + status.phase()),
                    false);
            return 1;
        });
    }

    private static ServerPlayer requireCreativePlayer(
            CommandSourceStack source,
            boolean requireOperator) {
        ServerPlayer player = source.getPlayer();
        if (player == null) {
            throw new IllegalStateException("This command requires a player");
        }
        int permission = source.hasPermission(2) ? 2 : 0;
        if (requireOperator && !CommandPolicy.canMutate(permission, player.isCreative())) {
            throw new IllegalStateException("Creative mode and permission level 2 are required");
        }
        if (!player.isCreative()) {
            throw new IllegalStateException("Creative mode is required");
        }
        return player;
    }

    private static AiBuilderRuntime runtime(
            CommandSourceStack source,
            Function<MinecraftServer, AiBuilderRuntime> runtimes) {
        return runtimes.apply(source.getServer());
    }

    private static int guarded(CommandSourceStack source, CommandAction action) {
        try {
            return action.run();
        } catch (RuntimeException error) {
            source.sendFailure(Component.literal("AI Builder: " + error.getMessage()));
            return 0;
        }
    }

    private enum Control {
        PAUSE("paused"),
        RESUME("resumed"),
        CANCEL("cancelled"),
        UNDO("latest build restored");

        private final String label;

        Control(String label) {
            this.label = label;
        }
    }

    @FunctionalInterface
    private interface CommandAction {
        int run();
    }
}
