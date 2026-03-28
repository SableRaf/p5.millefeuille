import { parseLayerParams } from '../src/URIStateReader.js';

describe('parseLayerParams', () => {
  test('parse valid opacity (float between 0-1)', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.opacity=0.5');
    expect(layers.get('bg').opacity).toBe(0.5);
  });

  test('parse valid visible true', () => {
    const { layers } = parseLayerParams('layers', '?layers.fg.visible=true');
    expect(layers.get('fg').visible).toBe(true);
  });

  test('parse valid visible false', () => {
    const { layers } = parseLayerParams('layers', '?layers.fg.visible=false');
    expect(layers.get('fg').visible).toBe(false);
  });

  test('parse valid visible 1', () => {
    const { layers } = parseLayerParams('layers', '?layers.fg.visible=1');
    expect(layers.get('fg').visible).toBe(true);
  });

  test('parse valid visible 0', () => {
    const { layers } = parseLayerParams('layers', '?layers.fg.visible=0');
    expect(layers.get('fg').visible).toBe(false);
  });

  test('parse valid blendMode (known blend mode, case-insensitive)', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.blendMode=multiply');
    expect(layers.get('bg').blendMode).toBe('MULTIPLY');
  });

  test('skip invalid opacity (NaN)', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.opacity=abc');
    expect(layers.has('bg')).toBe(false);
  });

  test('skip invalid opacity (out of range)', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.opacity=1.5');
    expect(layers.has('bg')).toBe(false);
  });

  test('skip invalid visible value', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.visible=yes');
    expect(layers.has('bg')).toBe(false);
  });

  test('skip invalid blendMode value', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.blendMode=NOTAMODE');
    expect(layers.has('bg')).toBe(false);
  });

  test('skip unrecognized property names', () => {
    const { layers } = parseLayerParams('layers', '?layers.bg.color=red');
    expect(layers.has('bg')).toBe(false);
  });

  test('handle empty query string', () => {
    const { layers, show } = parseLayerParams('layers', '');
    expect(layers.size).toBe(0);
    expect(show).toBeNull();
  });

  test('handle no query string (undefined)', () => {
    // In test environment there's no window.location; falls back to ''
    const { layers, show } = parseLayerParams('layers', undefined);
    expect(layers.size).toBe(0);
    expect(show).toBeNull();
  });

  test('multiple layers with multiple properties', () => {
    const { layers } = parseLayerParams(
      'layers',
      '?layers.bg.opacity=0.5&layers.bg.blendMode=SCREEN&layers.fg.visible=false'
    );
    expect(layers.get('bg').opacity).toBe(0.5);
    expect(layers.get('bg').blendMode).toBe('SCREEN');
    expect(layers.get('fg').visible).toBe(false);
  });

  test('custom baseName: parseLayerParams("myLayers", ...) works', () => {
    const { layers } = parseLayerParams('myLayers', '?myLayers.bg.opacity=0.5');
    expect(layers.get('bg').opacity).toBe(0.5);
  });

  test('custom baseName ignores default prefix', () => {
    const { layers } = parseLayerParams('myLayers', '?layers.bg.opacity=0.5');
    expect(layers.size).toBe(0);
  });

  test('show param: returns show array', () => {
    const { show } = parseLayerParams('layers', '?layers.show=bg,fg');
    expect(show).toEqual(new Set(['bg', 'fg']));
  });

  test('show param absent: result.show is null', () => {
    const { show } = parseLayerParams('layers', '?layers.bg.opacity=0.5');
    expect(show).toBeNull();
  });

  test('show param with custom baseName', () => {
    const { show } = parseLayerParams('myLayers', '?myLayers.show=bg');
    expect(show).toEqual(new Set(['bg']));
  });

  test('show param combined with per-layer properties', () => {
    const { layers, show } = parseLayerParams(
      'layers',
      '?layers.show=bg,fg&layers.bg.opacity=0.3'
    );
    expect(show).toEqual(new Set(['bg', 'fg']));
    expect(layers.get('bg').opacity).toBe(0.3);
  });
});
