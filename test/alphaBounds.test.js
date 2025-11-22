import { computeAlphaBounds, mergeBounds, padBounds } from '../src/utils/alphaBounds.js';

function setAlpha(pixels, width, x, y, alpha) {
  const idx = (y * width + x) * 4 + 3;
  pixels[idx] = alpha;
}

describe('alphaBounds utilities', () => {
  test('computeAlphaBounds returns null when fully transparent', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    expect(computeAlphaBounds(pixels, 4, 4)).toBeNull();
  });

  test('computeAlphaBounds finds correct min/max extents', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    setAlpha(pixels, 4, 1, 1, 255);
    setAlpha(pixels, 4, 2, 3, 255);

    expect(computeAlphaBounds(pixels, 4, 4)).toEqual({ x: 1, y: 1, width: 2, height: 3 });
  });

  test('mergeBounds combines multiple boxes', () => {
    const bounds = mergeBounds([
      { x: 2, y: 2, width: 5, height: 5 },
      null,
      { x: 10, y: 4, width: 3, height: 2 }
    ]);

    expect(bounds).toEqual({ x: 2, y: 2, width: 11, height: 5 });
  });

  test('padBounds expands and clamps to canvas size', () => {
    const padded = padBounds({ x: 5, y: 5, width: 10, height: 10 }, 8, 20, 20);
    expect(padded).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });
});
