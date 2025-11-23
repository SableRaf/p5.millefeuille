# p5.millefeuille - Project Context for AI Assistants

## Project Overview

**p5.millefeuille** is a lightweight library that brings Photoshop-style layers to p5.js WebGL sketches. Built on top of `p5.Framebuffer`, it provides an intuitive API for creating, compositing, and manipulating multiple rendering layers with blend modes, opacity, and masking support.

### Core Purpose
To provide an easy-to-use, Photoshop-like layer system for p5.js WebGL sketches, enabling creative coders to build complex layered compositions without manually juggling framebuffers.

### Key Features
- Layer management (create, remove, reorder)
- Blend modes (NORMAL, MULTIPLY, SCREEN, ADD, SUBTRACT)
- Layer properties (visibility, opacity, z-index)
- Masking support for selective revealing
- Performance-optimized single-pass WebGL compositing
- Auto-resize capability for responsive canvases
- Clean, Photoshop-inspired API

## Architecture

### Core Components

#### 1. **LayerSystem** ([src/LayerSystem.js](src/LayerSystem.js))
The main orchestrator that manages the layer stack and coordinates rendering.

**Key Responsibilities:**
- Manages the layer collection (Map of layer IDs to Layer instances)
- Maintains name-to-ID mapping (Map) for string-based layer lookups
- Provides factory function `createLayerSystem()` for initialization
- Handles layer lifecycle (create, remove, get)
- Coordinates drawing operations (begin/end)
- Manages layer properties (visibility via show/hide, opacity, blend mode, z-index, masks)
- Detects canvas resizes and updates layers accordingly
- Validates WebGL mode on construction

**Important Implementation Details:**
- Auto-detects p5 instance in global mode (checks `window.p5.instance`)
- Validates WebGL context on initialization
- Tracks active layer to prevent nested begin calls
- Maintains canvas size state for auto-resize detection
- Uses auto-incrementing IDs for layers
- Layers can be accessed by numeric ID or string name via `_getLayerById()` helper
- Methods return Layer instances for chaining support

#### 2. **Layer** ([src/Layer.js](src/Layer.js))
Represents a single layer backed by a `p5.Framebuffer` with metadata.

**Key Responsibilities:**
- Wraps a `p5.Framebuffer` with rendering metadata
- Manages layer properties (visible via show/hide, opacity, blendMode, zIndex)
- Handles framebuffer lifecycle (create, resize, dispose)
- Provides mask attachment/removal
- Implements begin/end drawing to the layer's framebuffer
- **Supports method chaining** - all setter methods return `this`

**Important Implementation Details:**
- Framebuffer options match canvas by default (width, height, density)
- Opacity values are clamped to [0, 1] range
- Masks can be either `p5.Framebuffer` or `p5.Image`
- Uses `customSize` flag to track layers with custom dimensions (prevents auto-resize)
- Implements `toJSON()` for debugging/inspection
- All modifier methods (`show`, `hide`, `setOpacity`, `setBlendMode`, `setZIndex`, `setMask`, `clearMask`) return `this` for fluent API

#### 3. **Compositor** ([src/Compositor.js](src/Compositor.js))
Handles the rendering pipeline and shader-based compositing.

**Key Responsibilities:**
- Composites all visible layers to the main canvas
- Applies blend modes using p5.js blend mode constants
- Renders all layers via custom shaders to avoid WebGL framebuffer compatibility issues
- Manages compositor shader lifecycle
- Preserves and restores WebGL state

**Important Implementation Details:**
- Lazy shader creation via `_ensureShader()`
- All layers are rendered using the compositor shader via `_renderLayerWithShader()`
- Shader handles both masked and non-masked layers through uniforms
- Opacity is controlled via `layerOpacity` shader uniform
- Sorts layers by z-index before rendering (ascending order)
- Resets shader, blend mode after each layer

#### 4. **Constants** ([src/constants.js](src/constants.js))
Defines blend modes and default configuration.

**Exports:**
- `BlendModes`: Object with blend mode constants (NORMAL, MULTIPLY, SCREEN, ADD, SUBTRACT)
- `getP5BlendMode()`: Maps library blend modes to p5.js constants
- `DEFAULT_LAYER_OPTIONS`: Default layer configuration

**Important Notes:**
- SCREEN mode uses p5's `LIGHTEST` as approximation (WebGL limitation)
- Default layer options: visible=true, opacity=1.0, blendMode=NORMAL, depth=false, antialias=false

