import { getBlendModeIndex } from './constants.js';
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
    this.bufferA = null;
    this.bufferB = null;
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
   * Ensures the ping-pong buffers exist and match canvas size
   * @private
   */
  _ensureBuffers() {
    const p = this.p;
    
    const needsResize = !this.bufferA || 
                        this.bufferA.width !== p.width || 
                        this.bufferA.height !== p.height;
    
    if (needsResize) {
      if (this.bufferA) {
        this.bufferA.remove();
        this.bufferB.remove();
      }
      
      const bufferOptions = {
        width: p.width,
        height: p.height,
        density: p.pixelDensity(),
        antialias: false,
        depth: false
      };
      
      this.bufferA = p.createFramebuffer(bufferOptions);
      this.bufferB = p.createFramebuffer(bufferOptions);
    }
    
    return { a: this.bufferA, b: this.bufferB };
  }

  /**
   * Renders a single layer to the current framebuffer
   * @param {Layer} layer - The layer to render
   * @param {p5.Framebuffer} backgroundBuffer - The background to composite onto
   * @private
   */
  _renderLayer(layer, backgroundBuffer) {
    if (!layer.visible || layer.opacity <= 0) {
      return;
    }

    if (!layer.framebuffer) {
      console.warn(`Layer ${layer.name} has no framebuffer, skipping`);
      return;
    }

    const shader = this._ensureShader();
    if (!shader) {
      console.warn('Compositor shader not available, skipping layer');
      return;
    }

    const p = this.p;

    // Save current state
    p.push();

    // Use normal blending since we're doing the blend in the shader
    p.blendMode(p.BLEND);

    // Use the compositor shader
    p.shader(shader);

    // Set uniforms
    shader.setUniform('layerTexture', layer.framebuffer);
    shader.setUniform('backgroundTexture', backgroundBuffer);
    shader.setUniform('maskTexture', layer.mask || layer.framebuffer);
    shader.setUniform('hasMask', layer.mask ? true : false);
    shader.setUniform('layerOpacity', layer.opacity);
    shader.setUniform('blendMode', getBlendModeIndex(layer.blendMode));

    // Draw a full-screen quad
    p.imageMode(p.CENTER);
    p.rectMode(p.CENTER);
    p.noStroke();
    p.fill(255);
    p.rect(0, 0, p.width, p.height);

    // Reset shader
    p.resetShader();

    // Restore state
    p.pop();
  }

  /**
   * Composites all layers to the main canvas using ping-pong buffering
   * @param {Layer[]} layers - Array of layers to composite (should be pre-sorted by zIndex)
   * @param {Function} clearCallback - Optional callback to clear the canvas before compositing
   */
  render(layers, clearCallback = null) {
    const p = this.p;

    // Ensure we have ping-pong buffers
    const buffers = this._ensureBuffers();
    let currentBuffer = buffers.a;
    let nextBuffer = buffers.b;

    // Sort layers by zIndex (ascending)
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Clear the first buffer
    currentBuffer.begin();
    p.clear();
    currentBuffer.end();

    // Render each layer progressively, ping-ponging between buffers
    for (let i = 0; i < sortedLayers.length; i++) {
      const layer = sortedLayers[i];
      
      if (!layer.visible || layer.opacity <= 0) {
        continue;
      }

      // Render this layer on top of currentBuffer into nextBuffer
      nextBuffer.begin();
      p.clear();
      this._renderLayer(layer, currentBuffer);
      nextBuffer.end();

      // Swap buffers
      const temp = currentBuffer;
      currentBuffer = nextBuffer;
      nextBuffer = temp;
    }

    // Now render the final result to the main canvas
    p.push();

    // Clear the canvas if callback provided
    if (clearCallback) {
      clearCallback();
    } else {
      p.clear();
    }

    // Reset to default state
    p.resetShader();
    p.blendMode(p.BLEND);

    // Draw the accumulated result to the main canvas
    p.imageMode(p.CENTER);
    p.image(currentBuffer, 0, 0);

    p.pop();
  }

  /**
   * Disposes of compositor resources
   */
  dispose() {
    // Clean up ping-pong buffers
    if (this.bufferA) {
      this.bufferA.remove();
      this.bufferA = null;
    }
    if (this.bufferB) {
      this.bufferB.remove();
      this.bufferB = null;
    }
    
    // p5.js doesn't have explicit shader disposal, but we can clear the reference
    this.shader = null;
    this.shaderLoaded = false;
  }
}
