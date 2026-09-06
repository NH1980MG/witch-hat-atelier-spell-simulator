import { CANVAS_SYMBOL_MODEL } from './canvas-symbol-model-data.mjs';
import { createCanvasRecognitionSample } from './symbol-recognition-sample.mjs';
import { recognizeHybridSymbol, emptyRecognitionResult } from './symbol-recognition-hybrid.mjs';

export function recognizeCanvasSymbol(actions, symbolPaths) {
  try {
    return recognizeHybridSymbol(createCanvasRecognitionSample(actions), CANVAS_SYMBOL_MODEL, symbolPaths);
  } catch {
    return emptyRecognitionResult('canvas-strokes', CANVAS_SYMBOL_MODEL.version, 'fallback');
  }
}
