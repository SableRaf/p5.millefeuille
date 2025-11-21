# Tutorial Step 7: Z-Index and Ordering

## Concept: Dynamic Layer Reordering

**Z-index** controls the stacking order of layers - which appears on top of which. Unlike fixed rendering order, z-index allows you to dynamically reorder layers at runtime.

## Understanding Z-Index

### How Z-Index Works
- **Lower values**: Rendered first (bottom layers)
- **Higher values**: Rendered last (top layers)
- **Same value**: Order depends on creation order

```
z-index: 0  →  Bottom layer
z-index: 1  →  Middle layer  
z-index: 2  →  Top layer
```

### Benefits Over Fixed Order
```javascript
// Fixed order (bad):
layer1.show();
layer2.show();
layer3.show();

// Z-index based (good):
render();  // Automatically sorts by z-index!
```

## Code Walkthrough

### 1. Sorting by Z-Index

```javascript
getSortedLayers() {
  return Array.from(this.layers.values())
    .sort((a, b) => a.zIndex - b.zIndex);
}

render() {
  const sortedLayers = this.getSortedLayers();
  for (const layer of sortedLayers) {
    layer.show();
  }
}
```

**Key insight**: Layers are always rendered in z-index order, regardless of creation order.

### 2. Moving Layers Relative

```javascript
moveLayerUp(layerId) {
  const layer = this.layers.get(layerId);
  if (layer) {
    layer.setZIndex(layer.zIndex + 1);  // Increment z-index
  }
}

moveLayerDown(layerId) {
  const layer = this.layers.get(layerId);
  if (layer) {
    layer.setZIndex(layer.zIndex - 1);  // Decrement z-index
  }
}
```

**Relative movement**: Change z-index by +1 or -1 to move one "step" in the stack.

### 3. Absolute Positioning

```javascript
sendToFront(layerId) {
  const layer = this.layers.get(layerId);
  if (!layer) return;
  const maxZ = Math.max(...Array.from(this.layers.values()).map(l => l.zIndex));
  layer.setZIndex(maxZ + 1);  // Higher than highest
}

sendToBack(layerId) {
  const layer = this.layers.get(layerId);
  if (!layer) return;
  const minZ = Math.min(...Array.from(this.layers.values()).map(l => l.zIndex));
  layer.setZIndex(minZ - 1);  // Lower than lowest
}
```

**Absolute movement**: Calculate min/max z-index and position relative to that.

## Z-Index Strategies

### Sequential Z-Index (Simple)
```javascript
layer1.zIndex = 0;
layer2.zIndex = 1;
layer3.zIndex = 2;
```
Easy to understand, but reordering requires updating multiple layers.

### Spaced Z-Index (Flexible)
```javascript
layer1.zIndex = 0;
layer2.zIndex = 100;
layer3.zIndex = 200;
```
Allows inserting layers between existing ones without renumbering.

### Dynamic Z-Index (Our Approach)
```javascript
// Z-index can be any value
// System automatically sorts before rendering
layer.setZIndex(layer.zIndex + 1);
```
Most flexible - values can be negative, non-sequential, duplicated.

## Interactive Controls

The demo includes keyboard controls:

### Layer Selection
```javascript
if (key === '1') selectedLayerId = redLayerId;
if (key === '2') selectedLayerId = greenLayerId;
if (key === '3') selectedLayerId = blueLayerId;
```

### Movement
```javascript
if (keyCode === UP_ARROW) {
  layerSystem.moveLayerUp(selectedLayerId);
}
if (keyCode === DOWN_ARROW) {
  layerSystem.moveLayerDown(selectedLayerId);
}
```

### Jump to Front/Back
```javascript
if (key === 'f') layerSystem.sendToFront(selectedLayerId);
if (key === 'b') layerSystem.sendToBack(selectedLayerId);
```

## Visual Feedback

The demo displays the current layer order:
```javascript
const sortedLayers = layerSystem.getSortedLayers();
sortedLayers.forEach((layer, index) => {
  text(`${layer.name} (z: ${layer.zIndex})`, x, y);
});
```

Watch the list update as you reorder layers!

## Practical Applications

### UI Layers
```javascript
backgroundLayer.zIndex = 0;
contentLayer.zIndex = 100;
uiLayer.zIndex = 200;
tooltipLayer.zIndex = 300;
```

### Depth Sorting
```javascript
// Sort by distance from camera
objects.forEach(obj => {
  layer.zIndex = obj.depth;
});
```

### Priority Systems
```javascript
// Higher priority = rendered on top
layer.zIndex = priority * 100;
```

## Edge Cases to Consider

### Duplicate Z-Index
When multiple layers have the same z-index, JavaScript's sort is stable - they maintain their original relative order.

### Negative Z-Index
Perfectly valid! Can be useful for "always background" layers:
```javascript
backgroundLayer.zIndex = -1000;
```

### Large Gaps
Z-index values don't need to be sequential - gaps are fine:
```javascript
layer1.zIndex = 0;
layer2.zIndex = 1000;  // Big gap is OK!
```

## What's Next?

In Step 8, we'll add **masking** using custom GLSL shaders to selectively reveal parts of layers!

## Try It!

- Add a fourth layer and practice reordering
- Implement numeric keys (1-9) to set absolute z-index
- Add mouse drag to reorder layers visually
- Create an animation that cycles layers through the stack
- Try giving all layers the same z-index - what happens?
