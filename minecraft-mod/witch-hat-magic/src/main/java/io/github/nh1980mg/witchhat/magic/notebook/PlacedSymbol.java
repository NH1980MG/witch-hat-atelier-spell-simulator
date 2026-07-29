package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record PlacedSymbol(
        String symbolId,
        NormalizedPoint center,
        float size,
        float rotationDegrees) {
    public static final int MAX_ID_LENGTH = 64;

    public static final Codec<PlacedSymbol> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.STRING.fieldOf("symbol").forGetter(PlacedSymbol::symbolId),
            NormalizedPoint.CODEC.fieldOf("center").forGetter(PlacedSymbol::center),
            Codec.FLOAT.fieldOf("size").forGetter(PlacedSymbol::size),
            Codec.FLOAT.fieldOf("rotation").forGetter(PlacedSymbol::rotationDegrees))
            .apply(instance, PlacedSymbol::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, PlacedSymbol> STREAM_CODEC =
            StreamCodec.ofMember(PlacedSymbol::write, PlacedSymbol::read);

    public PlacedSymbol {
        symbolId = Objects.requireNonNull(symbolId, "symbolId");
        center = Objects.requireNonNull(center, "center");
    }

    public PlacedSymbol withCenter(NormalizedPoint replacement) {
        return new PlacedSymbol(symbolId, replacement, size, rotationDegrees);
    }

    public PlacedSymbol withSize(float replacement) {
        return new PlacedSymbol(symbolId, center, replacement, rotationDegrees);
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeUtf(symbolId, MAX_ID_LENGTH);
        NormalizedPoint.STREAM_CODEC.encode(buffer, center);
        buffer.writeFloat(size);
        buffer.writeFloat(rotationDegrees);
    }

    private static PlacedSymbol read(RegistryFriendlyByteBuf buffer) {
        return new PlacedSymbol(
                buffer.readUtf(MAX_ID_LENGTH),
                NormalizedPoint.STREAM_CODEC.decode(buffer),
                buffer.readFloat(),
                buffer.readFloat());
    }
}
