import { LayerSystem } from '../src/LayerSystem.js';
import { BlendModes } from '../src/constants.js';
import { createP5Stub } from './utils/p5Stub.js';

function createImageMask(width = 32, height = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return {
    canvas,
    width,
    height,
    loadPixels: jest.fn()
  };
}

describe('LayerSystem 2D mode', () => {
  test('createLayerSystem succeeds in 2D mode', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);

    expect(system.isWebGL).toBe(false);
  });

  test('createLayer creates graphics-backed layers', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('TwoD');

    expect(layer.graphics).toBeTruthy();
    expect(layer.framebuffer).toBeNull();
  });

  test('2D mode rejects ADD and SUBTRACT blend modes', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Blend');

    expect(() => layer.setBlendMode(BlendModes.ADD)).toThrow(/not supported in 2D mode/i);
    expect(() => layer.setBlendMode(BlendModes.SUBTRACT)).toThrow(/not supported in 2D mode/i);
    expect(() => layer.setBlendMode(BlendModes.MULTIPLY)).not.toThrow();
  });

  test('2D mode validates mask sources positively', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Mask');
    const graphicsMask = p5.createGraphics(64, 64);
    const imageMask = createImageMask();
    const framebufferLike = p5.createFramebuffer({ width: 64, height: 64 });

    expect(() => layer.setMask(framebufferLike)).toThrow(/p5\.Image or p5\.Graphics/i);
    expect(() => layer.setMask(imageMask)).not.toThrow();
    expect(() => layer.setMask(graphicsMask)).not.toThrow();
  });

  test('begin/end swaps renderer and restores it', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Swap');
    const originalRenderer = p5._renderer;
    const originalContext = p5.drawingContext;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    system.begin('Swap');
    expect(p5._renderer).toBe(layer.graphics._renderer);
    expect(p5.drawingContext).toBe(layer.graphics.drawingContext);

    system.end();
    expect(p5._renderer).toBe(originalRenderer);
    expect(p5.drawingContext).toBe(originalContext);

    expect(() => system.end()).not.toThrow();
    warnSpy.mockRestore();
  });

  test('begin on another layer warns and auto-recovers previous swap', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const foo = system.createLayer('foo');
    const bar = system.createLayer('bar');
    const originalRenderer = p5._renderer;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    system.begin('foo');
    try {
      throw new Error('boom');
    } catch (_) {
      // simulate user code swallowing an exception without calling end()
    }

    system.begin('bar');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already active'));
    expect(p5._renderer).toBe(bar.graphics._renderer);

    system.end();
    expect(p5._renderer).toBe(originalRenderer);
    expect(foo.graphics).toBeTruthy();
    warnSpy.mockRestore();
  });

  test('explicit late end recovers renderer after user exception', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    system.createLayer('foo');
    const originalRenderer = p5._renderer;

    system.begin('foo');
    expect(() => {
      throw new Error('user code blew up');
    }).toThrow('user code blew up');

    system.end();
    expect(p5._renderer).toBe(originalRenderer);
  });

  test('clearAll calls surface.clear on each layer without throwing', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const a = system.createLayer('A');
    const b = system.createLayer('B');
    const clearA = jest.spyOn(a.surface, 'clear');
    const clearB = jest.spyOn(b.surface, 'clear');

    expect(() => system.clearAll()).not.toThrow();
    expect(clearA).toHaveBeenCalledTimes(1);
    expect(clearB).toHaveBeenCalledTimes(1);
  });

  test('render writes composited result to host drawing context', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    system.createLayer('A');
    system._uriApplied = true;

    system.render();

    expect(p5.drawingContext.drawImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      0,
      0,
      p5.width,
      p5.height
    );
  });

  test('render isolates host state and clear callback context', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    system.createLayer('A');
    system._uriApplied = true;
    p5.drawingContext.globalCompositeOperation = 'multiply';
    p5.drawingContext.globalAlpha = 0.2;

    system.render(() => p5.background(255, 0, 0));

    expect(p5.drawingContext.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(p5.background).toHaveBeenCalledWith(255, 0, 0);
    expect(p5.drawingContext.drawImage).toHaveBeenCalledWith(
      expect.any(HTMLCanvasElement),
      0,
      0,
      p5.width,
      p5.height
    );
  });

  test('resize replaces the underlying graphics and removes the old one', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Resize');
    const originalGraphics = layer.graphics;

    layer.resize(300, 200, 2);

    expect(originalGraphics.remove).toHaveBeenCalledTimes(1);
    expect(layer.graphics).not.toBe(originalGraphics);
    expect(layer.width).toBe(300);
    expect(layer.height).toBe(200);
    expect(layer.density).toBe(2);
  });

  test('resize while active warns and restores host renderer first', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('ResizeActive');
    const originalRenderer = p5._renderer;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    system.begin('ResizeActive');
    layer.resize(320, 240, 1);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('resize called on active layer'));
    expect(p5._renderer).toBe(originalRenderer);
    warnSpy.mockRestore();
  });

  test('dispose removes graphics surfaces', () => {
    const p5 = createP5Stub({ webgl: false });
    const system = new LayerSystem(p5);
    const layer = system.createLayer('Dispose');
    const graphics = layer.graphics;

    system.dispose();

    expect(graphics.remove).toHaveBeenCalled();
  });
});
