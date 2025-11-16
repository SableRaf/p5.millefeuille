/**
 * Blend mode constants for layer compositing
 */
export const BlendModes = {
  NORMAL: 'NORMAL',
  MULTIPLY: 'MULTIPLY',
  SCREEN: 'SCREEN',
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT'
};

/**
 * Maps our blend modes to p5.js blend mode constants
 * Note: p5.js uses different constant names in WebGL mode
 */
export function getP5BlendMode(mode, p5Instance) {
  const p = p5Instance;

  switch (mode) {
    case BlendModes.NORMAL:
      return p.BLEND;
    case BlendModes.MULTIPLY:
      return p.MULTIPLY;
    case BlendModes.SCREEN:
      // p5.js doesn't have SCREEN in WebGL, we'll implement via shader or use LIGHTEST
      return p.LIGHTEST; // Approximation
    case BlendModes.ADD:
      return p.ADD;
    case BlendModes.SUBTRACT:
      return p.SUBTRACT;
    default:
      console.warn(`Unknown blend mode: ${mode}, falling back to NORMAL`);
      return p.BLEND;
  }
}

/**
 * Default layer options
 */
export const DEFAULT_LAYER_OPTIONS = {
  visible: true,
  opacity: 1.0,
  blendMode: BlendModes.NORMAL,
  width: null,  // null means use canvas width
  height: null, // null means use canvas height
  density: null, // null means use canvas density
  depth: false,
  antialias: false
};
