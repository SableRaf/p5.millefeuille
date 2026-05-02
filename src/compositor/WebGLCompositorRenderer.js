import { getBlendModeIndex } from '../constants.js';
import compositorVertSource from '../shaders/compositor.vert';
import compositorFragSource from '../shaders/compositor.frag';

export class WebGLCompositorRenderer {
  constructor(p5Instance) {
    this.p = p5Instance;
    this.shader = null;
    this.shaderLoaded = false;
    this.bufferA = null;
    this.bufferB = null;
    this._bufferDensity = null;
  }

  _ensureShader() {
    if (!this.shaderLoaded) {
      try {
        this.shader = this.p.createShader(compositorVertSource, compositorFragSource);
        this.shaderLoaded = true;
      } catch (e) {
        console.error('Failed to create compositor shader:', e);
        this.shaderLoaded = false;
      }
    }
    return this.shader;
  }

  _ensureBuffers() {
    const p = this.p;
    const currentDensity = p.pixelDensity();
    const needsResize = !this.bufferA ||
      this.bufferA.width !== p.width ||
      this.bufferA.height !== p.height ||
      this._bufferDensity !== currentDensity;

    if (needsResize) {
      if (this.bufferA) {
        this.bufferA.remove();
        this.bufferB.remove();
      }

      const bufferOptions = {
        width: p.width,
        height: p.height,
        density: currentDensity,
        antialias: false,
        depth: false
      };

      this.bufferA = p.createFramebuffer(bufferOptions);
      this.bufferB = p.createFramebuffer(bufferOptions);
      this._bufferDensity = currentDensity;
    }

    return { a: this.bufferA, b: this.bufferB };
  }

  _renderLayer(layer, backgroundBuffer) {
    if (!layer.visible || layer.opacity <= 0) {
      return;
    }

    const drawable = layer.surface && layer.surface.getDrawable ? layer.surface.getDrawable() : null;
    if (!drawable) {
      console.warn(`Layer ${layer.name} has no drawable surface, skipping`);
      return;
    }

    const shader = this._ensureShader();
    if (!shader) {
      console.warn('Compositor shader not available, skipping layer');
      return;
    }

    const p = this.p;
    p.push();
    p.blendMode(p.BLEND);
    p.shader(shader);
    shader.setUniform('layerTexture', drawable);
    shader.setUniform('backgroundTexture', backgroundBuffer);
    shader.setUniform('maskTexture', layer.mask || drawable);
    shader.setUniform('hasMask', !!layer.mask);
    shader.setUniform('layerOpacity', layer.opacity);
    shader.setUniform('blendMode', getBlendModeIndex(layer.blendMode));
    p.imageMode(p.CENTER);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill(255);
    p.rect(0, 0, p.width, p.height);
    p.resetShader();
    p.pop();
  }

  render(layers, clearCallback = null) {
    const p = this.p;
    const buffers = this._ensureBuffers();
    let currentBuffer = buffers.a;
    let nextBuffer = buffers.b;
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    currentBuffer.begin();
    p.clear();
    currentBuffer.end();

    for (const layer of sortedLayers) {
      if (!layer.visible || layer.opacity <= 0) {
        continue;
      }

      nextBuffer.begin();
      p.clear();
      this._renderLayer(layer, currentBuffer);
      nextBuffer.end();

      const temp = currentBuffer;
      currentBuffer = nextBuffer;
      nextBuffer = temp;
    }

    p.push();
    if (clearCallback) {
      clearCallback();
    } else {
      p.clear();
    }
    p.resetShader();
    p.blendMode(p.BLEND);
    p.imageMode(p.CENTER);
    p.image(currentBuffer, 0, 0);
    p.pop();
  }

  dispose() {
    if (this.bufferA) {
      this.bufferA.remove();
      this.bufferA = null;
    }
    if (this.bufferB) {
      this.bufferB.remove();
      this.bufferB = null;
    }
    this._bufferDensity = null;
    this.shader = null;
    this.shaderLoaded = false;
  }
}
