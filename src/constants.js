/**
 * Blend mode constants for layer compositing
 * These map to glsl-blend functions in the compositor shader
 */
export const BlendModes = {
  NORMAL: 'NORMAL',
  MULTIPLY: 'MULTIPLY',
  SCREEN: 'SCREEN',
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT',
  OVERLAY: 'OVERLAY',
  SOFT_LIGHT: 'SOFT_LIGHT',
  HARD_LIGHT: 'HARD_LIGHT',
  COLOR_DODGE: 'COLOR_DODGE',
  COLOR_BURN: 'COLOR_BURN',
  DARKEN: 'DARKEN',
  LIGHTEN: 'LIGHTEN',
  DIFFERENCE: 'DIFFERENCE',
  EXCLUSION: 'EXCLUSION'
};

/**
 * Maps our blend modes to shader uniform integers
 * These correspond to the blend mode indices in compositor.frag
 */
export function getBlendModeIndex(mode) {
  switch (mode) {
    case BlendModes.NORMAL:
      return 0;
    case BlendModes.MULTIPLY:
      return 1;
    case BlendModes.SCREEN:
      return 2;
    case BlendModes.ADD:
      return 3;
    case BlendModes.SUBTRACT:
      return 4;
    case BlendModes.OVERLAY:
      return 5;
    case BlendModes.SOFT_LIGHT:
      return 6;
    case BlendModes.HARD_LIGHT:
      return 7;
    case BlendModes.COLOR_DODGE:
      return 8;
    case BlendModes.COLOR_BURN:
      return 9;
    case BlendModes.DARKEN:
      return 10;
    case BlendModes.LIGHTEN:
      return 11;
    case BlendModes.DIFFERENCE:
      return 12;
    case BlendModes.EXCLUSION:
      return 13;
    default:
      console.warn(`Unknown blend mode: ${mode}, falling back to NORMAL`);
      return 0;
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
