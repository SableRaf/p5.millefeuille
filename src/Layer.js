import {
  BlendModes,
  DEFAULT_LAYER_OPTIONS,
  SUPPORTED_2D_BLEND_MODES
} from './constants.js';
import { WebGLLayerSurface } from './surfaces/WebGLLayerSurface.js';

/**
 * Represents a single layer backed by a mode-specific drawing surface.
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
    this.isWebGL = opts.isWebGL !== false;

    // Canonical public dimension API. Other modules must read these properties
    // instead of peeking into surface-specific internals.
    this.width = opts.width ?? this.p.width;
    this.height = opts.height ?? this.p.height;
    this.density = opts.density ?? this.p.pixelDensity();
    this.depth = opts.depth;
    this.antialias = opts.antialias;

    // Flag layers that opted into custom sizing to protect them from auto-resize
    this.customSize = opts.width != null ||
      opts.height != null ||
      opts.density != null;

    // Mask reference.
    this.mask = null;
    this.surface = null;

    const SurfaceCtor = opts.surfaceCtor || WebGLLayerSurface;
    this.surface = new SurfaceCtor(this.p, {
      width: this.width,
      height: this.height,
      density: this.density,
      depth: this.depth,
      antialias: this.antialias,
      name: this.name
    });

    if (!this.surface) {
      throw new Error(`Failed to create surface for layer ${this.name}`);
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
      return this;
    }

    if (!this.isWebGL && !SUPPORTED_2D_BLEND_MODES.has(mode)) {
      const supportedModes = Array.from(SUPPORTED_2D_BLEND_MODES).join(', ');
      throw new Error(
        `Blend mode ${mode} is not supported in 2D mode. Supported 2D modes: ${supportedModes}`
      );
    }

    this.blendMode = mode;
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
   * In 2D mode, masks must be a p5.Image or 2D p5.Graphics and are scaled to
   * the layer bounds when composited.
   * @param {p5.Framebuffer|p5.Image|p5.Graphics} maskSource - The mask to apply
   * @returns {Layer} This layer for chaining
   */
  setMask(maskSource) {
    if (!maskSource) {
      console.warn('Invalid mask source provided');
      return this;
    }

    if (!this.isWebGL && !this._isSupported2DMaskSource(maskSource)) {
      throw new Error('setMask requires a p5.Image or p5.Graphics in 2D mode. See the API docs for supported mask types.');
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
  resize(width, height, density = this.density) {
    this.width = width;
    this.height = height;
    this.density = density;

    // Keep track of whether the layer is canvas-synced or intentionally customized
    const matchesCanvas = width === this.p.width &&
      height === this.p.height &&
      density === this.p.pixelDensity();
    this.customSize = !matchesCanvas;

    if (this.surface) {
      this.surface.resize(width, height, density);
    }
  }

  /**
   * Begins drawing to this layer's surface
   */
  begin() {
    if (!this.surface) {
      console.error(`Cannot begin drawing: surface not initialized for layer ${this.name}`);
      return;
    }
    this.surface.begin();
  }

  /**
   * Ends drawing to this layer's surface
   */
  end() {
    if (!this.surface) {
      console.error(`Cannot end drawing: surface not initialized for layer ${this.name}`);
      return;
    }
    this.surface.end();
  }

  /**
   * Disposes of this layer's resources
   */
  dispose() {
    if (this.surface) {
      this.surface.remove();
      this.surface = null;
    }
  }

  get framebuffer() {
    return this.surface && this.surface.framebuffer ? this.surface.framebuffer : null;
  }

  get graphics() {
    return this.surface && this.surface.graphics ? this.surface.graphics : null;
  }

  /**
   * @private
   */
  _isSupported2DMaskSource(source) {
    const hasCanvas = typeof HTMLCanvasElement !== 'undefined' && source.canvas instanceof HTMLCanvasElement;
    const looksLikeImage = hasCanvas &&
      typeof source.loadPixels === 'function' &&
      typeof source.begin !== 'function';

    const ctx = source && source.drawingContext;
    const looksLike2DContext =
      (typeof CanvasRenderingContext2D !== 'undefined' && ctx instanceof CanvasRenderingContext2D) ||
      (ctx && typeof ctx.drawImage === 'function' && typeof ctx.clearRect === 'function');
    const looksLikeGraphics = hasCanvas &&
      !!source._renderer &&
      looksLike2DContext;

    // duck-typing because instanceof p5.Image / p5.Graphics is unreliable across builds
    return looksLikeImage || looksLikeGraphics;
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
      width: this.width,
      height: this.height,
      density: this.density,
      customSize: this.customSize
    };
  }
}
