# p5.millefeuille Library Conversion Plan

**Date:** November 21, 2025  
**Objective:** Convert p5.millefeuille from a factory-pattern library to a proper p5.js addon library using `p5.registerAddon()`.

---

## Background

p5.millefeuille currently uses a factory pattern where users must manually pass the p5 instance:

```javascript
// Current approach
const layers = createLayerSystem(p5Instance);
```

This creates friction for users and doesn't follow p5.js conventions. We need to convert it to the official addon pattern so it works seamlessly in both global and instance modes:

```javascript
// Target approach - Global mode
const layers = createLayerSystem();

// Target approach - Instance mode
new p5(sketch => {
  const layers = sketch.createLayerSystem();
});
```

---

## Current Architecture

### File Structure
```
src/
├── index.js              # Exports public API
├── LayerSystem.js        # Main manager (stores p5Instance in this.p)
├── Layer.js              # Individual layer wrapper
├── Compositor.js         # Rendering pipeline
├── LayerUI.js            # UI panel (uses DOM event listeners)
└── constants.js          # Blend modes & defaults
```

### Key Classes

**LayerSystem** (src/LayerSystem.js)
- Constructor: `constructor(p5Instance)`
- Stores p5 as `this.p`
- Factory: `createLayerSystem(p5Instance)` returns new `LayerSystem(p5Instance)`
- Auto-detects p5 in global mode: `window.p5.instance`

**LayerUI** (src/LayerUI.js)
- Uses `addEventListener()` extensively for drag, click, keyboard events
- Currently no cleanup in place (potential memory leak on sketch removal)

**Layer** (src/Layer.js)
- Wraps `p5.Framebuffer`
- Accesses p5 via `this.p` (passed from LayerSystem)

---

## Implementation Plan

### Phase 1: Core Addon Structure

#### Task 1: Create Addon Function
**File:** `src/index.js`

Replace current exports with:

```javascript
function millefeuilleAddon(p5, fn, lifecycles) {
  // Attach createLayerSystem to fn (prototype)
  fn.createLayerSystem = function(options = {}) {
    // 'this' is the p5 instance
    return new LayerSystem(this, options);
  };

  // Cleanup lifecycle
  lifecycles.remove = function() {
    // Clean up any active layer systems
    if (this._layerSystem) {
      this._layerSystem.dispose();
      this._layerSystem = null;
    }
  };
}

// Auto-register for script tag usage
if (typeof p5 !== 'undefined') {
  p5.registerAddon(millefeuilleAddon);
}

// Export for ESM usage
export default millefeuilleAddon;
export { LayerSystem, Layer, Compositor, LayerUI, BlendModes };
```

**Key Changes:**
- Wrap everything in `millefeuilleAddon(p5, fn, lifecycles)`
- Use `fn.createLayerSystem` instead of standalone factory
- Add conditional `p5.registerAddon()` for script tag usage
- Export addon function for ESM imports

---

#### Task 2: Update LayerSystem Constructor
**File:** `src/LayerSystem.js`

The constructor already accepts `p5Instance` and stores it as `this.p`, so minimal changes needed:

```javascript
export class LayerSystem {
  constructor(p5Instance, options = {}) {
    this.p = p5Instance;
    
    // ... rest of constructor (no changes needed)
  }
}
```

**Remove the standalone factory function:**
```javascript
// DELETE THIS:
export function createLayerSystem(p5Instance) {
  // Auto-detect p5 instance in global mode
  const p = p5Instance || window.p5?.instance;
  
  if (!p) {
    throw new Error('Could not find p5 instance...');
  }
  
  return new LayerSystem(p);
}
```

The addon function in `index.js` now handles this via `fn.createLayerSystem()`.

---

#### Task 3: Update Method Context
**File:** `src/LayerSystem.js`

All methods already use `this.p` for p5 access, so no changes needed. Example:

```javascript
createLayer(name = '', options = {}) {
  // Already uses this.p - no changes needed
  const framebuffer = this.p.createFramebuffer(fbOptions);
}
```

---

### Phase 2: Event Cleanup

#### Task 4: Fix LayerUI Event Listeners
**File:** `src/LayerUI.js`

**Problem:** LayerUI adds event listeners that are never cleaned up.

**Solution:** Use `this._removeSignal` for automatic cleanup.

