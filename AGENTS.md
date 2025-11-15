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
- Provides factory function `createLayerSystem()` for initialization
- Handles layer lifecycle (create, remove, get)
- Coordinates drawing operations (beginLayer/endLayer)
- Manages layer properties (visibility, opacity, blend mode, z-index, masks)
- Detects canvas resizes and updates layers accordingly
- Validates WebGL mode on construction

**Important Implementation Details:**
- Auto-detects p5 instance in global mode (checks `window.p5.instance`)
- Validates WebGL context on initialization
- Tracks active layer to prevent nested beginLayer calls
- Maintains canvas size state for auto-resize detection
- Uses auto-incrementing IDs for layers

#### 2. **Layer** ([src/Layer.js](src/Layer.js))
Represents a single layer backed by a `p5.Framebuffer` with metadata.

**Key Responsibilities:**
- Wraps a `p5.Framebuffer` with rendering metadata
- Manages layer properties (visible, opacity, blendMode, zIndex)
- Handles framebuffer lifecycle (create, resize, dispose)
- Provides mask attachment/removal
- Implements begin/end drawing to the layer's framebuffer

**Important Implementation Details:**
- Framebuffer options match canvas by default (width, height, density)
- Opacity values are clamped to [0, 1] range
- Masks can be either `p5.Framebuffer` or `p5.Image`
- Uses `customSize` flag to track layers with custom dimensions (prevents auto-resize)
- Implements `toJSON()` for debugging/inspection

#### 3. **Compositor** ([src/Compositor.js](src/Compositor.js))
Handles the rendering pipeline and shader-based compositing.

**Key Responsibilities:**
- Composites all visible layers to the main canvas
- Applies blend modes using p5.js blend mode constants
- Handles masked layer rendering via custom shaders
- Manages compositor shader lifecycle
- Preserves and restores WebGL state

**Important Implementation Details:**
- Lazy shader creation via `_ensureShader()`
- For non-masked layers: uses `p.tint()` for opacity and `p.texture()` + `p.plane()` for rendering
- For masked layers: uses custom shader with mask texture uniform
- Sorts layers by z-index before rendering (ascending order)
- Resets shader, blend mode, and tint after each layer

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
     - If masked: Use compositor shader + draw quad
     - If not masked: Use tint + texture on plane
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
- `createLayer(name?, options?)` → Returns layer ID (number)
- `removeLayer(layerId)` → Removes and disposes layer
- `getLayer(layerId)` → Returns Layer instance or null
- `getLayers()` → Returns all layers sorted by z-index
- `getLayerInfo()` → Returns layer metadata as plain objects

**Drawing:**
- `beginLayer(layerId)` → Start drawing to layer
- `endLayer()` → Stop drawing to current layer
- `render(clearCallback?)` → Composite all layers to main canvas

**Layer Properties:**
- `setVisible(layerId, visible)`
- `setOpacity(layerId, opacity)` → Opacity 0-1
- `setBlendMode(layerId, mode)` → Use BlendModes constants
- `setLayerIndex(layerId, zIndex)` → Absolute z-index
- `moveLayer(layerId, delta)` → Relative z-index change

**Masking:**
- `setMask(layerId, maskSource)` → Attach mask (Framebuffer or Image)
- `clearMask(layerId)` → Remove mask

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

### Testing
- Framework: Jest
- Test directory: `test/`
- Coverage areas: Layer creation, property setting, compositing logic

## Common Patterns

### Basic Usage Pattern
```javascript
// Setup
let layers, bgLayer, fxLayer;

function setup() {
  createCanvas(800, 600, WEBGL);
  layers = createLayerSystem();
  bgLayer = layers.createLayer('Background');
  fxLayer = layers.createLayer('Effects', {
    blendMode: BlendModes.ADD,
    opacity: 0.7
  });
}

function draw() {
  // Draw to background
  layers.beginLayer(bgLayer);
  clear();
  // ... draw content
  layers.endLayer();

  // Draw to effects
  layers.beginLayer(fxLayer);
  clear();
  // ... draw effects
  layers.endLayer();

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

// Apply mask
layers.setMask(contentLayer, maskBuffer);
```

### Dynamic Layer Management
```javascript
// Create layer on demand
if (needsNewLayer) {
  const newLayer = layers.createLayer('Dynamic');
  layers.setLayerIndex(newLayer, 10); // Move to top
}

// Toggle visibility
layers.setVisible(layerId, !layers.getLayer(layerId).visible);

// Cleanup
layers.removeLayer(oldLayerId);
```

## Error Handling

### Common Errors
1. **"Canvas not initialized"** - `createLayerSystem()` called before `createCanvas()`
2. **"LayerSystem requires WebGL mode"** - Canvas not created with WEBGL parameter
3. **"Layer X not found"** - Invalid layer ID passed to methods
4. **"Layer X is already active"** - Nested `beginLayer()` calls without `endLayer()`
5. **"Failed to create framebuffer"** - WebGL context lost or insufficient resources

### Validation
- Layer IDs are validated on all methods (console.warn if not found)
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
- **License:** MIT
- **Peer Dependency:** p5.js ^2.1.1
