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

    const scale = Math.min(60 / 200, 60 / 100); // 0.3
    const expectedDestWidth = bounds.width * scale;
    const expectedDestHeight = bounds.height * scale;
    const expectedOffsetX = (60 - (200 * scale)) / 2 + bounds.x * scale;
    const expectedOffsetY = (60 - (100 * scale)) / 2 + bounds.y * scale;

    expect(ctx.drawImage).toHaveBeenCalledWith(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      expectedOffsetX,
      expectedOffsetY,
      expectedDestWidth,
      expectedDestHeight
    );

    ui.dispose();
  });
});
