// Photo preprocessing shared by import and later recognition stages.

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function percentile(values, fraction) {
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))];
}

function otsuThreshold(histogram, total = histogram.reduce((sum, count) => sum + count, 0)) {
  if (!total) return 0;
  let sum = 0;
  for (let i = 0; i < histogram.length; i += 1) sum += i * histogram[i];
  let weightBackground = 0;
  let sumBackground = 0;
  let bestVariance = -1;
  let bestThreshold = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    weightBackground += histogram[i];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;
    sumBackground += i * histogram[i];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = i;
    }
  }
  return bestThreshold;
}

function coarseBackground(luma, width, height) {
  const cellSize = Math.max(8, Math.ceil(Math.min(width, height) / 16));
  const columns = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const values = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const samples = [];
      const left = column * cellSize;
      const top = row * cellSize;
      const right = Math.min(width, left + cellSize);
      const bottom = Math.min(height, top + cellSize);
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) samples.push(luma[y * width + x]);
      }
      values[row * columns + column] = percentile(samples, 0.85);
    }
  }
  return { cellSize, columns, rows, values };
}

function backgroundAt(background, x, y) {
  const { cellSize, columns, rows, values } = background;
  const gridX = Math.min(columns - 1, x / cellSize - 0.5);
  const gridY = Math.min(rows - 1, y / cellSize - 0.5);
  const x0 = Math.max(0, Math.floor(gridX));
  const y0 = Math.max(0, Math.floor(gridY));
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, gridX - x0));
  const ty = Math.max(0, Math.min(1, gridY - y0));
  const top = values[y0 * columns + x0] * (1 - tx) + values[y0 * columns + x1] * tx;
  const bottom = values[y1 * columns + x0] * (1 - tx) + values[y1 * columns + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

function removeIsolatedPixels(mask, width, height) {
  const cleaned = new Uint8Array(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) neighbors += mask[ny * width + nx];
        }
      }
      if (!neighbors) cleaned[index] = 0;
    }
  }
  return cleaned;
}

function neighbourhoodMaximum(luma, width, height, x, y, radius) {
  let maximum = 0;
  for (const dy of [-radius, 0, radius]) {
    const sampleY = Math.max(0, Math.min(height - 1, y + dy));
    for (const dx of [-radius, 0, radius]) {
      const sampleX = Math.max(0, Math.min(width - 1, x + dx));
      maximum = Math.max(maximum, luma[sampleY * width + sampleX]);
    }
  }
  return maximum;
}

export function estimateInkMask(imageData) {
  const { data, width, height } = imageData;
  if (!width || !height) return new Uint8Array(0);
  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < pixelCount; i += 1) {
    const value = Math.max(0, Math.min(255, Math.round(luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))));
    luma[i] = value;
    histogram[value] += 1;
  }

  const background = coarseBackground(luma, width, height);
  const contrast = new Uint8Array(pixelCount);
  const backgroundEstimate = new Uint8Array(pixelCount);
  const neighbourhoodContrast = new Uint8Array(pixelCount);
  const contrastHistogram = new Array(256).fill(0);
  const neighbourhoodRadius = Math.max(background.cellSize * 4, Math.round(Math.min(width, height) * 0.35));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const localBackground = Math.max(0, Math.min(255, Math.round(backgroundAt(background, x, y))));
      backgroundEstimate[index] = localBackground;
      const value = Math.max(0, Math.min(255, localBackground - luma[index]));
      contrast[index] = value;
      neighbourhoodContrast[index] = Math.max(0, neighbourhoodMaximum(luma, width, height, x, y, neighbourhoodRadius) - luma[index]);
      contrastHistogram[value] += 1;
    }
  }

  const localThreshold = otsuThreshold(contrastHistogram);
  const globalThreshold = otsuThreshold(histogram);
  const globalPaper = percentile(Array.from(luma), 0.85);
  const globalOutlierThreshold = Math.max(32, Math.round(globalPaper * 0.35));
  const globalDarkCount = histogram.slice(0, globalThreshold + 1).reduce((sum, count) => sum + count, 0);
  const globalDarkFraction = globalDarkCount / pixelCount;
  const localReliabilityFloor = Math.max(24, Math.round(globalPaper * 0.7));
  const localSignal = contrastHistogram.slice(localThreshold + 1).reduce((sum, count) => sum + count, 0);
  const useLocalContrast = localSignal > 0 && localThreshold >= 3;
  const mask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) {
    const localInk = useLocalContrast && contrast[i] >= Math.max(6, Math.round(localThreshold * 0.55));
    const localBackgroundReliable = backgroundEstimate[i] >= localReliabilityFloor;
    const globalOutlier = globalDarkFraction < 0.25 && globalPaper - luma[i] > globalOutlierThreshold;
    const localOutlier = neighbourhoodContrast[i] >= globalOutlierThreshold;
    const globalInk = luma[i] <= globalThreshold && (!useLocalContrast || (!localBackgroundReliable && globalOutlier && localOutlier));
    mask[i] = localInk || globalInk ? 1 : 0;
  }
  return removeIsolatedPixels(mask, width, height);
}

export function inkBounds(mask, width, height, marginRatio = 0.06) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) return null;
  const marginX = Math.max(0, Math.round(width * marginRatio));
  const marginY = Math.max(0, Math.round(height * marginRatio));
  const paddedLeft = Math.max(0, left - marginX);
  const paddedTop = Math.max(0, top - marginY);
  const paddedRight = Math.min(width - 1, right + marginX);
  const paddedBottom = Math.min(height - 1, bottom + marginY);
  return {
    left: paddedLeft,
    top: paddedTop,
    right: paddedRight,
    bottom: paddedBottom,
    width: paddedRight - paddedLeft + 1,
    height: paddedBottom - paddedTop + 1,
  };
}

export function cropImageData(imageData, bounds) {
  const { data, width: sourceWidth } = imageData;
  const width = bounds.right - bounds.left + 1;
  const height = bounds.bottom - bounds.top + 1;
  const cropped = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((bounds.top + y) * sourceWidth + bounds.left) * 4;
    const targetStart = y * width * 4;
    cropped.set(data.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }
  return { data: cropped, width, height };
}
