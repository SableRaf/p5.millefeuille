# p5.millefeuille

> A Photoshop-like layer system for p5.js WebGL

**p5.millefeuille** is a lightweight library that brings Photoshop-style layers to p5.js WebGL sketches. Built on top of `p5.Framebuffer`, it provides an intuitive API for creating, compositing, and manipulating multiple rendering layers with blend modes, opacity, and masking support.

## Features

- **Layer Management**: Create, remove, and reorder layers with ease
- **Blend Modes**: NORMAL, MULTIPLY, SCREEN, ADD, SUBTRACT
- **Layer Properties**: Control visibility, opacity, and z-index
- **Masking**: Apply grayscale masks to layers for selective revealing
- **Performance**: Optimized single-pass compositing using WebGL
- **Auto-resize**: Automatically handles canvas size changes
- **Clean API**: Inspired by Photoshop but designed for creative coding

## Installation

### npm

```bash
npm install p5.millefeuille
```

### CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/2.1.1/p5.min.js"></script>
<script type="module">
  import { createLayerSystem, BlendModes } from 'https://unpkg.com/p5.millefeuille/dist/p5.millefeuille.esm.js';
  // Your code here
</script>
```

## Quick Start

```javascript
import { createLayerSystem, BlendModes } from 'p5.millefeuille';

let layers;
let bgLayer, fxLayer;

function setup() {
  createCanvas(800, 600, WEBGL);

  // Create the layer system
  layers = createLayerSystem(window);

  // Create layers
  bgLayer = layers.createLayer('background');
  fxLayer = layers.createLayer('effects', {
    blendMode: BlendModes.ADD,
    opacity: 0.7
  });
}

function draw() {
  // Draw to background layer
  layers.beginLayer(bgLayer);
  clear();
  background(30, 30, 60);
  // ... draw your background content
  layers.endLayer();

  // Draw to effects layer
  layers.beginLayer(fxLayer);
  clear();
  // ... draw your effects
  layers.endLayer();

  // Composite all layers to main canvas
  layers.render();
}
```

## API Reference

### `createLayerSystem(p5Instance)`

Factory function to create a new LayerSystem.

**Parameters:**
- `p5Instance` (p5) - The p5.js instance (required in instance mode, auto-detected in global mode)

**Returns:** `LayerSystem` instance

**Example:**
```javascript
const layers = createLayerSystem(window);
```

---

### LayerSystem Methods

#### `createLayer(name, options)`

Creates a new layer and returns its ID.

**Parameters:**
- `name` (string, optional) - Human-readable name for the layer
- `options` (object, optional) - Layer configuration
  - `visible` (boolean) - Initial visibility (default: true)
  - `opacity` (number) - Initial opacity 0-1 (default: 1.0)
  - `blendMode` (string) - Blend mode from BlendModes (default: NORMAL)
  - `width` (number) - Custom width (default: canvas width)
  - `height` (number) - Custom height (default: canvas height)
  - `density` (number) - Pixel density (default: canvas density)
  - `depth` (boolean) - Enable depth buffer (default: false)
  - `antialias` (boolean) - Enable antialiasing (default: false)

**Returns:** `number` - Layer ID

**Example:**
```javascript
const bgLayer = layers.createLayer('Background');
const fxLayer = layers.createLayer('Effects', {
  blendMode: BlendModes.ADD,
  opacity: 0.8
});
```

---

#### `beginLayer(layerId)` / `endLayer()`

Begin and end drawing to a specific layer.

**Parameters:**
- `layerId` (number) - The ID of the layer to draw to

**Example:**
```javascript
layers.beginLayer(bgLayer);
clear();
background(255);
circle(0, 0, 100);
layers.endLayer();
```

---

#### `render(clearCallback)`

Composites all visible layers to the main canvas.

**Parameters:**
- `clearCallback` (function, optional) - Custom clear function called before compositing

**Example:**
```javascript
// Default clear
layers.render();

