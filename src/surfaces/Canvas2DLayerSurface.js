/**
 * Surface adapter for 2D mode layers, backed by a p5.Graphics. begin()/end()
 * swap the host instance's `_renderer` so global drawing functions transparently
 * route to the layer — the same mechanism p5.js uses internally for
 * `p5.Graphics`. `drawingContext` follows automatically via p5's getter.
 *
 * Public contract used by other modules:
 *   begin(), end(), clear(), resize(w,h,d), remove(),
 *   getDrawable(), captureThumbnail(maxSize)
 */
export class Canvas2DLayerSurface {
  /**
   * @param {p5} p5Instance - The p5.js instance
   * @param {Object} opts - { width, height, density, name }
   */
  constructor(p5Instance, opts = {}) {
    this.p = p5Instance;
    this._name = opts.name || '';
    this._width = opts.width;
    this._height = opts.height;
    this._density = opts.density;
    this._isActive = false;
    this._prev = null;

    this.graphics = this._createSurface(opts);
    if (!this.graphics) {
      throw new Error(`Failed to create graphics for layer ${this._name}`);
    }
  }

  /**
   * @private
   */
  _createSurface({ width, height, density }) {
    try {
      const g = this.p.createGraphics(width, height);
      if (g && typeof g.pixelDensity === 'function' && density != null) {
        g.pixelDensity(density);
      }
      return g;
    } catch (e) {
      console.error(`Error creating graphics for layer ${this._name}:`, e);
      return null;
    }
  }

  begin() {
    if (!this.graphics) {
      console.error(`Cannot begin drawing: graphics not initialized for layer ${this._name}`);
      return;
    }
    if (this._isActive) {
      console.warn(`begin called while layer ${this._name} is already active; ending swap first`);
      this.end();
    }

    const p = this.p;
    const g = this.graphics;

    this._prev = {
      renderer: p._renderer
    };

    try {
      p._renderer = g._renderer;
      this._isActive = true;
    } catch (e) {
      // Restore on partial failure to avoid leaving the host in a half-swapped state
      try {
        p._renderer = this._prev.renderer;
      } catch (_) { /* ignore */ }
      this._prev = null;
      this._isActive = false;
      throw e;
    }
  }

  end() {
    if (!this._isActive) {
      console.warn(`end called on inactive layer ${this._name}`);
      return;
    }
    const p = this.p;
    if (this._prev) {
      try {
        p._renderer = this._prev.renderer;
      } catch (_) { /* ignore */ }
    }
    this._prev = null;
    this._isActive = false;
  }

  clear() {
    if (this.graphics && typeof this.graphics.clear === 'function') {
      this.graphics.clear();
    }
  }

  resize(width, height, density) {
    if (this._isActive) {
      console.warn(`resize called on active layer ${this._name}; ending swap first`);
      this.end();
    }
    if (this.graphics && typeof this.graphics.remove === 'function') {
      this.graphics.remove();
    }
    this.graphics = null;
    this._width = width;
    this._height = height;
    this._density = density;
    this.graphics = this._createSurface({ width, height, density });
  }

  remove() {
    if (this._isActive) {
      console.warn(`remove called on active layer ${this._name}; ending swap first`);
      this.end();
    }
    if (this.graphics && typeof this.graphics.remove === 'function') {
      this.graphics.remove();
    }
    this.graphics = null;
  }

  getDrawable() {
    return this.graphics;
  }

  /**
   * Returns a p5.Image with `_originalWidth` / `_originalHeight` set.
   * Downsamples via a temporary canvas to bound thumbnail readback cost.
   */
  captureThumbnail(maxSize) {
    const g = this.graphics;
    if (!g || typeof g.get !== 'function') return null;

    const sourceWidth = g.width || this._width || 0;
    const sourceHeight = g.height || this._height || 0;
    if (!sourceWidth || !sourceHeight) return null;

    const cap = Math.max(1, maxSize);
    const largestSide = Math.max(sourceWidth, sourceHeight);
    const scale = largestSide > cap ? cap / largestSide : 1;
    const sampleWidth = Math.max(1, Math.round(sourceWidth * scale));
    const sampleHeight = Math.max(1, Math.round(sourceHeight * scale));

    try {
      const full = g.get();
      if (!full) return null;
      // No downsampling needed
      if (sampleWidth === sourceWidth && sampleHeight === sourceHeight) {
        full._originalWidth = sourceWidth;
        full._originalHeight = sourceHeight;
        return full;
      }

      // Downsample via offscreen canvas
      if (typeof document === 'undefined') {
        full._originalWidth = sourceWidth;
        full._originalHeight = sourceHeight;
        return full;
      }
      const tmp = document.createElement('canvas');
      tmp.width = sampleWidth;
      tmp.height = sampleHeight;
      const ctx = tmp.getContext('2d');
      if (!ctx) {
        full._originalWidth = sourceWidth;
        full._originalHeight = sourceHeight;
        return full;
      }
      ctx.imageSmoothingEnabled = true;
      // Source can be the p5.Image canvas, the Graphics canvas, or the Graphics itself
      const sourceCanvas = (full && full.canvas) || g.canvas;
      if (!sourceCanvas) {
        full._originalWidth = sourceWidth;
        full._originalHeight = sourceHeight;
        return full;
      }
      ctx.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);

      // Reuse the p5.Image returned by g.get() but swap in the downsampled canvas
      // when possible. If we cannot mutate it, fall back to returning a wrapper
      // that exposes `.canvas` (which is what LayerUI consumes).
      try {
        full.canvas = tmp;
        full.width = sampleWidth;
        full.height = sampleHeight;
      } catch (_) {
        const wrapper = { canvas: tmp, width: sampleWidth, height: sampleHeight };
        wrapper._originalWidth = sourceWidth;
        wrapper._originalHeight = sourceHeight;
        return wrapper;
      }
      full._originalWidth = sourceWidth;
      full._originalHeight = sourceHeight;
      return full;
    } catch (e) {
      console.debug('Could not capture 2D thumbnail:', e);
      return null;
    }
  }
}
