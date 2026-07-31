package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Guards against unregistered networking registries: every {@code *Networking}
 * class that declares {@code registerPayloads()} or {@code registerServerReceivers()}
 * must be wired in {@code WitchHatMagicMod.onInitialize()}. A missing call leaves
 * payload types unregistered and crashes the client or server at startup.
 */
final class NetworkingWiringTest {
    private static final Pattern CLASS_NAME = Pattern.compile("public final class (\\w+Networking)");

    @Test
    void everyNetworkingRegistryIsWiredInTheModInitializer() throws IOException {
        Path modSource = locate("src/main/java/io/github/nh1980mg/witchhat/magic/WitchHatMagicMod.java");
        String initializer = Files.readString(modSource);
        Path networkDir = modSource.getParent().resolve("network");
        List<Path> registries;
        try (Stream<Path> files = Files.list(networkDir)) {
            registries = files
                    .filter(file -> file.getFileName().toString().endsWith("Networking.java"))
                    .sorted()
                    .toList();
        }
        assertTrue(registries.size() >= 3, "networking registries should be discoverable");
        for (Path file : registries) {
            String source = Files.readString(file);
            Matcher matcher = CLASS_NAME.matcher(source);
            assertTrue(matcher.find(), () -> "no networking class found in " + file);
            String className = matcher.group(1);
            if (source.contains("static void registerPayloads(")) {
                assertTrue(
                        initializer.contains(className + ".registerPayloads();"),
                        () -> className + ".registerPayloads() is not wired in WitchHatMagicMod.onInitialize()");
            }
            if (source.contains("static void registerServerReceivers(")) {
                assertTrue(
                        initializer.contains(className + ".registerServerReceivers();"),
                        () -> className + ".registerServerReceivers() is not wired in WitchHatMagicMod.onInitialize()");
            }
        }
    }

    private static Path locate(String relative) {
        Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        while (dir != null) {
            Path candidate = dir.resolve(relative);
            if (Files.exists(candidate)) {
                return candidate;
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException("cannot locate " + relative);
    }
}
