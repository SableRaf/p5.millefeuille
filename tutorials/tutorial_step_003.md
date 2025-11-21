# Tutorial Step 3: Layer Abstraction

## Concept: Encapsulation with Classes

Instead of managing framebuffers directly, we create a **Layer class** that wraps the framebuffer functionality. This makes the code cleaner, more reusable, and easier to extend.

## Benefits of Abstraction

- **Cleaner code**: `layer.begin()` instead of `framebuffer.begin()`
- **Reusability**: Create multiple layers easily
- **Extensibility**: Easy to add new features (opacity, visibility, etc.)
- **Naming**: Layers can have meaningful names
- **Encapsulation**: Hide implementation details

## Code Walkthrough

### 1. The Layer Class

```javascript
class Layer {
  constructor(name, width, height) {
    this.name = name;
    this.framebuffer = createFramebuffer({ width, height });
  }
  
  begin() {
    this.framebuffer.begin();
  }
  
  end() {
    this.framebuffer.end();
  }
  
  show() {
    push();
    imageMode(CENTER);
    image(this.framebuffer, 0, 0);
    pop();
  }
  
  dispose() {
    this.framebuffer.remove();
  }
}
```

**Key methods**:
- **constructor**: Creates the framebuffer and stores the name
- **begin/end**: Wrapper methods for framebuffer drawing
- **show**: Displays the layer (encapsulates image rendering)
- **dispose**: Cleans up resources when done

### 2. Using the Layer Class

```javascript
// Create layers
let bgLayer = new Layer('Background', width, height);

// Draw to a layer
bgLayer.begin();
// ... drawing code
bgLayer.end();

// Display a layer
bgLayer.show();
```

Much cleaner than managing framebuffers directly!

### 3. Managing Multiple Layers

```javascript
// Create three layers
bgLayer = new Layer('Background', width, height);
midLayer = new Layer('Middle', width, height);
fgLayer = new Layer('Foreground', width, height);

// Composite in order
bgLayer.show();
midLayer.show();
fgLayer.show();
```

The abstraction makes it easy to manage multiple layers.

## Design Principles

### Single Responsibility

Each layer:
- Manages its own framebuffer
- Knows how to draw itself
- Handles its own cleanup

### Information Hiding

Users of the Layer class don't need to know:
- How framebuffers are created
- How to position images for display
- How to clean up WebGL resources

### Easy Extension

We can easily add new features to the Layer class in future steps:
- Visibility toggle
- Opacity control
- Blend modes
- Z-index management

## What's Next?

In Step 4, we'll extend the Layer class to add **visibility** and **opacity** properties!

## Try It!

- Add a method to get the layer's size
- Add a method to resize the layer
- Create more than three layers
- Add a `toggle()` method to show/hide layers (we'll implement this properly in Step 4)
