import { LayerSystem } from '../src/LayerSystem.js';
import { createP5Stub } from './utils/p5Stub.js';

describe('LayerSystem', () => {
  test('reorderLayers updates zIndex ordering', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);

    const bottom = system.createLayer('Bottom');
    const top = system.createLayer('Top');

    expect(system.getLayers().map((layer) => layer.name)).toEqual(['Bottom', 'Top']);

    system.reorderLayers([top, bottom]);

    expect(top.zIndex).toBe(0);
    expect(bottom.zIndex).toBe(1);
    expect(system.getLayers().map((layer) => layer.name)).toEqual(['Top', 'Bottom']);
  });

  test('end() notifies UI to capture thumbnails', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Solo');

    system.ui = {
      scheduleThumbnailUpdate: jest.fn()
    };

    system.begin(layer.id);
    system.end();

    expect(system.ui.scheduleThumbnailUpdate).toHaveBeenCalledWith(layer.id, { needsCapture: true });
  });

  test('auto-resize skips layers with custom dimensions', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);

    const customLayer = system.createLayer('Custom', { width: 512 });
    const resizeSpy = jest.spyOn(customLayer, 'resize');

    // Simulate canvas resize
    p5.width = 1280;
    p5.height = 720;
    system._checkResize();

    expect(resizeSpy).not.toHaveBeenCalled();
    expect(customLayer.customSize).toBe(true);
  });

  test('auto-resize syncs canvas-sized layers and updates density', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);

    const layer = system.createLayer('Default');
    const resizeSpy = jest.spyOn(layer, 'resize');
    const originalFramebuffer = layer.framebuffer;

    p5.width = 900;
    p5.height = 700;
    p5.setPixelDensity(2);
    system._checkResize();

    expect(resizeSpy).toHaveBeenCalledTimes(1);
    expect(layer.width).toBe(900);
    expect(layer.height).toBe(700);
    expect(layer.density).toBe(2);
    expect(layer.customSize).toBe(false);
    expect(layer.framebuffer).not.toBe(originalFramebuffer);
  });

  test('pixel density changes trigger framebuffer recreation even without size change', () => {
    const p5 = createP5Stub();
    const system = new LayerSystem(p5);

    const layer = system.createLayer('Default');
    const resizeSpy = jest.spyOn(layer, 'resize');
    const originalFramebuffer = layer.framebuffer;

    p5.setPixelDensity(2);
    system._checkResize();

    expect(resizeSpy).toHaveBeenCalledTimes(1);
    expect(layer.density).toBe(2);
    expect(layer.framebuffer).not.toBe(originalFramebuffer);
  });
});
