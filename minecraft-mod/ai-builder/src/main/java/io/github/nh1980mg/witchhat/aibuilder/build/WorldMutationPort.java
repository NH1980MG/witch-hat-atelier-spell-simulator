package io.github.nh1980mg.witchhat.aibuilder.build;

public interface WorldMutationPort {
    String getBlockState(ResolvedPlacement placement);

    void setBlockState(ResolvedPlacement placement, String blockState);

    boolean isProtected(ResolvedPlacement placement);
}
