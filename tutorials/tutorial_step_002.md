# Tutorial Step 2: Multiple Framebuffers

## Concept: Layer Stacking

When you have multiple framebuffers, you can draw them in a specific order to create **layers** - just like layers in Photoshop or other graphics software. This is the core concept behind a layer system.

## How Layer Compositing Works

1. **Draw to each framebuffer** separately (each is a "layer")
2. **Composite them** by drawing them to the main canvas in order
3. **Order matters**: Layers drawn later appear on top

## Code Walkthrough

### 1. Creating Multiple Framebuffers

```javascript
backgroundLayer = createFramebuffer({ width: width, height: height });
foregroundLayer = createFramebuffer({ width: width, height: height });
```

We create two framebuffers at full canvas size. Each will act as a separate layer.

### 2. Drawing to Each Layer

```javascript
// Background layer
backgroundLayer.begin();
// ... draw grid pattern
backgroundLayer.end();

// Foreground layer
foregroundLayer.begin();
clear(); // Important! Makes background transparent
// ... draw shapes
foregroundLayer.end();
```

**Key insight**: Using `clear()` on the foreground layer makes it transparent, allowing the background layer to show through.

### 3. Compositing the Layers

```javascript
// Draw in order: bottom to top
image(backgroundLayer, 0, 0);  // Draw first (bottom)
image(foregroundLayer, 0, 0);  // Draw second (top)
```

The order of `image()` calls determines which layer appears on top.

## Important Concepts

### Transparency

- **Opaque layers**: Use `background()` to fill with a solid color
- **Transparent layers**: Use `clear()` to make the background transparent
- Transparent layers let lower layers show through

### Layer Order (Z-Index)

The order you draw framebuffers determines their stacking:
```javascript
image(layer1, 0, 0);  // Bottom
image(layer2, 0, 0);  // Middle
image(layer3, 0, 0);  // Top
```

### Independent Rendering

Each layer is drawn independently:
- Different content can be on each layer
- Each layer maintains its own drawing state
- Layers don't affect each other during rendering

## What's Next?

In Step 3, we'll wrap this functionality in a **Layer class** to make it easier to manage and more reusable!

## Try It!

- Add a third layer in between the two existing layers
- Make the foreground shapes semi-transparent by using alpha in `fill()`
- Try drawing different content to each layer
- Experiment with different layer sizes
