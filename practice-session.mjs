export function reconcilePracticeStartIndex(startIndex, actionCount) {
  const safeStart = Number.isFinite(startIndex) ? Math.max(0, Math.floor(startIndex)) : 0;
  const safeCount = Number.isFinite(actionCount) ? Math.max(0, Math.floor(actionCount)) : 0;
  return Math.min(safeStart, safeCount);
}

export function collectPracticeAttempts(actions, startIndex) {
  const safeActions = Array.isArray(actions) ? actions : [];
  const boundary = reconcilePracticeStartIndex(startIndex, safeActions.length);
  return safeActions
    .slice(boundary)
    .filter((action) => action?.type === "free" && Array.isArray(action.points) && action.points.length >= 4)
    .map((action) => action.points.map((point) => [point.x, point.y]));
}

export function updatePracticeDiagnostic(scoreOutput, feedbackOutput, analysis, translate) {
  if (scoreOutput) {
    scoreOutput.value = `${analysis.score}%`;
  }
  if (feedbackOutput) {
    feedbackOutput.textContent = translate("practice.feedback.summary", {
      coverage: analysis.coverage,
      missing: analysis.missingStrokes,
      extra: analysis.extraStrokes,
      penalty: analysis.extraPenalty,
      proportion: analysis.proportionScore,
      orientation: analysis.orientationScore,
    });
  }
}
