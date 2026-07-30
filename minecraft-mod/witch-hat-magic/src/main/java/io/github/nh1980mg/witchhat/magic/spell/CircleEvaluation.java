package io.github.nh1980mg.witchhat.magic.spell;

import java.util.Objects;

public record CircleEvaluation(
        Verdict verdict,
        double power,
        double precision,
        int durationTicks) {
    public enum Verdict {
        NO_CIRCLE,
        IRREGULAR,
        VALID
    }

    public CircleEvaluation {
        verdict = Objects.requireNonNull(verdict, "verdict");
    }

    public static CircleEvaluation noCircle() {
        return new CircleEvaluation(Verdict.NO_CIRCLE, 0.0, 0.0, 0);
    }

    public static CircleEvaluation irregular(double precision) {
        return new CircleEvaluation(Verdict.IRREGULAR, 0.0, precision, 0);
    }

    public static CircleEvaluation valid(double power, double precision, int durationTicks) {
        return new CircleEvaluation(Verdict.VALID, power, precision, durationTicks);
    }
}