// Custom clear
layers.render(() => {
  background(0, 0, 0, 0); // Transparent background
});
```

---

#### `setVisible(layerId, visible)`

Sets layer visibility.

**Parameters:**
- `layerId` (number) - The layer ID
- `visible` (boolean) - Visibility state

**Example:**
```javascript
layers.setVisible(fxLayer, false); // Hide layer
```

---

#### `setOpacity(layerId, opacity)`

Sets layer opacity.

**Parameters:**
- `layerId` (number) - The layer ID
- `opacity` (number) - Opacity value 0-1 (will be clamped)

**Example:**
```javascript
layers.setOpacity(fxLayer, 0.5); // 50% opacity
```

---

#### `setBlendMode(layerId, mode)`

Sets layer blend mode.

**Parameters:**
- `layerId` (number) - The layer ID
- `mode` (string) - One of: `BlendModes.NORMAL`, `BlendModes.MULTIPLY`, `BlendModes.SCREEN`, `BlendModes.ADD`, `BlendModes.SUBTRACT`

**Example:**
```javascript
layers.setBlendMode(fxLayer, BlendModes.ADD);
```

---

#### `setLayerIndex(layerId, zIndex)`

Sets the z-index (draw order) of a layer.

**Parameters:**
- `layerId` (number) - The layer ID
- `zIndex` (number) - Z-index value (higher = drawn on top)

**Example:**
```javascript
layers.setLayerIndex(bgLayer, 0);
layers.setLayerIndex(fxLayer, 10);
```

---

#### `moveLayer(layerId, delta)`

Moves a layer by a relative amount in the stack.

**Parameters:**
- `layerId` (number) - The layer ID
- `delta` (number) - Amount to move (positive = forward, negative = backward)

**Example:**
```javascript
layers.moveLayer(fxLayer, 1); // Move forward by 1
```

---

#### `setMask(layerId, maskSource)` / `clearMask(layerId)`

Attach or remove a mask from a layer.

**Parameters:**
- `layerId` (number) - The layer ID
- `maskSource` (p5.Framebuffer | p5.Image) - The mask (grayscale, white=opaque, black=transparent)

**Example:**
```javascript
const maskBuffer = createFramebuffer({ width, height });
// ... draw to maskBuffer
layers.setMask(contentLayer, maskBuffer);

// Remove mask
layers.clearMask(contentLayer);
```

---

#### `removeLayer(layerId)`

Removes a layer and disposes of its resources.

**Parameters:**
- `layerId` (number) - The layer ID

**Example:**
```javascript
layers.removeLayer(fxLayer);
```

---

#### `getLayer(layerId)`

Gets a Layer instance by ID.

**Returns:** `Layer` object or null

---

#### `getLayers()`

Gets all layers as an array, sorted by z-index.

**Returns:** `Layer[]`

---

#### `getLayerInfo()`

Gets layer information as plain objects.

**Returns:** `Object[]` - Array of layer info objects

**Example:**
```javascript
const info = layers.getLayerInfo();
console.log(info);
// [{ id: 0, name: 'Background', visible: true, opacity: 1, ... }]
```

---

#### `setAutoResize(enabled)`

Enable or disable automatic layer resizing when canvas size changes.

**Parameters:**
- `enabled` (boolean) - Auto-resize state

---

#### `dispose()`

Disposes of all layers and resources. Call when done with the layer system.

---

## Blend Modes

Available blend modes in `BlendModes`:

- **NORMAL** - Standard alpha blending
- **MULTIPLY** - Darkens colors
- **SCREEN** - Lightens colors (approximated in WebGL)
- **ADD** - Additive blending (great for glows)
- **SUBTRACT** - Subtractive blending

## Examples

### Basic Layer System

See [examples/01-basic.html](examples/01-basic.html) for a complete example with multiple layers.

### Blend Modes

See [examples/02-blend-modes.html](examples/02-blend-modes.html) for interactive blend mode demonstration.

### Masking

See [examples/03-masking.html](examples/03-masking.html) for spotlight/reveal effects using masks.

## Performance Tips

1. **Minimize layer count**: More layers = more compositing passes
2. **Match layer size to needs**: Smaller layers for UI elements
3. **Reuse layers**: Clear and redraw instead of creating new layers each frame
4. **Disable unused layers**: Set `visible: false` instead of removing
5. **Use appropriate blend modes**: NORMAL is fastest

## Browser Support

Requires WebGL support (WebGL 1.0 or 2.0). Works in all modern browsers:
- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

## Requirements

- p5.js 2.1.1 or higher (for stable `createFramebuffer` API)
- WebGL mode (`createCanvas(w, h, WEBGL)`)

## Architecture

- **LayerSystem**: Manages the layer stack and coordinates rendering
- **Layer**: Wraps a `p5.Framebuffer` with metadata (opacity, blend mode, etc.)
- **Compositor**: Handles the rendering pipeline with shader support for masking

## Limitations

- WebGL mode only (no 2D renderer support)
- Limited to WebGL-supported blend modes
- Masks must be same size as layer (or will be scaled)
- No adjustment layers or smart objects (not in MVP scope)

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/yourusername/p5.millefeuille).

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Inspired by:
- Photoshop's layer system
- [p5.layers](https://github.com/osteele/p5.libs/tree/main/p5.layers) by Oliver Steele (2D renderer)
- p5.js [Layered Rendering tutorial](https://p5js.org/tutorials/layered-rendering-with-framebuffers/)

Built with love for the creative coding community.

---

**p5.millefeuille** - Because every great sketch is built in layers.
