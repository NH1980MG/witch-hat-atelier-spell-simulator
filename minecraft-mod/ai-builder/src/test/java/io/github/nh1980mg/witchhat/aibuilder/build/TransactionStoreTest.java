package io.github.nh1980mg.witchhat.aibuilder.build;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TransactionStoreTest {
    @TempDir
    Path tempDir;

    @Test
    void atomicallyRoundTripsTransactionAndCanConsumeIt() {
        Path file = tempDir.resolve("history/latest.json");
        TransactionStore store = new TransactionStore(file);
        BuildTransaction transaction = new BuildTransaction(
                1,
                "transaction-id",
                "minecraft:overworld",
                0,
                List.of(new BuildTransaction.Entry(
                        1,
                        64,
                        2,
                        "minecraft:stone",
                        "minecraft:sea_lantern")));

        store.save(transaction);

        assertTrue(Files.isRegularFile(file));
        assertEquals(transaction, store.load().orElseThrow());
        store.clear();
        assertFalse(store.load().isPresent());
    }
}
