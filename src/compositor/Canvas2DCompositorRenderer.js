import { BLEND_MODE_TO_2D } from '../constants.js';

export class Canvas2DCompositorRenderer {
  constructor(p5Instance) {
    this.p = p5Instance;
    this.accumulator = null;
    this.maskScratch = null;
    this._accumDensity = null;
    this._maskScratchDensity = null;
  }

  _ensureAccumulator() {
    const p = this.p;
    const density = p.pixelDensity();
    const needsResize = !this.accumulator ||
      this.accumulator.width !== p.width ||
      this.accumulator.height !== p.height ||
      this._accumDensity !== density;

    if (needsResize) {
      if (this.accumulator) {
        this.accumulator.remove();
      }
      this.accumulator = p.createGraphics(p.width, p.height);
      if (typeof this.accumulator.pixelDensity === 'function') {
        this.accumulator.pixelDensity(density);
      }
      this._accumDensity = density;
    }

    return this.accumulator;
  }

  _ensureMaskScratch() {
    const p = this.p;
    const density = p.pixelDensity();
    const needsResize = !this.maskScratch ||
      this.maskScratch.width !== p.width ||
      this.maskScratch.height !== p.height ||
      this._maskScratchDensity !== density;

    if (needsResize) {
      if (this.maskScratch) {
        this.maskScratch.remove();
      }
      this.maskScratch = p.createGraphics(p.width, p.height);
      if (typeof this.maskScratch.pixelDensity === 'function') {
        this.maskScratch.pixelDensity(density);
      }
      this._maskScratchDensity = density;
    }

    return this.maskScratch;
  }

  _resetContext(ctx, density = 1) {
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _getSourceCanvas(source) {
    return source && source.canvas ? source.canvas : source;
  }

  render(layers, clearCallback = null) {
    const p = this.p;
    const acc = this._ensureAccumulator();
    const ctx = acc.drawingContext;
    const accDensity = this._accumDensity || 1;
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    acc.clear();
    this._resetContext(ctx, accDensity);

    for (const layer of sortedLayers) {
      if (!layer.visible || layer.opacity <= 0) {
        continue;
      }

      const drawable = layer.surface && layer.surface.getDrawable ? layer.surface.getDrawable() : null;
      let sourceCanvas = this._getSourceCanvas(drawable);
      if (!sourceCanvas) {
        continue;
      }

      if (layer.mask) {
        const scratch = this._ensureMaskScratch();
        const scratchCtx = scratch.drawingContext;
        scratch.clear();
        this._resetContext(scratchCtx, this._maskScratchDensity || 1);
        scratchCtx.drawImage(sourceCanvas, 0, 0, layer.width, layer.height);
        scratchCtx.globalCompositeOperation = 'destination-in';
        const maskCanvas = this._getSourceCanvas(layer.mask);
        if (!maskCanvas) {
          continue;
        }
        scratchCtx.drawImage(maskCanvas, 0, 0, layer.width, layer.height);
        scratchCtx.globalCompositeOperation = 'source-over';
        sourceCanvas = scratch.canvas;
      }

      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = BLEND_MODE_TO_2D[layer.blendMode] || 'source-over';
      ctx.drawImage(sourceCanvas, 0, 0, layer.width, layer.height);
    }

    this._resetContext(ctx, accDensity);

    const hostCtx = p.drawingContext;
    const hostDensity = p.pixelDensity();
    hostCtx.save();
    this._resetContext(hostCtx, hostDensity);

    if (clearCallback) {
      clearCallback();
    } else {
      hostCtx.clearRect(0, 0, p.width, p.height);
    }

    hostCtx.drawImage(acc.canvas, 0, 0, p.width, p.height);
    hostCtx.restore();
  }

  dispose() {
    if (this.accumulator) {
      this.accumulator.remove();
      this.accumulator = null;
    }
    if (this.maskScratch) {
      this.maskScratch.remove();
      this.maskScratch = null;
    }
    this._accumDensity = null;
    this._maskScratchDensity = null;
  }
}