**Current code (lines ~69-88):**
```javascript
// Add event listeners
if (this.options.collapsible) {
  const collapseBtn = header.querySelector('.p5ml-collapse-btn');
  collapseBtn.addEventListener('click', () => this.toggle());
  collapseBtn.addEventListener('mousedown', (e) => e.stopPropagation());
}

// Arrow button handlers
const upBtn = header.querySelector('.p5ml-arrow-up');
const downBtn = header.querySelector('.p5ml-arrow-down');
upBtn.addEventListener('click', () => this._moveSelectedLayer(-1));
downBtn.addEventListener('click', () => this._moveSelectedLayer(1));
upBtn.addEventListener('mousedown', (e) => e.stopPropagation());
downBtn.addEventListener('mousedown', (e) => e.stopPropagation());
```

**Updated code:**
```javascript
// Add event listeners with automatic cleanup
const signal = this.layerSystem.p._removeSignal;

if (this.options.collapsible) {
  const collapseBtn = header.querySelector('.p5ml-collapse-btn');
  collapseBtn.addEventListener('click', () => this.toggle(), { signal });
  collapseBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
}

// Arrow button handlers
const upBtn = header.querySelector('.p5ml-arrow-up');
const downBtn = header.querySelector('.p5ml-arrow-down');
upBtn.addEventListener('click', () => this._moveSelectedLayer(-1), { signal });
downBtn.addEventListener('click', () => this._moveSelectedLayer(1), { signal });
upBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
downBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
```

**Search for ALL `addEventListener` calls in LayerUI.js and add `{ signal }` option.**

Common patterns:
- Line ~82: Document click listeners
- Line ~91: Keyboard listeners  
- Line ~120+: Drag handlers
- Line ~200+: Layer element click handlers
- Line ~300+: Blend mode dropdowns
- Line ~400+: Opacity sliders

---

### Phase 3: Build Configuration

#### Task 5: Update Rollup Config
**File:** `rollup.config.js`

**Current output:**
- UMD: `dist/p5.millefeuille.js`
- ESM: `dist/p5.millefeuille.esm.js`
- Minified: `dist/p5.millefeuille.min.js`

**Required changes:**

The UMD bundle should auto-register when loaded via script tag. The current config likely already does this via the IIFE wrapper, but verify:

```javascript
// rollup.config.js
export default [
  // UMD build (for script tag usage)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/p5.millefeuille.js',
      format: 'umd',
      name: 'p5Millefeuille', // Global variable name
      globals: {
        p5: 'p5'
      }
    },
    external: ['p5'],
    plugins: [/* existing plugins */]
  },
  
  // ESM build (for module imports)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/p5.millefeuille.esm.js',
      format: 'esm'
    },
    external: ['p5'],
    plugins: [/* existing plugins */]
  }
];
```

**Verify that the conditional `p5.registerAddon()` works correctly:**
- In UMD: `p5` is available globally → addon auto-registers
- In ESM: Users import and register manually if needed

---

### Phase 4: Update Examples

#### Task 6: Modify Example Files

**Files to update:**
- `examples/01-basic/sketch.js`
- `examples/02-blend-modes/sketch.js`
- `examples/03-masking/sketch.js`

**Current pattern:**
```javascript
import { createLayerSystem, BlendModes } from '../../dist/p5.millefeuille.esm.js';

let ls;

window.setup = function() {
  createCanvas(800, 600, WEBGL);
  ls = createLayerSystem(); // Auto-detects p5 instance
};
```

**New pattern (global mode with script tag):**
```html
<!-- In HTML -->
<script src="../../lib/p5.min.2.1.1.js"></script>
<script src="../../dist/p5.millefeuille.min.js"></script>
<script src="sketch.js"></script>
```

```javascript
// In sketch.js (no imports needed)
let layers;

function setup() {
  createCanvas(800, 600, WEBGL);
  layers = createLayerSystem(); // Available globally
}
```

**New pattern (instance mode):**
```javascript
new p5(sketch => {
  let layers;
  
  sketch.setup = function() {
    sketch.createCanvas(800, 600, sketch.WEBGL);
    layers = sketch.createLayerSystem();
  };
  
  sketch.draw = function() {
    layers.begin('Background');
    sketch.clear();
    sketch.background(30);
    layers.end();
    
    layers.render();
  };
});
```

**Create two example variants:**
1. Global mode examples (current examples folder)
2. Instance mode example (new `examples/04-instance-mode/`)

---

### Phase 5: Documentation

#### Task 7: Update README.md

**Add installation section:**

