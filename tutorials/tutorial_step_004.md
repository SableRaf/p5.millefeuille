# Tutorial Step 4: Layer Properties

## Concept: Controlling Layer Visibility and Opacity

Real layer systems let you control whether layers are visible and how transparent they are. We add these essential properties to make our Layer class more powerful.

## New Features

### Visibility
- **Purpose**: Toggle layers on/off without removing them
- **Use cases**: Temporarily hide layers, toggle debug views, show/hide UI

### Opacity
- **Purpose**: Control how transparent a layer is
- **Range**: 0 (fully transparent) to 1 (fully opaque)
- **Use cases**: Fade effects, blending, ghosting

## Code Walkthrough

### 1. Adding Properties

```javascript
class Layer {
  constructor(name, width, height) {
    // ... existing code
    this.visible = true;  // Default: visible
    this.opacity = 1.0;   // Default: fully opaque
  }
}
```

### 2. Setter Methods

```javascript
setVisible(visible) {
  this.visible = visible;
}

setOpacity(opacity) {
  this.opacity = constrain(opacity, 0, 1);  // Clamp to valid range
}
```

**Why constrain?** Prevents invalid values outside the 0-1 range.

### 3. Updated show() Method

```javascript
show() {
  // Early exit if invisible or fully transparent
  if (!this.visible || this.opacity <= 0) {
    return;
  }
  
  push();
  imageMode(CENTER);
  tint(255, this.opacity * 255);  // Apply opacity
  image(this.framebuffer, 0, 0);
  noTint();  // Reset tint
  pop();
}
```

**Key points**:
- Skip rendering if invisible (performance optimization)
- Use `tint()` to apply opacity to the entire layer
- Always call `noTint()` to reset state

## How Opacity Works with tint()

```javascript
tint(255, this.opacity * 255);
```

The `tint()` function in p5.js:
- First parameter: Color tint (255 = white = no color change)
- Second parameter: Alpha (transparency)
  - 255 = fully opaque
  - 0 = fully transparent
  - We multiply our 0-1 opacity by 255

## Interactive Demo

The example includes:

### Mouse X Position → Opacity
```javascript
let fgOpacity = map(mouseX, 0, width, 0, 1);
fgLayer.setOpacity(fgOpacity);
```
Moving the mouse left-to-right fades the foreground layer.

### Mouse Press → Visibility
```javascript
if (mouseIsPressed) {
  midLayer.setVisible(false);
} else {
  midLayer.setVisible(true);
}
```
Click and hold to hide the middle layer.

## Performance Considerations

```javascript
if (!this.visible || this.opacity <= 0) {
  return;  // Skip rendering entirely
}
```

**Why this matters**:
- Invisible layers don't need to be drawn
- Saves GPU operations
- Important when managing many layers

## What's Next?

In Step 5, we'll add **blend modes** to control how layers composite together (multiply, screen, add, etc.)!

## Try It!

- Add a `fade()` method that animates opacity over time
- Create a `toggle()` method that switches visibility on/off
- Make opacity control multiple layers at once
- Add keyboard controls to show/hide specific layers
- Try combining low opacity with visibility toggling
