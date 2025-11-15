/**
 * p5.millefeuille - A Photoshop-like layer system for p5.js WebGL
 *
 * @module p5.millefeuille
 */

export { LayerSystem, createLayerSystem } from './LayerSystem.js';
export { Layer } from './Layer.js';
export { Compositor } from './Compositor.js';
export { BlendModes, getP5BlendMode, DEFAULT_LAYER_OPTIONS } from './constants.js';

// Version
export const VERSION = '0.1.0';
