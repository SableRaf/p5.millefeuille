/**
 * p5.millefeuille - A Photoshop-like layer system for p5.js WebGL
 *
 * @module p5.millefeuille
 */

import { LayerSystem } from './LayerSystem.js';
import { BlendModes as BlendModesEnum } from './constants.js';

export { Layer } from './Layer.js';
export { Compositor } from './Compositor.js';
export { LayerUI } from './LayerUI.js';
export { BlendModes, getBlendModeIndex, DEFAULT_LAYER_OPTIONS } from './constants.js';

// Version
export const VERSION = '0.1.0';

/**
 * p5.js addon registration function
 * @param {object} p5 - The p5 constructor
 * @param {object} fn - The p5 prototype
 * @param {object} lifecycles - Lifecycle hooks
 */
function millefeuilleAddon(p5, fn, lifecycles) {
  // Attach createLayerSystem to p5 prototype
  fn.createLayerSystem = function(options = {}) {
    // 'this' is the p5 instance
    return new LayerSystem(this, options);
  };

  // Cleanup lifecycle - dispose layer system when sketch is removed
  if (lifecycles) {
    lifecycles.remove = function() {
      if (this._layerSystem) {
        this._layerSystem.dispose();
        this._layerSystem = null;
      }
    };
  }
}

// Auto-register for script tag usage
if (typeof window !== 'undefined' && typeof window.p5 !== 'undefined') {
  window.p5.registerAddon(millefeuilleAddon);
  
  // Also expose common utilities globally for convenience
  window.BlendModes = BlendModesEnum;
}

// Export addon function as default for ESM usage
export default millefeuilleAddon;

// Also export LayerSystem for direct instantiation if needed
export { LayerSystem };
