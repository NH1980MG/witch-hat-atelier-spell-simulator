package io.github.nh1980mg.witchhat.aibuilder.plan;

public final class PlanValidationException extends RuntimeException {
    public PlanValidationException(String message) {
        super(message);
    }

    public PlanValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
