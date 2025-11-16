import { getP5BlendMode } from './constants.js';
import compositorVertSource from './shaders/compositor.vert';
import compositorFragSource from './shaders/compositor.frag';

/**
 * Handles the compositing of layers to the main canvas
 */
export class Compositor {
  /**
   * @param {p5} p5Instance - The p5.js instance
   */
  constructor(p5Instance) {
    this.p = p5Instance;
    this.shader = null;
    this.shaderLoaded = false;
  }

  /**
   * Lazily creates the compositor shader
   * @private
   */
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

  /**
   * Renders a single layer to the current framebuffer
   * @param {Layer} layer - The layer to render
   * @private
   */
  _renderLayer(layer) {
    if (!layer.visible || layer.opacity <= 0) {
      return;
    }

    if (!layer.framebuffer) {
      console.warn(`Layer ${layer.name} has no framebuffer, skipping`);
      return;
    }

    const p = this.p;

    // Save current state
    p.push();

    // Set blend mode
    const p5BlendMode = getP5BlendMode(layer.blendMode, p);
    p.blendMode(p5BlendMode);

    // Always use the shader for proper framebuffer rendering in WEBGL
    this._renderLayerWithShader(layer);

    // Restore state
    p.pop();
  }

  /**
   * Renders a layer using the compositor shader
   * @param {Layer} layer - The layer to render
   * @private
   */
  _renderLayerWithShader(layer) {
    const shader = this._ensureShader();
    if (!shader) {
      console.warn('Compositor shader not available, rendering without shader');
      return;
    }

    const p = this.p;

    // Use the compositor shader
    p.shader(shader);

    // Set uniforms
    shader.setUniform('layerTexture', layer.framebuffer);
    shader.setUniform('maskTexture', layer.mask || layer.framebuffer);
    shader.setUniform('hasMask', layer.mask ? true : false);
    shader.setUniform('layerOpacity', layer.opacity);

    // Draw a full-screen quad
    p.imageMode(p.CENTER);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill(255);
    p.rect(0, 0, p.width, p.height);

    // Reset shader
    p.resetShader();
  }

  /**
   * Composites all layers to the main canvas
   * @param {Layer[]} layers - Array of layers to composite (should be pre-sorted by zIndex)
   * @param {Function} clearCallback - Optional callback to clear the canvas before compositing
   */
  render(layers, clearCallback = null) {
    const p = this.p;

    // Save WebGL state
    p.push();

    // Clear the canvas if callback provided
    if (clearCallback) {
      clearCallback();
    } else {
      // Default clear
      p.clear();
    }

    // Reset to default state
    p.resetShader();
    p.blendMode(p.BLEND);

    // Sort layers by zIndex (ascending)
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Render each layer
    for (const layer of sortedLayers) {
      this._renderLayer(layer);
    }

    // Restore state
    p.blendMode(p.BLEND);
    p.resetShader();
    p.pop();
  }

  /**
   * Disposes of compositor resources
   */
  dispose() {
    // p5.js doesn't have explicit shader disposal, but we can clear the reference
    this.shader = null;
    this.shaderLoaded = false;
  }
}
