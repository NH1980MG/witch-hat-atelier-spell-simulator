package io.github.nh1980mg.witchhat.magic.block;

import com.mojang.serialization.MapCodec;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import net.minecraft.world.level.block.BaseEntityBlock;

public class CanvasBlock extends AbstractCanvasBlock {
    public static final MapCodec<CanvasBlock> CODEC = simpleCodec(CanvasBlock::new);
    public static final int MAX_ACTIVATIONS = 64;

    public CanvasBlock(Properties properties) {
        super(properties);
    }

    @Override
    public CircleSupport support() {
        return CircleSupport.CANVAS_SQUARE;
    }

    @Override
    public int maxActivations() {
        return MAX_ACTIVATIONS;
    }

    @Override
    protected MapCodec<? extends BaseEntityBlock> codec() {
        return CODEC;
    }
}
