package io.github.nh1980mg.witchhat.aibuilder.build;

public interface WorldMutationPort {
    String getBlockState(ResolvedPlacement placement);

    boolean setBlockState(ResolvedPlacement placement, String blockState);

    boolean isProtected(ResolvedPlacement placement);

    default boolean matchesTargetState(ResolvedPlacement placement, String targetState) {
        return getBlockState(placement).equals(targetState);
    }
}