#### 5. **Shaders** ([src/shaders/](src/shaders/))
Custom GLSL shaders for advanced compositing.

**Files:**
- `compositor.vert`: Vertex shader for masked layer rendering
- `compositor.frag`: Fragment shader that applies layer texture with mask

**Shader Uniforms:**
- `layerTexture`: The layer's framebuffer texture
- `maskTexture`: The mask texture (grayscale)
- `hasMask`: Boolean flag (currently always true when shader is used)
- `layerOpacity`: Layer opacity value (0-1)

### Data Flow

1. **Setup Phase:**
   ```
   createCanvas(WEBGL) → createLayerSystem() → LayerSystem validates WebGL → Compositor created
   ```

2. **Layer Creation:**
   ```
   layers.createLayer() → Layer instance created → p5.Framebuffer allocated → Added to layers Map
   ```

3. **Drawing Phase:**
   ```
   layers.beginLayer(id) → Layer.begin() → framebuffer.begin() → User draws → layers.endLayer() → Layer.end()
   ```

4. **Rendering Phase:**
   ```
   layers.render() → Compositor.render() → Layers sorted by zIndex → For each visible layer:
     - Set blend mode
     - Use compositor shader with layer texture, mask (if any), and opacity uniforms
     - Draw full-screen quad with shader
   → Restore state
   ```

## File Structure

```
p5.millefeuille/
├── src/
│   ├── index.js              # Main entry point, exports public API
│   ├── LayerSystem.js        # Layer manager and factory
│   ├── Layer.js              # Individual layer class
│   ├── Compositor.js         # Rendering pipeline
│   ├── constants.js          # Blend modes and defaults
│   └── shaders/
│       ├── compositor.vert   # Vertex shader for masking
│       └── compositor.frag   # Fragment shader for masking
├── dist/                     # Built distribution files (Rollup output)
├── examples/                 # HTML example files
│   ├── 01-basic.html        # Basic multi-layer example
│   ├── 02-blend-modes.html  # Blend mode demonstrations
│   └── 03-masking.html      # Mask usage examples
├── lib/                      # Vendored dependencies (p5.js)
├── test/                     # Unit tests (Jest)
├── rollup.config.js         # Build configuration
├── package.json             # NPM package metadata
├── PRD.md                   # Product Requirements Document
└── README.md                # User-facing documentation
```

## Public API Reference

### Factory Function
- `createLayerSystem(p5Instance)` → Returns LayerSystem instance

### LayerSystem Methods

**Layer Lifecycle:**
- `createLayer(name?, options?)` → Returns Layer instance (supports method chaining)
- `removeLayer(layerIdOrName)` → Removes and disposes layer (accepts ID or name)
- `getLayer(layerIdOrName)` → Returns Layer instance or null (accepts ID or name)
- `getLayers()` → Returns all layers sorted by z-index
- `getLayerInfo()` → Returns layer metadata as plain objects

**Drawing:**
- `begin(layerIdOrName)` → Start drawing to layer (accepts ID or name)
- `end()` → Stop drawing to current layer
- `render(clearCallback?)` → Composite all layers to main canvas

**Layer Properties (all accept ID or name, return Layer for chaining):**
- `show(layerIdOrName)` → Makes layer visible
- `hide(layerIdOrName)` → Makes layer invisible
- `setOpacity(layerIdOrName, opacity)` → Opacity 0-1
- `setBlendMode(layerIdOrName, mode)` → Use BlendModes constants
- `setLayerIndex(layerIdOrName, zIndex)` → Absolute z-index
- `moveLayer(layerIdOrName, delta)` → Relative z-index change

**Masking (accept ID or name, return Layer for chaining):**
- `setMask(layerIdOrName, maskSource)` → Attach mask (Framebuffer or Image)
- `clearMask(layerIdOrName)` → Remove mask

**Configuration:**
- `setAutoResize(enabled)` → Enable/disable auto-resize on canvas size change
- `dispose()` → Clean up all resources

### Layer Options (createLayer)
```javascript
{
  visible: boolean,        // Default: true
  opacity: number,         // Default: 1.0 (range: 0-1)
  blendMode: string,       // Default: BlendModes.NORMAL
  width: number,           // Default: canvas width
  height: number,          // Default: canvas height
  density: number,         // Default: canvas pixel density
  depth: boolean,          // Default: false
  antialias: boolean,      // Default: false
  zIndex: number           // Default: layer ID
}
```

