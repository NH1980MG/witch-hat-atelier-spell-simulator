package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record TracingGuide(
        String sourcePageId,
        NormalizedPoint center,
        float size,
        float opacity,
        boolean visible) {
    public static final float DEFAULT_SIZE = 0.8F;
    public static final float DEFAULT_OPACITY = 0.35F;

    public static final Codec<TracingGuide> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.STRING.fieldOf("source_page").forGetter(TracingGuide::sourcePageId),
            NormalizedPoint.CODEC.fieldOf("center").forGetter(TracingGuide::center),
            Codec.FLOAT.fieldOf("size").forGetter(TracingGuide::size),
            Codec.FLOAT.fieldOf("opacity").forGetter(TracingGuide::opacity),
            Codec.BOOL.fieldOf("visible").forGetter(TracingGuide::visible))
            .apply(instance, TracingGuide::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, TracingGuide> STREAM_CODEC =
            StreamCodec.ofMember(TracingGuide::write, TracingGuide::read);

    public TracingGuide {
        sourcePageId = Objects.requireNonNull(sourcePageId, "sourcePageId");
        center = Objects.requireNonNull(center, "center");
    }

    public static TracingGuide createDefault(String sourcePageId) {
        return new TracingGuide(
                sourcePageId,
                new NormalizedPoint(0.5F, 0.5F),
                DEFAULT_SIZE,
                DEFAULT_OPACITY,
                true);
    }

    public TracingGuide withSource(String sourcePageId) {
        return new TracingGuide(sourcePageId, center, size, opacity, visible);
    }

    public TracingGuide withSize(float size) {
        return new TracingGuide(sourcePageId, center, size, opacity, visible);
    }

    public TracingGuide withVisible(boolean visible) {
        return new TracingGuide(sourcePageId, center, size, opacity, visible);
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeUtf(sourcePageId, NotebookPage.MAX_ID_LENGTH);
        NormalizedPoint.STREAM_CODEC.encode(buffer, center);
        buffer.writeFloat(size);
        buffer.writeFloat(opacity);
        buffer.writeBoolean(visible);
    }

    private static TracingGuide read(RegistryFriendlyByteBuf buffer) {
        return new TracingGuide(
                buffer.readUtf(NotebookPage.MAX_ID_LENGTH),
                NormalizedPoint.STREAM_CODEC.decode(buffer),
                buffer.readFloat(),
                buffer.readFloat(),
                buffer.readBoolean());
    }
}
