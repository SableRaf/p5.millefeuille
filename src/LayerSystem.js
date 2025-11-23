import { Layer } from './Layer.js';
import { Compositor } from './Compositor.js';
import { BlendModes } from './constants.js';
import { LayerUI } from './LayerUI.js';

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
    if (!this.p._renderer || !this.p._renderer.drawingContext) {
      throw new Error('Canvas not initialized. Make sure createCanvas() is called before createLayerSystem()');
    }

    if (this.p._renderer.drawingContext instanceof WebGLRenderingContext ||
        this.p._renderer.drawingContext instanceof WebGL2RenderingContext) {
      // WebGL mode confirmed
    } else {
      throw new Error('LayerSystem requires WebGL mode. Use createCanvas(w, h, WEBGL)');
    }

    this.layers = new Map(); // id -> Layer
    this.layerNames = new Map(); // name -> id (for string-based lookups)
    this.layerIdCounter = 0;
    this.activeLayerId = null;
    this.compositor = new Compositor(p5Instance);
    this.ui = null; // LayerUI instance

    // Track if we're auto-resizing
    this.autoResize = true;
    this._lastCanvasWidth = this.p.width;
    this._lastCanvasHeight = this.p.height;
    this._lastPixelDensity = this.p.pixelDensity();
  }

  /**
   * Generates a unique layer ID
   * @private
   */
  _generateId() {
    return this.layerIdCounter++;
  }

  /**
   * Gets a layer by ID or name
   * @private
   * @param {number|string} layerIdOrName - The layer ID (number) or name (string)
   * @returns {Layer|null} The layer, or null if not found
   */
  _getLayerById(layerIdOrName) {
    // If it's a number, look up directly by ID
    if (typeof layerIdOrName === 'number') {
      return this.layers.get(layerIdOrName) || null;
    }
    
    // If it's a string, look up by name first
    if (typeof layerIdOrName === 'string') {
      const id = this.layerNames.get(layerIdOrName);
      if (id !== undefined) {
        return this.layers.get(id) || null;
      }
    }
    
    return null;
  }

  /**
   * Creates a new layer
   * @param {string} name - Optional name for the layer
   * @param {Object} options - Layer configuration options
   * @returns {Layer} The created layer instance
   */
  createLayer(name = '', options = {}) {
    const id = this._generateId();
    const layerName = name || `Layer ${id}`;
    const layer = new Layer(this.p, id, layerName, {
      ...options,
      zIndex: options.zIndex !== undefined ? options.zIndex : id
    });

    this.layers.set(id, layer);
    
    // Register the name for string-based lookups
    if (layerName) {
      this.layerNames.set(layerName, id);
    }
    
    return layer;
  }

  /**
   * Removes a layer and disposes of its resources
   * @param {number|string} layerIdOrName - The ID or name of the layer to remove
   */
  removeLayer(layerIdOrName) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return;
    }

    // If this layer is currently active, end it
    if (this.activeLayerId === layer.id) {
      this.end();
    }

    // Remove from name map if it has a name
    if (layer.name) {
      this.layerNames.delete(layer.name);
    }

    layer.dispose();
    this.layers.delete(layer.id);
  }

  /**
   * Gets a layer by ID or name
   * @param {number|string} layerIdOrName - The layer ID or name
   * @returns {Layer|null} The layer, or null if not found
   */
  getLayer(layerIdOrName) {
    return this._getLayerById(layerIdOrName);
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
   * @param {number|string} layerIdOrName - The ID or name of the layer to draw to
   */
  begin(layerIdOrName) {
    // Check if another layer is already active
    if (this.activeLayerId !== null) {
      console.warn(`Layer ${this.activeLayerId} is already active. Ending it first.`);
      this.end();
    }

    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.error(`Layer ${layerIdOrName} not found`);
      return;
    }

    layer.begin();
    this.activeLayerId = layer.id;
  }

  /**
   * Ends drawing to the current layer
   */
  end() {
    if (this.activeLayerId === null) {
      console.warn('No active layer to end');
      return;
    }

    const layer = this.layers.get(this.activeLayerId);
    if (layer) {
      layer.end();

      if (this.ui && typeof this.ui.scheduleThumbnailUpdate === 'function') {
        this.ui.scheduleThumbnailUpdate(layer.id, { needsCapture: true });
      }
    }

    this.activeLayerId = null;
  }

  /**
   * Shows a layer (makes it visible)
   * @param {number|string} layerIdOrName - The layer ID or name
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  show(layerIdOrName) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.show();
  }

  /**
   * Hides a layer (makes it invisible)
   * @param {number|string} layerIdOrName - The layer ID or name
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  hide(layerIdOrName) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.hide();
  }

  /**
   * Sets the opacity of a layer
   * @param {number|string} layerIdOrName - The layer ID or name
   * @param {number} opacity - Opacity value between 0 and 1
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  setOpacity(layerIdOrName, opacity) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.setOpacity(opacity);
  }

  /**
   * Sets the blend mode of a layer
   * @param {number|string} layerIdOrName - The layer ID or name
   * @param {string} blendMode - One of the BlendModes constants
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  setBlendMode(layerIdOrName, blendMode) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.setBlendMode(blendMode);
  }

  /**
   * Sets the z-index of a layer
   * @param {number|string} layerIdOrName - The layer ID or name
   * @param {number} zIndex - The new z-index (higher = on top)
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  setLayerIndex(layerIdOrName, zIndex) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.setZIndex(zIndex);
  }

  /**
   * Moves a layer by a relative amount in the stack
   * @param {number|string} layerIdOrName - The layer ID or name
   * @param {number} delta - The amount to move (positive = forward, negative = backward)
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  moveLayer(layerIdOrName, delta) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.setZIndex(layer.zIndex + delta);
  }

  /**
   * Reorders layers to match a new array order
   * @param {Layer[]} orderedLayers - Array of layers in the desired order
   */
  reorderLayers(orderedLayers) {
    // Update zIndex for each layer based on its position in the array
    orderedLayers.forEach((layer, index) => {
      layer.setZIndex(index);
    });
  }

  /**
   * Attaches a mask to a layer
   * @param {number|string} layerIdOrName - The layer ID or name
   * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  setMask(layerIdOrName, maskSource) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.setMask(maskSource);
  }

  /**
   * Removes the mask from a layer
   * @param {number|string} layerIdOrName - The layer ID or name
   * @returns {Layer|null} The layer for chaining, or null if not found
   */
  clearMask(layerIdOrName) {
    const layer = this._getLayerById(layerIdOrName);
    if (!layer) {
      console.warn(`Layer ${layerIdOrName} not found`);
      return null;
    }
    return layer.clearMask();
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

    // Sync UI state if UI exists
    if (this.ui) {
      this.ui.syncState();
    }
  }

  /**
   * Checks if canvas was resized and updates layers accordingly
   * @private
   */
  _checkResize() {
    const currentWidth = this.p.width;
    const currentHeight = this.p.height;
    const currentDensity = this.p.pixelDensity();

    const sizeChanged = currentWidth !== this._lastCanvasWidth ||
      currentHeight !== this._lastCanvasHeight;
    const densityChanged = currentDensity !== this._lastPixelDensity;

    if (!sizeChanged && !densityChanged) {
      return;
    }

    this._lastCanvasWidth = currentWidth;
    this._lastCanvasHeight = currentHeight;
    this._lastPixelDensity = currentDensity;

    // Resize all canvas-synced layers
    for (const layer of this.layers.values()) {
      if (!layer.customSize) {
        layer.resize(currentWidth, currentHeight, currentDensity);
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
   * Creates and shows a UI panel for controlling layers
   * @param {Object} options - UI configuration options
   * @returns {LayerUI} The created UI instance
   */
  createUI(options = {}) {
    // Dispose existing UI if any
    if (this.ui) {
      this.ui.dispose();
    }

    this.ui = new LayerUI(this, options);
    this.ui.update();
    return this.ui;
  }

  /**
   * Updates the UI if it exists
   */
  updateUI() {
    if (this.ui) {
      this.ui.update();
    }
  }

  /**
   * Disposes of all layers and resources
   */
  dispose() {
    // End active layer if any
    if (this.activeLayerId !== null) {
      this.end();
    }

    // Dispose UI if exists
    if (this.ui) {
      this.ui.dispose();
      this.ui = null;
    }

    // Dispose all layers
    for (const layer of this.layers.values()) {
      layer.dispose();
    }

    this.layers.clear();
    this.compositor.dispose();
  }
}
