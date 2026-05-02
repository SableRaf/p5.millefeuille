import { WebGLCompositorRenderer } from './compositor/WebGLCompositorRenderer.js';
import { Canvas2DCompositorRenderer } from './compositor/Canvas2DCompositorRenderer.js';

/**
 * Handles the compositing of layers to the main canvas
 */
export class Compositor {
  /**
   * @param {p5} p5Instance - The p5.js instance
   * @param {boolean} isWebGL - Whether the host sketch uses WebGL
   */
  constructor(p5Instance, isWebGL = true) {
    this.p = p5Instance;
    this.renderer = isWebGL
      ? new WebGLCompositorRenderer(p5Instance)
      : new Canvas2DCompositorRenderer(p5Instance);
  }

  /**
   * Composites all layers to the main canvas using ping-pong buffering
   * @param {Layer[]} layers - Array of layers to composite (should be pre-sorted by zIndex)
   * @param {Function} clearCallback - Optional callback to clear the canvas before compositing
   */
  render(layers, clearCallback = null) {
    this.renderer.render(layers, clearCallback);
  }

  /**
   * Disposes of compositor resources
   */
  dispose() {
    this.renderer.dispose();
  }
}
