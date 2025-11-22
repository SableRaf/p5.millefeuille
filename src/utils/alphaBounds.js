/**
 * Computes the tightest bounds that contain all pixels whose alpha exceeds the given threshold.
 * @param {Uint8ClampedArray} pixels - RGBA pixel data.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @param {Object} [options]
 * @param {number} [options.alphaThreshold=8] - Minimum alpha required to treat a pixel as visible.
 * @param {number} [options.stride=1] - Number of pixels to skip per step when scanning.
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function computeAlphaBounds(pixels, width, height, options = {}) {
  const threshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 8;
  const stride = Number.isFinite(options.stride) && options.stride > 0 ? Math.floor(options.stride) : 1;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += stride) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += stride) {
      const idx = rowOffset + x * 4;
      if (pixels[idx + 3] > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

/**
 * Merges multiple bounds objects into their combined extents.
 * @param {Array<{x:number,y:number,width:number,height:number}|null>} boundsList
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function mergeBounds(boundsList) {
  if (!Array.isArray(boundsList) || boundsList.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  for (const bounds of boundsList) {
    if (!bounds) {
      continue;
    }
    found = true;
    if (bounds.x < minX) minX = bounds.x;
    if (bounds.y < minY) minY = bounds.y;
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
  }

  if (!found) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

/**
 * Ensures bounds stay inside the provided limits.
 * @param {{x:number,y:number,width:number,height:number}|null} bounds
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function clampBounds(bounds, maxWidth, maxHeight) {
  if (!bounds) {
    return null;
  }

  const x = Math.max(0, Math.min(bounds.x, maxWidth));
  const y = Math.max(0, Math.min(bounds.y, maxHeight));
  const width = Math.max(0, Math.min(bounds.width, maxWidth - x));
  const height = Math.max(0, Math.min(bounds.height, maxHeight - y));

  return { x, y, width, height };
}

/**
 * Expands bounds by padding while clamping to limits.
 * @param {{x:number,y:number,width:number,height:number}|null} bounds
 * @param {number} padding
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
export function padBounds(bounds, padding, maxWidth, maxHeight) {
  if (!bounds) {
    return null;
  }
  const padded = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2
  };
  return clampBounds(padded, maxWidth, maxHeight);
}