## Technical Constraints

### Requirements
- **p5.js Version:** 2.1.1+ (for stable `createFramebuffer` API)
- **Rendering Mode:** WebGL only (2D mode not supported)
- **Browser:** Modern browsers with WebGL 1.0 or 2.0 support

### Limitations
- WebGL mode only (no 2D renderer support)
- Limited to WebGL-supported blend modes
- SCREEN blend mode uses LIGHTEST as approximation
- Masks must be same size as layer (or will be scaled)
- No adjustment layers or smart objects (not in MVP scope)
- No layer groups or nesting

### Performance Considerations
- Each layer requires a separate framebuffer allocation
- More layers = more compositing passes
- Masking requires shader switching (slight overhead)
- Auto-resize recreates all framebuffers on canvas size change
- Recommended: 3-5 full-screen layers for 60fps on mid-range hardware

## Development Workflow

### Tooling Overview
- **Rollup 4** (`rollup.config.js`) builds the library into UMD (dev + minified) and ESM bundles, using `@rollup/plugin-node-resolve`, `rollup-plugin-glslify`, a lightweight shader loader, and `@rollup/plugin-terser` for minification.
- **Jest 29** runs the unit tests inside `test/` with a custom `CanvasSafeEnvironment` and shader/canvas mocks; source files are transformed via `babel-jest` + `@babel/preset-env` strictly for test-time transpilation.
- **ESLint 8** lints `src/**/*.js` through `npm run lint`, enforcing consistent style across the core modules.
- **Webpack 5** (`webpack.deploy.js`) packages the `/examples` site for GitHub Pages, inlining build timestamps, rewriting asset paths, and copying the built library + assets into `.gh-pages/` prior to publishing.
- **http-server** powers `npm run examples`, serving the repo at `localhost:8000` with auto-kill of any stale process; **gh-pages** then pushes `.gh-pages/` to the `gh-pages` branch via `npm run deploy`.

### Build System
- **Tool:** Rollup
- **Commands:**
  - `npm run build` - Production build
  - `npm run dev` - Watch mode for development
  - `npm run lint` - ESLint check
  - `npm run test` - Jest test suite
  - `npm run examples` - Launch examples server on port 8000

### Build Outputs (dist/)
- `p5.millefeuille.js` - UMD bundle (main)
- `p5.millefeuille.esm.js` - ES Module (module)
- `p5.millefeuille.min.js` - Minified UMD (unpkg)

#### Why Ship Both UMD and ESM?
- UMD keeps `<script>` tag users covered, but modern bundlers default to the ESM entry for tree-shaking and native `import` syntax.
- Browsers can load the ESM build directly via `<script type="module">`, so dropping it would block zero-tooling users on modern stacks.
- Package managers choose between the `main` (UMD) and `module` (ESM) fields automatically; removing ESM silently forces everyone onto the heavier fallback bundle.

#### Deployment Bundler
- Rollup handles the library builds exclusively; it is optimized for producing the distributable bundles in `dist/`.
- Webpack is reserved for `npm run deploy`, where it packages the `examples/` site (HTML, CSS, assets) into a static artifact, something Rollup is not configured to do.

### Testing
- Framework: Jest
- Test directory: `test/`
- Coverage areas: Layer creation, property setting, compositing logic

## Common Patterns

### Basic Usage Pattern
```javascript
// Setup
let layers;

function setup() {
  createCanvas(800, 600, WEBGL);
  layers = createLayerSystem();
  
  // Create layers with string names and method chaining
  layers.createLayer('Background');
  layers.createLayer('Effects')
    .setBlendMode(BlendModes.ADD)
    .setOpacity(0.7);
}

function draw() {
  // Draw to background - using string-based access
  layers.begin('Background');
  clear();
  // ... draw content
  layers.end();

  // Draw to effects
  layers.begin('Effects');
  clear();
  // ... draw effects
  layers.end();

  // Composite
  layers.render();
}
```

### Masking Pattern
```javascript
// Create mask framebuffer
const maskBuffer = createFramebuffer({ width, height });

// Draw to mask
maskBuffer.begin();
clear();
fill(255); // White = visible
circle(0, 0, 100);
maskBuffer.end();

// Apply mask - using string name and chaining
layers.setMask('Content', maskBuffer).setOpacity(0.8);
```

