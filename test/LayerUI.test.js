import { LayerSystem } from '../src/LayerSystem.js';
import { createP5Stub } from './utils/p5Stub.js';

describe('LayerUI', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('keyboard move swaps DOM nodes and keeps selection', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const bottom = system.createLayer('Bottom');
    const top = system.createLayer('Top');
    const ui = system.createUI();
    ui.update();

    ui._selectLayer(top.id);
    const spy = jest.spyOn(ui, '_markThumbnailsDirty').mockImplementation(() => {});

    ui._moveSelectedLayer(1);

    expect(system.getLayers().map((layer) => layer.id)).toEqual([top.id, bottom.id]);
    expect([...ui.layersContainer.children].map((child) => Number(child.dataset.layerId))).toEqual([
      bottom.id,
      top.id
    ]);
    expect(ui.selectedLayerId).toBe(top.id);
    expect(spy).toHaveBeenCalledWith([top.id, bottom.id]);

    spy.mockRestore();
    ui.dispose();
  });

  test('applyBoundsToCache pads and merges recent windows', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Bounds');
    const ui = system.createUI({
      thumbnailAutoUpdate: true, // Enable smoothing mode for this test
      thumbnailPadding: 5,
      thumbnailAnimationWindow: 2,
      thumbnailEmptyFrameReset: 3
    });

    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    const sourceSize = { width: 100, height: 80 };

    ui._applyBoundsToCache(cacheEntry, { x: 10, y: 10, width: 10, height: 10 }, sourceSize);
    expect(cacheEntry.drawBounds).toEqual({ x: 5, y: 5, width: 20, height: 20 });

    ui._applyBoundsToCache(cacheEntry, { x: 50, y: 5, width: 10, height: 10 }, sourceSize);
    expect(cacheEntry.drawBounds).toEqual({ x: 5, y: 0, width: 60, height: 25 });

    ui.dispose();
  });

  test('applyBoundsToCache falls back to full canvas after empty frames', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Bounds');
    const ui = system.createUI({
      thumbnailAutoUpdate: true, // Enable smoothing mode for this test
      thumbnailPadding: 4,
      thumbnailAnimationWindow: 2,
      thumbnailEmptyFrameReset: 2
    });

    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    const sourceSize = { width: 120, height: 60 };

    ui._applyBoundsToCache(cacheEntry, { x: 20, y: 10, width: 20, height: 20 }, sourceSize);
    const padded = cacheEntry.drawBounds;
    expect(padded).toEqual({ x: 16, y: 6, width: 28, height: 28 });

    ui._applyBoundsToCache(cacheEntry, null, sourceSize);
    expect(cacheEntry.drawBounds).toEqual(padded);

    ui._applyBoundsToCache(cacheEntry, null, sourceSize);
    expect(cacheEntry.drawBounds).toEqual({ x: 0, y: 0, width: 120, height: 60 });

    ui.dispose();
  });

  test('drawThumbnailImage keeps original aspect ratio', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const ui = system.createUI();

    const ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      drawImage: jest.fn(),
      imageSmoothingEnabled: true
    };
    const targetCanvas = { width: 60, height: 60 };
    const sourceCanvas = { width: 200, height: 100 };
    const bounds = { x: 50, y: 25, width: 40, height: 50 };

    ui._drawThumbnailImage(ctx, targetCanvas, sourceCanvas, bounds);

      const scale = Math.min(60 / bounds.width, 60 / bounds.height);
      const expectedDestWidth = bounds.width * scale;
      const expectedDestHeight = bounds.height * scale;
      const expectedDestX = (60 - expectedDestWidth) / 2;
      const expectedDestY = (60 - expectedDestHeight) / 2;

    expect(ctx.drawImage).toHaveBeenCalledWith(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
        expectedDestX,
        expectedDestY,
      expectedDestWidth,
      expectedDestHeight
    );

    ui.dispose();
  });

  test('cropAmount grows as crop gets tighter', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const ui = system.createUI();

    const sourceCanvas = { width: 200, height: 200 };
    const looseBounds = { width: 180, height: 180 };
    const tightBounds = { width: 40, height: 40 };

    const amountLoose = ui._getCropAmount(sourceCanvas, looseBounds);
    const amountTight = ui._getCropAmount(sourceCanvas, tightBounds);

    expect(amountTight).toBeGreaterThan(amountLoose);

    ui.dispose();
  });

  test('checkerboard scale grows with cropAmount', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const ui = system.createUI();

    const scaleNoCrop = ui._getCheckerboardScale(0);
    const scaleMid = ui._getCheckerboardScale(0.3);
    const scaleHigh = ui._getCheckerboardScale(0.8);

    expect(scaleMid).toBeGreaterThan(scaleNoCrop);
    expect(scaleHigh).toBeGreaterThan(scaleMid);

    ui.dispose();
  });

  test('default mode skips automatic updates for existing thumbnails', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Solo');
    const ui = system.createUI(); // thumbnailAutoUpdate defaults to false
    ui.update();

    // Pretend this layer already has a cached thumbnail
    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    cacheEntry.image = { canvas: document.createElement('canvas') };

    // Clear state from initial update() call
    ui._captureNeeded.clear();
    ui._dirtyThumbnailLayerIds.clear();

    const flushSpy = jest.spyOn(ui, '_scheduleThumbnailFlush');

    // Mark the layer dirty as if it had been redrawn
    ui._markThumbnailsDirty([layer.id], { needsCapture: true });

    // With thumbnailAutoUpdate=false, automatic updates are skipped entirely
    expect(ui._captureNeeded.has(layer.id)).toBe(false);
    expect(ui._dirtyThumbnailLayerIds.has(layer.id)).toBe(false);
    expect(flushSpy).not.toHaveBeenCalled();

    flushSpy.mockRestore();
    ui.dispose();
  });

  test('default mode still schedules initial capture', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Fresh');
    const ui = system.createUI(); // thumbnailAutoUpdate defaults to false
    ui.update();

    const flushSpy = jest.spyOn(ui, '_scheduleThumbnailFlush');

    ui._markThumbnailsDirty([layer.id], { needsCapture: true });

    expect(flushSpy).toHaveBeenCalled();

    flushSpy.mockRestore();
    ui.dispose();
  });

  test('warns when thumbnailUpdateEvery is set but thumbnailAutoUpdate is false', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const ui = system.createUI({
      thumbnailAutoUpdate: false,
      thumbnailUpdateEvery: 5
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('thumbnailUpdateEvery is set but thumbnailAutoUpdate is false')
    );

    warnSpy.mockRestore();
    ui.dispose();
  });

  test('does not warn when thumbnailUpdateEvery is set and thumbnailAutoUpdate is true', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const ui = system.createUI({
      thumbnailAutoUpdate: true,
      thumbnailUpdateEvery: 5
    });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    ui.dispose();
  });

  test('thumbnailAutoUpdate true with no thumbnailUpdateEvery updates every frame', () => {
    const p5 = createP5Stub();
    p5.frameCount = 1;
    const system = new LayerSystem(p5);
    const layer = system.createLayer('AutoUpdate');
    const ui = system.createUI({ thumbnailAutoUpdate: true });
    ui.update();

    // Pretend this layer already has a cached thumbnail
    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    cacheEntry.image = { canvas: document.createElement('canvas') };

    // Clear state from initial update() call
    ui._captureNeeded.clear();
    ui._dirtyThumbnailLayerIds.clear();

    const flushSpy = jest.spyOn(ui, '_scheduleThumbnailFlush');

    // Mark the layer dirty - should update because thumbnailAutoUpdate is true
    ui._markThumbnailsDirty([layer.id], { needsCapture: true });

    expect(ui._dirtyThumbnailLayerIds.has(layer.id)).toBe(true);
    expect(ui._captureNeeded.has(layer.id)).toBe(true);
    expect(flushSpy).toHaveBeenCalled();

    flushSpy.mockRestore();
    ui.dispose();
  });

  test('thumbnailAutoUpdate true with thumbnailUpdateEvery respects frame interval', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Interval');
    const ui = system.createUI({
      thumbnailAutoUpdate: true,
      thumbnailUpdateEvery: 3
    });
    ui.update();

    // Pretend this layer already has a cached thumbnail
    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    cacheEntry.image = { canvas: document.createElement('canvas') };

    // Clear state from initial update() call
    ui._captureNeeded.clear();
    ui._dirtyThumbnailLayerIds.clear();

    const flushSpy = jest.spyOn(ui, '_scheduleThumbnailFlush');

    // Frame 1: not a multiple of 3, should skip
    p5.frameCount = 1;
    ui._markThumbnailsDirty([layer.id], { needsCapture: true });
    expect(ui._dirtyThumbnailLayerIds.has(layer.id)).toBe(false);
    expect(flushSpy).not.toHaveBeenCalled();

    // Frame 3: multiple of 3, should update
    p5.frameCount = 3;
    ui._markThumbnailsDirty([layer.id], { needsCapture: true });
    expect(ui._dirtyThumbnailLayerIds.has(layer.id)).toBe(true);
    expect(flushSpy).toHaveBeenCalled();

    flushSpy.mockRestore();
    ui.dispose();
  });

  test('thumbnailAutoUpdate false ignores thumbnailUpdateEvery', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const layer = system.createLayer('Ignored');
    const ui = system.createUI({
      thumbnailAutoUpdate: false,
      thumbnailUpdateEvery: 1 // Even with update every frame, should be ignored
    });
    ui.update();

    // Pretend this layer already has a cached thumbnail
    const cacheEntry = ui._getOrCreateThumbnailCacheEntry(layer.id);
    cacheEntry.image = { canvas: document.createElement('canvas') };

    // Clear state from initial update() call
    ui._captureNeeded.clear();
    ui._dirtyThumbnailLayerIds.clear();

    const flushSpy = jest.spyOn(ui, '_scheduleThumbnailFlush');

    // Even on frame 1 with thumbnailUpdateEvery=1, should not update
    p5.frameCount = 1;
    ui._markThumbnailsDirty([layer.id], { needsCapture: true });
    expect(ui._dirtyThumbnailLayerIds.has(layer.id)).toBe(false);
    expect(flushSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    flushSpy.mockRestore();
    ui.dispose();
  });
});
