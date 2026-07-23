package io.github.nh1980mg.witchhat.aibuilder.build;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;

public final class TransactionStore {
    private final Path file;
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    public TransactionStore(Path file) {
        this.file = file.toAbsolutePath().normalize();
    }

    public void save(BuildTransaction transaction) {
        Path parent = file.getParent();
        Path temporary = file.resolveSibling(file.getFileName() + ".tmp");
        try {
            Files.createDirectories(parent);
            try (Writer writer = Files.newBufferedWriter(temporary)) {
                gson.toJson(transaction, writer);
            }
            try {
                Files.move(
                        temporary,
                        file,
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException error) {
            throw new IllegalStateException("Unable to persist build backup", error);
        }
    }

    public Optional<BuildTransaction> load() {
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try (Reader reader = Files.newBufferedReader(file)) {
            BuildTransaction transaction = gson.fromJson(reader, BuildTransaction.class);
            if (transaction == null || transaction.formatVersion() != 1) {
                throw new IllegalStateException("Unsupported or empty build backup");
            }
            return Optional.of(transaction);
        } catch (IOException | JsonParseException error) {
            throw new IllegalStateException("Unable to read build backup", error);
        }
    }

    public void clear() {
        try {
            Files.deleteIfExists(file);
        } catch (IOException error) {
            throw new IllegalStateException("Unable to clear build backup", error);
        }
    }
}