### Dynamic Layer Management
```javascript
// Create layer on demand with chaining
if (needsNewLayer) {
  layers.createLayer('Dynamic')
    .setZIndex(10)
    .setBlendMode(BlendModes.ADD);
}

// Toggle visibility - using string names
const layer = layers.getLayer('Effects');
if (layer.visible) {
  layers.hide('Effects');
} else {
  layers.show('Effects');
}

// Cleanup
layers.removeLayer('OldLayer');
```

## Error Handling

### Common Errors
1. **"Canvas not initialized"** - `createLayerSystem()` called before `createCanvas()`
2. **"LayerSystem requires WebGL mode"** - Canvas not created with WEBGL parameter
3. **"Layer X not found"** - Invalid layer ID or name passed to methods
4. **"Layer X is already active"** - Nested `begin()` calls without `end()`
5. **"Failed to create framebuffer"** - WebGL context lost or insufficient resources

### Validation
- Layer IDs and names are validated on all methods (console.warn if not found)
- Opacity values are clamped to [0, 1]
- Blend modes are validated against BlendModes constants
- Active layer state prevents nested drawing

## Future Enhancements (Not in Current Scope)

Based on PRD "Non-Goals" section:
- Full Photoshop feature parity (adjustment layers, smart objects)
- 2D renderer support
- GUI layer editor
- Additional blend modes (OVERLAY, SOFT_LIGHT, etc.)
- Layer groups/nesting
- Layer effects (drop shadows, glows, etc.)

## Debugging Tips

### Inspect Layers
```javascript
console.log(layers.getLayerInfo());
// Shows: id, name, visible, opacity, blendMode, zIndex, hasMask, width, height
```

### Check Active Layer
```javascript
console.log(layers.activeLayerId); // null if none active
```

### Verify WebGL Context
```javascript
console.log(p5Instance._renderer.drawingContext);
// Should be WebGLRenderingContext or WebGL2RenderingContext
```

### Performance Profiling
- Use browser DevTools Performance tab
- Watch for excessive framebuffer allocations
- Check draw calls in WebGL inspector
- Monitor memory usage for framebuffer leaks

### Screenshots & Visual Debugging
Use playwrigth MCP to capture screenshots of layer compositions for visual debugging.

### p5.js 2.x reference
We are using p5.js 2.1.1 so refer to the latest documentation at https://beta.p5js.org/reference/. Until 2.x is the default, refer to the beta site.

## Related Resources

- [p5.js Framebuffer Reference](https://p5js.org/reference/p5/createFramebuffer/)
- [p5.js Layered Rendering Tutorial](https://p5js.org/tutorials/layered-rendering-with-framebuffers/)
- [Oliver Steele's p5.layers (2D version)](https://github.com/osteele/p5.libs/tree/main/p5.layers)
- [PRD.md](PRD.md) - Product Requirements Document
- [README.md](README.md) - User documentation

## Contributing Guidelines

When making changes:
1. Maintain WebGL-only constraint
2. Preserve state before/after compositing
3. Add console warnings for invalid operations (not silent failures)
4. Update README.md for API changes
5. Add examples for new features
6. Run lint and tests before committing
7. Follow existing code style (ES6 modules, JSDoc comments)

## Version Information

- **Current Version:** 0.1.0
- **License:** LGPL-2.1
- **Peer Dependency:** p5.js ^2.1.1

## Documentation and Memory Files

- [PRD.md](PRD.md) - Product Requirements Document
- [TODO.md](TODO.md) - Task tracking and future work
- `.claude/` - AI assistant memory files 
- [AGENTS.md](AGENTS.md) - AI assistant context and configurations

After any significant code changes:
- run tests to ensure no regressions.
- update the files above to keep documentation in sync.
- ensure relevant memory files in `.claude/{{fileName}}.md` are updated to reflect changes.


## Changelog

### 2025-11-21
  - ✅ Installed glsl-blend and rollup-plugin-glslify
  - ✅ Replaced custom shaders with glsl-blend functions
  - ✅ Implemented ping-pong buffer compositing for proper blend mode support
  - ✅ Added 14 blend modes: Normal, Multiply, Screen, Add, Subtract, Overlay, Soft Light, Hard Light, Color Dodge, Color Burn, Darken, Lighten, Difference, Exclusion
  - ✅ Updated compositor to use shader-based blending instead of p5.js blend modes
  - ⚠️ Note: Hue, Luminance, Saturation & Color modes are not available in glsl-blend (see issue #3)