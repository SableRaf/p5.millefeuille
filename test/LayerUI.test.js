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
});
