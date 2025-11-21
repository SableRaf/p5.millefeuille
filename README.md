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

function setup() {
  createCanvas(800, 600, WEBGL);

  // Create the layer system
  layers = createLayerSystem(window);

  // Create layers - now with method chaining!
  layers.createLayer('background');
  layers.createLayer('effects')
    .setBlendMode(BlendModes.ADD)
    .setOpacity(0.7);
}

function draw() {
  // Draw to background layer - using string names
  layers.begin('background');
  clear();
  background(30, 30, 60);
  // ... draw your background content
  layers.end();

  // Draw to effects layer
  layers.begin('effects');
  clear();
  // ... draw your effects
  layers.end();

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

Creates a new layer and returns the Layer instance.

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

**Returns:** `Layer` - The created layer instance

**Example:**
```javascript
// Create and configure with chaining
layers.createLayer('Effects')
  .setBlendMode(BlendModes.ADD)
  .setOpacity(0.8);

// Or store the reference
const bg = layers.createLayer('Background');
```

---

#### `begin(layerIdOrName)` / `end()`

Begin and end drawing to a specific layer.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name

**Example:**
```javascript
// Using layer name (recommended)
layers.begin('Background');
clear();
background(255);
circle(0, 0, 100);
layers.end();

// Using layer reference
const bg = layers.createLayer('Background');
layers.begin(bg.id);
// ... draw
layers.end();
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

#### `show(layerIdOrName)` / `hide(layerIdOrName)`

Shows or hides a layer.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
layers.hide('Effects'); // Hide layer
layers.show('Effects'); // Show layer

// Chaining
layers.show('Effects').setOpacity(0.5);
```

---

#### `setOpacity(layerIdOrName, opacity)`

Sets layer opacity.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name
- `opacity` (number) - Opacity value 0-1 (will be clamped)

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
layers.setOpacity('Effects', 0.5); // 50% opacity

// Chaining
layers.setOpacity('Effects', 0.8).setBlendMode(BlendModes.ADD);
```

---

#### `setBlendMode(layerIdOrName, mode)`

Sets layer blend mode.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name
- `mode` (string) - One of: `BlendModes.NORMAL`, `BlendModes.MULTIPLY`, `BlendModes.SCREEN`, `BlendModes.ADD`, `BlendModes.SUBTRACT`

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
layers.setBlendMode('Effects', BlendModes.ADD);

// Chaining
layers.setBlendMode('Effects', BlendModes.MULTIPLY).setOpacity(0.7);
```

---

#### `setLayerIndex(layerIdOrName, zIndex)`

Sets the z-index (draw order) of a layer.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name
- `zIndex` (number) - Z-index value (higher = drawn on top)

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
layers.setLayerIndex('Background', 0);
layers.setLayerIndex('Effects', 10);
```

---

#### `moveLayer(layerIdOrName, delta)`

Moves a layer by a relative amount in the stack.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name
- `delta` (number) - Amount to move (positive = forward, negative = backward)

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
layers.moveLayer('Effects', 1); // Move forward by 1
```

---

#### `setMask(layerIdOrName, maskSource)` / `clearMask(layerIdOrName)`

Attach or remove a mask from a layer.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name
- `maskSource` (p5.Framebuffer | p5.Image) - The mask (grayscale, white=opaque, black=transparent)

**Returns:** `Layer|null` - The layer for chaining, or null if not found

**Example:**
```javascript
const maskBuffer = createFramebuffer({ width, height });
// ... draw to maskBuffer
layers.setMask('Content', maskBuffer);

// Remove mask
layers.clearMask('Content');

// Chaining
layers.setMask('Content', maskBuffer).setOpacity(0.8);
```

---

#### `removeLayer(layerIdOrName)`

Removes a layer and disposes of its resources.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name

**Example:**
```javascript
layers.removeLayer('Effects');
```

---

#### `getLayer(layerIdOrName)`

Gets a Layer instance by ID or name.

**Parameters:**
- `layerIdOrName` (number|string) - The layer ID or name

**Returns:** `Layer` object or null

**Example:**
```javascript
const layer = layers.getLayer('Effects');
console.log(layer.opacity);
```

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

#### `createUI(options)`

Creates an interactive UI panel for controlling layers.

**Parameters:**
- `options` (object, optional) - UI configuration
  - `position` (string) - Panel position: 'top-right' (default), 'top-left', 'bottom-right', 'bottom-left'
  - `width` (number) - Panel width in pixels (default: 280)
  - `collapsible` (boolean) - Allow collapsing the panel (default: true)
  - `draggable` (boolean) - Allow dragging the panel (default: true)

**Returns:** `LayerUI` instance

**Example:**
```javascript
// Basic UI
layers.createUI();

// Custom UI
layers.createUI({
  position: 'top-left',
  width: 320
});
```

**UI Features:**
- **Layer thumbnails**: Visual previews of each layer's content
- **Click to update**: Click any layer to refresh its thumbnail (thumbnails only update on click to maintain performance)
- **Visibility toggle**: Show/hide layers with checkbox
- **Opacity control**: Adjust layer opacity with slider
- **Blend mode selector**: Change layer blend modes
- **Collapsible**: Minimize the panel when not in use
- **Draggable**: Reposition the panel anywhere on screen

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
- **Compositor**: Handles the rendering pipeline using custom shaders for all layer compositing

## Limitations

- WebGL mode only (no 2D renderer support)
- Limited to WebGL-supported blend modes
- Masks must be same size as layer (or will be scaled)
- No adjustment layers or smart objects (not in MVP scope)

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/yourusername/p5.millefeuille).

## License

LGPL-2.1 License - see [LICENSE](LICENSE) file for details

## Credits

Inspired by:
- Photoshop's layer system
- [p5.layers](https://github.com/osteele/p5.libs/tree/main/p5.layers) by Oliver Steele (2D renderer)
- p5.js [Layered Rendering tutorial](https://p5js.org/tutorials/layered-rendering-with-framebuffers/)

Built with love for the creative coding community.

---

**p5.millefeuille** - Because every great sketch is built in layers.
