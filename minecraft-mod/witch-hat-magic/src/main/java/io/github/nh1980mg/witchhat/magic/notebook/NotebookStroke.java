package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record NotebookStroke(List<NormalizedPoint> points) {
    public static final Codec<NotebookStroke> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            NormalizedPoint.CODEC.listOf().fieldOf("points").forGetter(NotebookStroke::points))
            .apply(instance, NotebookStroke::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, NotebookStroke> STREAM_CODEC =
            StreamCodec.ofMember(NotebookStroke::write, NotebookStroke::read);

    public NotebookStroke {
        points = List.copyOf(Objects.requireNonNull(points, "points"));
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeVarInt(points.size());
        points.forEach(point -> NormalizedPoint.STREAM_CODEC.encode(buffer, point));
    }

    private static NotebookStroke read(RegistryFriendlyByteBuf buffer) {
        int count = readBoundedCount(buffer, NotebookLimits.MAX_POINTS_PER_STROKE, "stroke points");
        List<NormalizedPoint> points = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            points.add(NormalizedPoint.STREAM_CODEC.decode(buffer));
        }
        return new NotebookStroke(points);
    }

    static int readBoundedCount(RegistryFriendlyByteBuf buffer, int maximum, String label) {
        int count = buffer.readVarInt();
        if (count < 0 || count > maximum) {
            throw new IllegalArgumentException("Invalid " + label + " count: " + count);
        }
        return count;
    }
}
