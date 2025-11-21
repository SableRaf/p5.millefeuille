# Tutorial Step 6: Layer Management

## Concept: Centralized Layer Control

As projects grow, managing individual layers becomes cumbersome. A **LayerSystem** class centralizes layer management, making it easy to create, organize, and render multiple layers.

## Why a Layer System?

### Without LayerSystem:
```javascript
let layer1, layer2, layer3;
// ... create each layer
// ... call layer1.show(), layer2.show(), layer3.show() in order
```

### With LayerSystem:
```javascript
let layerSystem = new LayerSystem();
let id1 = layerSystem.createLayer('Layer 1');
// ... draw to layers
layerSystem.render();  // Renders all layers automatically!
```

## Code Walkthrough

### 1. LayerSystem Class Structure

```javascript
class LayerSystem {
  constructor() {
    this.layers = new Map();        // Store layers by ID
    this.layerIdCounter = 0;        // Auto-increment IDs
    this.activeLayerId = null;      // Track active layer
  }
}
```

**Key design decisions**:
- Use `Map` instead of array for O(1) lookup by ID
- Auto-increment IDs for unique layer identification
- Track active layer to prevent drawing conflicts

### 2. Creating Layers

```javascript
createLayer(name, options = {}) {
  const id = this.layerIdCounter++;
  const layer = new Layer(id, name || `Layer ${id}`, 
                         options.width || width, 
                         options.height || height);
  
  // Apply options
  if (options.visible !== undefined) layer.setVisible(options.visible);
  if (options.opacity !== undefined) layer.setOpacity(options.opacity);
  if (options.blendMode !== undefined) layer.setBlendMode(options.blendMode);
  if (options.zIndex !== undefined) layer.setZIndex(options.zIndex);
  
  this.layers.set(id, layer);
  return id;  // Return ID for reference
}
```

**Benefits**:
- Automatic ID assignment
- Configure layer properties on creation
- Returns ID for later reference

### 3. Drawing to Layers

```javascript
beginLayer(layerId) {
  const layer = this.layers.get(layerId);
  if (!layer) {
    console.error(`Layer ${layerId} not found`);
    return;
  }
  layer.begin();
  this.activeLayerId = layerId;
}

endLayer() {
  if (this.activeLayerId === null) {
    console.warn('No active layer to end');
    return;
  }
  const layer = this.layers.get(this.activeLayerId);
  if (layer) layer.end();
  this.activeLayerId = null;
}
```

**Safety features**:
- Error checking for invalid layer IDs
- Tracks active layer to prevent conflicts
- Clear warnings in console

### 4. Automatic Rendering

```javascript
render() {
  // Get all layers and sort by zIndex
  const sortedLayers = Array.from(this.layers.values())
    .sort((a, b) => a.zIndex - b.zIndex);
  
  // Draw each layer
  for (const layer of sortedLayers) {
    layer.show();
  }
}
```

**Key feature**: Automatically sorts layers by z-index before rendering!

## Usage Pattern

```javascript
// Setup
let layerSystem = new LayerSystem();
let bgId = layerSystem.createLayer('Background');
let fgId = layerSystem.createLayer('Foreground', { 
  blendMode: BlendModes.ADD 
});

// Draw
function draw() {
  layerSystem.beginLayer(bgId);
  // ... draw background
  layerSystem.endLayer();
  
  layerSystem.beginLayer(fgId);
  // ... draw foreground
  layerSystem.endLayer();
  
  layerSystem.render();  // Composite all layers
}
```

## Benefits Over Manual Management

### Automatic Sorting
No need to manually order `show()` calls - z-index handles it.

### Centralized Control
```javascript
layerSystem.setOpacity(layerId, 0.5);
layerSystem.setVisible(layerId, false);
```
All layer properties accessible through one interface.

### Error Prevention
- Can't draw to non-existent layers
- Warnings for common mistakes
- Tracks active layer state

### Scalability
Easy to add dozens of layers without cluttering code:
```javascript
for (let i = 0; i < 10; i++) {
  layerSystem.createLayer(`Layer ${i}`);
}
```

## Helper Methods

The LayerSystem provides convenience methods:

```javascript
layerSystem.setVisible(layerId, visible);
layerSystem.setOpacity(layerId, opacity);
layerSystem.setBlendMode(layerId, mode);
layerSystem.setZIndex(layerId, zIndex);
```

These wrap the individual layer methods for cleaner code.

## What's Next?

In Step 7, we'll add dynamic **layer reordering** to change z-index on the fly and rearrange layers interactively!

## Try It!

- Create more layers with different blend modes
- Toggle layer visibility with keyboard keys
- Animate layer opacity over time
- Create a layer and then remove it with `removeLayer()`
- Try changing z-index values and see how it affects rendering order