```markdown
## Installation

### Via CDN (Script Tag)
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/2.1.1/p5.min.js"></script>
<script src="https://unpkg.com/p5.millefeuille@0.1.0/dist/p5.millefeuille.min.js"></script>
```

### Via NPM
```bash
npm install p5.millefeuille
```

Then in your code:
```javascript
import p5 from 'p5';
import millefeuilleAddon from 'p5.millefeuille';

p5.registerAddon(millefeuilleAddon);
```

## Usage

### Global Mode
```javascript
function setup() {
  createCanvas(800, 600, WEBGL);
  const layers = createLayerSystem();
  
  layers.createLayer('Background');
  layers.createLayer('Foreground');
}
```

### Instance Mode
```javascript
new p5(sketch => {
  let layers;
  
  sketch.setup = function() {
    sketch.createCanvas(800, 600, sketch.WEBGL);
    layers = sketch.createLayerSystem();
  };
});
```
```

---

#### Task 8: Update AGENTS.md

**Update the "Factory Function" section:**

```markdown
### Addon Registration
- `millefeuilleAddon(p5, fn, lifecycles)` → Main addon function
- Auto-registers when loaded via script tag
- Can be manually registered: `p5.registerAddon(millefeuilleAddon)`

### LayerSystem Creation
- `createLayerSystem(options?)` → Returns LayerSystem instance
  - Available as global function in global mode
  - Available as `sketch.createLayerSystem()` in instance mode
```

**Update "Common Patterns" section:**

```markdown
### Basic Usage Pattern (Global Mode)
```javascript
let layers;

function setup() {
  createCanvas(800, 600, WEBGL);
  layers = createLayerSystem();
  
  layers.createLayer('Background');
  layers.createLayer('Effects')
    .setBlendMode(BlendModes.ADD)
    .setOpacity(0.7);
}
```

### Basic Usage Pattern (Instance Mode)
```javascript
new p5(sketch => {
  let layers;
  
  sketch.setup = function() {
    sketch.createCanvas(800, 600, sketch.WEBGL);
    layers = sketch.createLayerSystem();
    
    layers.createLayer('Background');
  };
  
  sketch.draw = function() {
    layers.begin('Background');
    sketch.clear();
    // Draw...
    layers.end();
    
    layers.render();
  };
});
```
```

---

### Phase 6: Testing

#### Task 9: Test Both Modes

**Create test file:** `examples/test-modes.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test: Global & Instance Modes</title>
  <script src="../lib/p5.min.2.1.1.js"></script>
  <script src="../dist/p5.millefeuille.min.js"></script>
</head>
<body>
  <h2>Global Mode</h2>
  <div id="global"></div>
  
  <h2>Instance Mode</h2>
  <div id="instance"></div>
  
  <script>
    // Global mode test
    let globalLayers;
    function setup() {
      let cnv = createCanvas(400, 300, WEBGL);
      cnv.parent('global');
      
      globalLayers = createLayerSystem();
      globalLayers.createLayer('Test');
      console.log('✓ Global mode working');
    }
    
    function draw() {
      globalLayers.begin('Test');
      clear();
      background(220, 100, 100);
      globalLayers.end();
      globalLayers.render();
    }
  </script>
  
  <script>
    // Instance mode test
    new p5(sketch => {
      let instanceLayers;
      
      sketch.setup = function() {
        let cnv = sketch.createCanvas(400, 300, sketch.WEBGL);
        cnv.parent('instance');
        
        instanceLayers = sketch.createLayerSystem();
        instanceLayers.createLayer('Test');
        console.log('✓ Instance mode working');
      };
      
      sketch.draw = function() {
        instanceLayers.begin('Test');
        sketch.clear();
        sketch.background(100, 220, 100);
        instanceLayers.end();
        instanceLayers.render();
      };
    });
  </script>
