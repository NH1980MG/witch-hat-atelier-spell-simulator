package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record NotebookPage(
        String id,
        String title,
        List<NotebookStroke> strokes,
        List<PlacedSymbol> symbols) {
    public static final int MAX_ID_LENGTH = 64;
    public static final int MAX_TITLE_LENGTH = 64;

    public static final Codec<NotebookPage> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.STRING.fieldOf("id").forGetter(NotebookPage::id),
            Codec.STRING.fieldOf("title").forGetter(NotebookPage::title),
            NotebookStroke.CODEC.listOf().fieldOf("strokes").forGetter(NotebookPage::strokes),
            PlacedSymbol.CODEC.listOf().optionalFieldOf("symbols", List.of()).forGetter(NotebookPage::symbols))
            .apply(instance, NotebookPage::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, NotebookPage> STREAM_CODEC =
            StreamCodec.ofMember(NotebookPage::write, NotebookPage::read);

    public NotebookPage {
        id = Objects.requireNonNull(id, "id");
        title = Objects.requireNonNull(title, "title");
        strokes = List.copyOf(Objects.requireNonNull(strokes, "strokes"));
        symbols = List.copyOf(Objects.requireNonNull(symbols, "symbols"));
    }

    public NotebookPage(String id, String title, List<NotebookStroke> strokes) {
        this(id, title, strokes, List.of());
    }

    public static NotebookPage blank(String id, String title) {
        return new NotebookPage(id, title, List.of(), List.of());
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeUtf(id, MAX_ID_LENGTH);
        buffer.writeUtf(title, MAX_TITLE_LENGTH);
        buffer.writeVarInt(strokes.size());
        strokes.forEach(stroke -> NotebookStroke.STREAM_CODEC.encode(buffer, stroke));
        buffer.writeVarInt(symbols.size());
        symbols.forEach(symbol -> PlacedSymbol.STREAM_CODEC.encode(buffer, symbol));
    }

    private static NotebookPage read(RegistryFriendlyByteBuf buffer) {
        String id = buffer.readUtf(MAX_ID_LENGTH);
        String title = buffer.readUtf(MAX_TITLE_LENGTH);
        int count = NotebookStroke.readBoundedCount(
                buffer, NotebookLimits.MAX_STROKES_PER_PAGE, "page strokes");
        List<NotebookStroke> strokes = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            strokes.add(NotebookStroke.STREAM_CODEC.decode(buffer));
        }
        int symbolCount = NotebookStroke.readBoundedCount(
                buffer, NotebookLimits.MAX_SYMBOLS_PER_PAGE, "page symbols");
        List<PlacedSymbol> symbols = new ArrayList<>(symbolCount);
        for (int index = 0; index < symbolCount; index++) {
            symbols.add(PlacedSymbol.STREAM_CODEC.decode(buffer));
        }
        return new NotebookPage(id, title, strokes, symbols);
    }
}
