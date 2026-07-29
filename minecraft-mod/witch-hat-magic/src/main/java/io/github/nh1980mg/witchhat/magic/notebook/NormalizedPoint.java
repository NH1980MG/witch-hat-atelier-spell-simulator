package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record NormalizedPoint(float x, float y) {
    public static final Codec<NormalizedPoint> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.FLOAT.fieldOf("x").forGetter(NormalizedPoint::x),
            Codec.FLOAT.fieldOf("y").forGetter(NormalizedPoint::y))
            .apply(instance, NormalizedPoint::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, NormalizedPoint> STREAM_CODEC =
            StreamCodec.ofMember(NormalizedPoint::write, NormalizedPoint::read);

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeFloat(x);
        buffer.writeFloat(y);
    }

    private static NormalizedPoint read(RegistryFriendlyByteBuf buffer) {
        return new NormalizedPoint(buffer.readFloat(), buffer.readFloat());
    }
}