</body>
</html>
```

**Verification checklist:**
- [ ] Both canvases render correctly
- [ ] No console errors
- [ ] LayerUI appears for both instances (if enabled)
- [ ] Removing one sketch doesn't break the other
- [ ] Event listeners are cleaned up (check DevTools → Event Listeners)

---

## Implementation Checklist

### Core Changes
- [ ] Create `millefeuilleAddon(p5, fn, lifecycles)` in `src/index.js`
- [ ] Add conditional `p5.registerAddon()` call
- [ ] Export addon function as default export
- [ ] Remove standalone `createLayerSystem()` factory from `LayerSystem.js`
- [ ] Verify LayerSystem constructor still works with `p5Instance` param

### Event Cleanup
- [ ] Add `this.layerSystem.p._removeSignal` usage in LayerUI
- [ ] Update ALL `addEventListener` calls to include `{ signal }`
- [ ] Test that events are cleaned up on `remove()`

### Build System
- [ ] Verify Rollup UMD build auto-registers addon
- [ ] Test ESM build doesn't auto-register
- [ ] Update package.json exports if needed

### Examples
- [ ] Update all example sketches to use new API
- [ ] Create instance mode example
- [ ] Create test-modes.html verification file

### Documentation
- [ ] Update README.md installation section
- [ ] Update README.md usage examples (both modes)
- [ ] Update AGENTS.md architecture section
- [ ] Update API reference in README

### Testing
- [ ] Run `npm run build`
- [ ] Test examples in browser
- [ ] Verify no console errors
- [ ] Test sketch removal/cleanup
- [ ] Check for memory leaks (DevTools Memory tab)

---

## Naming Conventions Checklist

✅ **Already Compliant:**
- `createLayerSystem()` - camelCase ✓
- `BlendModes` - PascalCase for object ✓
- `LayerSystem`, `Layer`, `Compositor`, `LayerUI` - PascalCase for classes ✓
- No `p5.` prefix on custom classes ✓

❌ **To Avoid:**
- Don't use `p5.LayerSystem` (keep it just `LayerSystem`)
- Don't overwrite native JS (Math, console, Array, etc.)
- Don't overwrite p5 core functions (createCanvas, background, etc.)

---

## Expected Outcome

After implementation:

**Users can load via script tag:**
```html
<script src="p5.js"></script>
<script src="p5.millefeuille.js"></script>
```

**And use immediately in global mode:**
```javascript
function setup() {
  createCanvas(800, 600, WEBGL);
  let layers = createLayerSystem(); // Works!
}
```

**Or use in instance mode:**
```javascript
new p5(sketch => {
  let layers = sketch.createLayerSystem(); // Also works!
});
```

**Or import as ESM module:**
```javascript
import p5 from 'p5';
import millefeuilleAddon from 'p5.millefeuille';

p5.registerAddon(millefeuilleAddon);
```

---

## Potential Issues & Solutions

### Issue 1: Multiple Sketches on Same Page
**Problem:** Multiple p5 instances may create conflicting layer systems.

**Solution:** Each p5 instance should have its own LayerSystem. The addon pattern handles this automatically—each instance gets its own `createLayerSystem()` via prototype inheritance.

### Issue 2: LayerUI DOM Conflicts
**Problem:** Multiple layer UIs may conflict (same IDs, overlapping positions).

**Solution:** Already handled—LayerUI creates unique DOM elements per instance and uses class-based CSS selectors.

### Issue 3: Cleanup Not Working
**Problem:** Event listeners persist after `remove()` is called.

**Solution:** Use `this._removeSignal` for all event listeners (Task 4).

### Issue 4: UMD Bundle Not Auto-Registering
**Problem:** Script tag usage doesn't work without manual registration.

**Solution:** Ensure `typeof p5 !== 'undefined'` check in index.js and verify Rollup config includes p5 as external global.

---

## References

- [p5.js Addon Tutorial](https://beta.p5js.org/contribute/creating_libraries/)
- [p5.js GitHub - addon examples](https://github.com/processing/p5.js/blob/main/contributor_docs/creating_libraries.md)
- [p5.ble.js](https://github.com/ITPNYU/p5.ble.js) - Example addon using registerAddon
- [p5.serialserver](https://github.com/p5-serial/p5.serialserver) - Another addon reference

---

## Next Steps After Implementation

1. **Submit to p5.js Libraries page:**
   - Follow [submission guidelines](https://github.com/processing/p5.js-website/blob/main/contributor_docs/adding_libraries.md)
   - Create PR to p5.js website repo

2. **Publish to NPM:**
   ```bash
   npm publish
   ```

3. **Create documentation site:**
   - Use GitHub Pages for API reference
   - Add interactive examples

4. **Add to CDN:**
   - Submit to cdnjs
   - Submit to unpkg (automatic via NPM)

---

## Timeline Estimate

- **Phase 1-2 (Core + Cleanup):** 2-3 hours
- **Phase 3 (Build Config):** 1 hour
- **Phase 4 (Examples):** 1-2 hours  
- **Phase 5 (Docs):** 1-2 hours
- **Phase 6 (Testing):** 1 hour

**Total:** 6-9 hours of focused development work.

---

**End of Implementation Plan**
