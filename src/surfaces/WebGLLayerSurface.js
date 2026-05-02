/**
 * Surface adapter that wraps a p5.Framebuffer for WebGL mode layers.
 *
 * Public contract used by other modules:
 *   begin(), end(), clear(), resize(w,h,d), remove(),
 *   getDrawable(), captureThumbnail(maxSize)
 */
export class WebGLLayerSurface {
  /**
   * @param {p5} p5Instance - The p5.js instance
   * @param {Object} opts - { width, height, density, depth, antialias, name }
   */
  constructor(p5Instance, opts = {}) {
    this.p = p5Instance;
    this._name = opts.name || '';
    this._width = opts.width;
    this._height = opts.height;
    this._density = opts.density;
    this._depth = opts.depth;
    this._antialias = opts.antialias;
    this._isActive = false;
    this._downsampleBuffer = null;

    this.framebuffer = this._createSurface(opts);
    if (!this.framebuffer) {
      throw new Error(`Failed to create framebuffer for layer ${this._name}`);
    }
  }

  /**
   * @private
   */
  _createSurface({ width, height, density, depth, antialias }) {
    try {
      const options = { width, height, density };
      if (depth !== undefined) options.depth = depth;
      if (antialias !== undefined) options.antialias = antialias;
      return this.p.createFramebuffer(options);
    } catch (e) {
      console.error(`Error creating framebuffer for layer ${this._name}:`, e);
      return null;
    }
  }

  begin() {
    if (!this.framebuffer) {
      console.error(`Cannot begin drawing: framebuffer not initialized for layer ${this._name}`);
      return;
    }
    this.framebuffer.begin();
    this._isActive = true;
  }

  end() {
    if (!this.framebuffer) {
      console.error(`Cannot end drawing: framebuffer not initialized for layer ${this._name}`);
      return;
    }
    this.framebuffer.end();
    this._isActive = false;
  }

  clear() {
    if (!this.framebuffer) return;
    this.framebuffer.begin();
    this.p.clear();
    this.framebuffer.end();
  }

  resize(width, height, density) {
    if (this._isActive) {
      console.warn(`resize called on active layer ${this._name}; ending swap first`);
      this.end();
    }
    if (this.framebuffer) {
      this.framebuffer.remove();
      this.framebuffer = null;
    }
    this._width = width;
    this._height = height;
    this._density = density;
    this.framebuffer = this._createSurface({
      width,
      height,
      density,
      depth: this._depth,
      antialias: this._antialias
    });
  }

  remove() {
    if (this._isActive) {
      console.warn(`remove called on active layer ${this._name}; ending swap first`);
      this.end();
    }
    if (this.framebuffer) {
      this.framebuffer.remove();
      this.framebuffer = null;
    }
    if (this._downsampleBuffer) {
      this._downsampleBuffer.remove();
      this._downsampleBuffer = null;
    }
  }

  getDrawable() {
    return this.framebuffer;
  }

  /**
   * Captures a downsampled thumbnail using GPU-to-GPU copy to avoid full readback.
   * Returns a p5.Image with `_originalWidth` / `_originalHeight` set.
   */
  captureThumbnail(maxSize) {
    const source = this.framebuffer;
    if (!source) return null;
    const p = this.p;
    if (!p) return null;

    const cap = Math.max(1, maxSize);
    const sourceWidth = source.width || p.width;
    const sourceHeight = source.height || p.height;
    const largestSide = Math.max(sourceWidth, sourceHeight);
    const scale = largestSide > cap ? cap / largestSide : 1;
    const sampleWidth = Math.max(1, Math.round(sourceWidth * scale));
    const sampleHeight = Math.max(1, Math.round(sourceHeight * scale));

    try {
      const buffer = this._getDownsampleBuffer(sampleWidth, sampleHeight);
      if (!buffer) {
        if (typeof source.get === 'function') {
          const fallback = source.get();
          if (fallback) {
            fallback._originalWidth = sourceWidth;
            fallback._originalHeight = sourceHeight;
          }
          return fallback;
        }
        return null;
      }

      buffer.begin();
      p.clear();
      p.push();
      p.imageMode(p.CORNER);
      // WEBGL origin is center; translate to top-left
      p.translate(-sampleWidth / 2, -sampleHeight / 2);
      p.image(source, 0, 0, sampleWidth, sampleHeight);
      p.pop();
      buffer.end();

      const result = buffer.get();
      if (result) {
        result._originalWidth = sourceWidth;
        result._originalHeight = sourceHeight;
      }
      return result;
    } catch (e) {
      console.debug('Could not capture downsampled thumbnail:', e);
      if (typeof source.get === 'function') {
        const fallback = source.get();
        if (fallback) {
          fallback._originalWidth = sourceWidth;
          fallback._originalHeight = sourceHeight;
        }
        return fallback;
      }
      return null;
    }
  }

  /**
   * @private
   */
  _getDownsampleBuffer(width, height) {
    const p = this.p;
    if (!p || typeof p.createFramebuffer !== 'function') {
      return null;
    }
    if (!this._downsampleBuffer) {
      try {
        this._downsampleBuffer = p.createFramebuffer({
          width,
          height,
          density: 1,
          depthFormat: p.UNSIGNED_INT,
          textureFiltering: p.LINEAR
        });
      } catch (e) {
        console.debug('Could not create downsample framebuffer:', e);
        return null;
      }
    } else if (this._downsampleBuffer.width !== width || this._downsampleBuffer.height !== height) {
      this._downsampleBuffer.resize(width, height);
    }
    return this._downsampleBuffer;
  }
}
