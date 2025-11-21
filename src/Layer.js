import { BlendModes, DEFAULT_LAYER_OPTIONS } from './constants.js';

/**
 * Represents a single layer backed by a p5.Framebuffer
 */
export class Layer {
  /**
   * @param {p5} p5Instance - The p5.js instance
   * @param {string|number} id - Unique identifier for this layer
   * @param {string} name - Human-readable name for this layer
   * @param {Object} options - Layer configuration options
   */
  constructor(p5Instance, id, name = '', options = {}) {
    this.p = p5Instance;
    this.id = id;
    this.name = name || `Layer ${id}`;

    // Merge with defaults
    const opts = { ...DEFAULT_LAYER_OPTIONS, ...options };

    this.visible = opts.visible;
    this.opacity = this._clampOpacity(opts.opacity);
    this.blendMode = opts.blendMode;
    this.zIndex = opts.zIndex !== undefined ? opts.zIndex : id;

    // Framebuffer options
    this.width = opts.width || this.p.width;
    this.height = opts.height || this.p.height;
    this.density = opts.density || this.p.pixelDensity();
    this.depth = opts.depth;
    this.antialias = opts.antialias;

    // Mask reference (can be p5.Framebuffer or p5.Image)
    this.mask = null;

    // Track if layer has been drawn to at least once
    this.hasBeenDrawnTo = false;

    // Create the framebuffer
    this.framebuffer = this._createFramebuffer();

    if (!this.framebuffer) {
      throw new Error(`Failed to create framebuffer for layer ${this.name}`);
    }
  }

  /**
   * Creates the underlying p5.Framebuffer
   * @private
   */
  _createFramebuffer() {
    try {
      const options = {
        width: this.width,
        height: this.height,
        density: this.density
      };

      // Only add depth and antialias if explicitly set
      if (this.depth !== undefined) {
        options.depth = this.depth;
      }
      if (this.antialias !== undefined) {
        options.antialias = this.antialias;
      }

      return this.p.createFramebuffer(options);
    } catch (e) {
      console.error(`Error creating framebuffer for layer ${this.name}:`, e);
      return null;
    }
  }

  /**
   * Clamps opacity value to valid range [0, 1]
   * @private
   */
  _clampOpacity(value) {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Shows this layer (makes it visible)
   * @returns {Layer} This layer for chaining
   */
  show() {
    this.visible = true;
    return this;
  }

  /**
   * Hides this layer (makes it invisible)
   * @returns {Layer} This layer for chaining
   */
  hide() {
    this.visible = false;
    return this;
  }

  /**
   * Sets the opacity of this layer
   * @param {number} opacity - Opacity value between 0 and 1
   * @returns {Layer} This layer for chaining
   */
  setOpacity(opacity) {
    this.opacity = this._clampOpacity(opacity);
    return this;
  }

  /**
   * Sets the blend mode for this layer
   * @param {string} mode - One of the BlendModes constants
   * @returns {Layer} This layer for chaining
   */
  setBlendMode(mode) {
    if (!Object.values(BlendModes).includes(mode)) {
      console.warn(`Invalid blend mode: ${mode}, using NORMAL`);
      this.blendMode = BlendModes.NORMAL;
    } else {
      this.blendMode = mode;
    }
    return this;
  }

  /**
   * Sets the z-index (layer order) for this layer
   * @param {number} zIndex - The z-index value (higher = on top)
   * @returns {Layer} This layer for chaining
   */
  setZIndex(zIndex) {
    this.zIndex = zIndex;
    return this;
  }

  /**
   * Attaches a mask to this layer
   * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
   * @returns {Layer} This layer for chaining
   */
  setMask(maskSource) {
    if (!maskSource) {
      console.warn('Invalid mask source provided');
      return this;
    }
    this.mask = maskSource;
    return this;
  }

  /**
   * Removes the mask from this layer
   * @returns {Layer} This layer for chaining
   */
  clearMask() {
    this.mask = null;
    return this;
  }

  /**
   * Resizes the layer's framebuffer
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;

    // Dispose old framebuffer
    if (this.framebuffer) {
      this.framebuffer.remove();
    }

    // Create new framebuffer with updated size
    this.framebuffer = this._createFramebuffer();
  }

  /**
   * Begins drawing to this layer's framebuffer
   */
  begin() {
    if (!this.framebuffer) {
      console.error(`Cannot begin drawing: framebuffer not initialized for layer ${this.name}`);
      return;
    }
    this.framebuffer.begin();
  }

  /**
   * Ends drawing to this layer's framebuffer
   */
  end() {
    if (!this.framebuffer) {
      console.error(`Cannot end drawing: framebuffer not initialized for layer ${this.name}`);
      return;
    }
    this.framebuffer.end();
    
    // Mark that this layer has been drawn to
    this.hasBeenDrawnTo = true;
  }

  /**
   * Disposes of this layer's resources
   */
  dispose() {
    if (this.framebuffer) {
      this.framebuffer.remove();
      this.framebuffer = null;
    }
  }

  /**
   * Returns a plain object representation of this layer's properties
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      opacity: this.opacity,
      blendMode: this.blendMode,
      zIndex: this.zIndex,
      hasMask: !!this.mask,
      hasBeenDrawnTo: this.hasBeenDrawnTo,
      width: this.width,
      height: this.height
    };
  }
}
