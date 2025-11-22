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
});
