import { Layer } from './Layer.js';
import { Compositor } from './Compositor.js';
import { BlendModes } from './constants.js';

/**
 * Main layer system manager
 */
export class LayerSystem {
  /**
   * @param {p5} p5Instance - The p5.js instance
   */
  constructor(p5Instance) {
    this.p = p5Instance;

    // Validate WebGL mode
    if (this.p._renderer.drawingContext instanceof WebGLRenderingContext ||
        this.p._renderer.drawingContext instanceof WebGL2RenderingContext) {
      // WebGL mode confirmed
    } else {
      throw new Error('LayerSystem requires WebGL mode. Use createCanvas(w, h, WEBGL)');
    }

    this.layers = new Map(); // id -> Layer
    this.layerIdCounter = 0;
    this.activeLayerId = null;
    this.compositor = new Compositor(p5Instance);

    // Track if we're auto-resizing
    this.autoResize = true;
    this._lastCanvasWidth = this.p.width;
    this._lastCanvasHeight = this.p.height;
  }

  /**
   * Generates a unique layer ID
   * @private
   */
  _generateId() {
    return this.layerIdCounter++;
  }

  /**
   * Creates a new layer
   * @param {string} name - Optional name for the layer
   * @param {Object} options - Layer configuration options
   * @returns {number} The layer ID
   */
  createLayer(name = '', options = {}) {
    const id = this._generateId();
    const layer = new Layer(this.p, id, name, {
      ...options,
      zIndex: options.zIndex !== undefined ? options.zIndex : id
    });

    this.layers.set(id, layer);
    return id;
  }

  /**
   * Removes a layer and disposes of its resources
   * @param {number} layerId - The ID of the layer to remove
   */
  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    // If this layer is currently active, end it
    if (this.activeLayerId === layerId) {
      this.endLayer();
    }

    layer.dispose();
    this.layers.delete(layerId);
  }

  /**
   * Gets a layer by ID
   * @param {number} layerId - The layer ID
   * @returns {Layer|null} The layer, or null if not found
   */
  getLayer(layerId) {
    return this.layers.get(layerId) || null;
  }

  /**
   * Gets all layers as an array, sorted by zIndex
   * @returns {Layer[]} Array of layers
   */
  getLayers() {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Gets layer information as plain objects
   * @returns {Object[]} Array of layer info objects
   */
  getLayerInfo() {
    return this.getLayers().map(layer => layer.toJSON());
  }

  /**
   * Begins drawing to a specific layer
   * @param {number} layerId - The ID of the layer to draw to
   */
  beginLayer(layerId) {
    // Check if another layer is already active
    if (this.activeLayerId !== null) {
      console.warn(`Layer ${this.activeLayerId} is already active. Ending it first.`);
      this.endLayer();
    }

    const layer = this.layers.get(layerId);
    if (!layer) {
      console.error(`Layer ${layerId} not found`);
      return;
    }

    layer.begin();
    this.activeLayerId = layerId;
  }

  /**
   * Ends drawing to the current layer
   */
  endLayer() {
    if (this.activeLayerId === null) {
      console.warn('No active layer to end');
      return;
    }

    const layer = this.layers.get(this.activeLayerId);
    if (layer) {
      layer.end();
    }

    this.activeLayerId = null;
  }

  /**
   * Sets the visibility of a layer
   * @param {number} layerId - The layer ID
   * @param {boolean} visible - Whether the layer should be visible
   */
  setVisible(layerId, visible) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setVisible(visible);
  }

  /**
   * Sets the opacity of a layer
   * @param {number} layerId - The layer ID
   * @param {number} opacity - Opacity value between 0 and 1
   */
  setOpacity(layerId, opacity) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setOpacity(opacity);
  }

  /**
   * Sets the blend mode of a layer
   * @param {number} layerId - The layer ID
   * @param {string} blendMode - One of the BlendModes constants
   */
  setBlendMode(layerId, blendMode) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setBlendMode(blendMode);
  }

  /**
   * Sets the z-index of a layer
   * @param {number} layerId - The layer ID
   * @param {number} zIndex - The new z-index (higher = on top)
   */
  setLayerIndex(layerId, zIndex) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setZIndex(zIndex);
  }

  /**
   * Moves a layer by a relative amount in the stack
   * @param {number} layerId - The layer ID
   * @param {number} delta - The amount to move (positive = forward, negative = backward)
   */
  moveLayer(layerId, delta) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setZIndex(layer.zIndex + delta);
  }

  /**
   * Attaches a mask to a layer
   * @param {number} layerId - The layer ID
   * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
   */
  setMask(layerId, maskSource) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.setMask(maskSource);
  }

  /**
   * Removes the mask from a layer
   * @param {number} layerId - The layer ID
   */
  clearMask(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }
    layer.clearMask();
  }

  /**
   * Renders all layers to the main canvas
   * @param {Function} clearCallback - Optional callback to clear the canvas before rendering
   */
  render(clearCallback = null) {
    // Check for canvas resize
    if (this.autoResize) {
      this._checkResize();
    }

    const layers = this.getLayers();
    this.compositor.render(layers, clearCallback);
  }

  /**
   * Checks if canvas was resized and updates layers accordingly
   * @private
   */
  _checkResize() {
    if (this.p.width !== this._lastCanvasWidth || this.p.height !== this._lastCanvasHeight) {
      this._lastCanvasWidth = this.p.width;
      this._lastCanvasHeight = this.p.height;

      // Resize all layers
      for (const layer of this.layers.values()) {
        // Only resize if layer doesn't have custom dimensions
        if (!layer.customSize) {
          layer.resize(this.p.width, this.p.height);
        }
      }
    }
  }

  /**
   * Enables or disables automatic layer resizing when canvas size changes
   * @param {boolean} enabled - Whether to enable auto-resize
   */
  setAutoResize(enabled) {
    this.autoResize = !!enabled;
  }

  /**
   * Disposes of all layers and resources
   */
  dispose() {
    // End active layer if any
    if (this.activeLayerId !== null) {
      this.endLayer();
    }

    // Dispose all layers
    for (const layer of this.layers.values()) {
      layer.dispose();
    }

    this.layers.clear();
    this.compositor.dispose();
  }
}

/**
 * Factory function to create a new LayerSystem
 * @param {p5} p5Instance - The p5.js instance (optional in instance mode, auto-detected)
 * @returns {LayerSystem} A new LayerSystem instance
 */
export function createLayerSystem(p5Instance) {
  // If no instance provided, try to use global p5 (in global mode)
  const p = p5Instance || (typeof window !== 'undefined' && window.p5 ? window : null);

  if (!p) {
    throw new Error('p5.js instance not found. Pass the p5 instance to createLayerSystem()');
  }

  return new LayerSystem(p);
}
