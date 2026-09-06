import { PHOTO_SYMBOL_MODEL } from './photo-symbol-model-data.mjs';
import { createPhotoRecognitionSample } from './symbol-recognition-sample.mjs';
import { recognizeHybridSymbol, emptyRecognitionResult } from './symbol-recognition-hybrid.mjs';

export function recognizePhotoSymbol(mask, width, height, symbolPaths) {
  try {
    return recognizeHybridSymbol(createPhotoRecognitionSample({ mask, width, height }), PHOTO_SYMBOL_MODEL, symbolPaths);
  } catch {
    return emptyRecognitionResult('imported-image', PHOTO_SYMBOL_MODEL.version, 'fallback');
  }
}
