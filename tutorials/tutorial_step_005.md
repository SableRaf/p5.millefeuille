# Tutorial Step 5: Blend Modes

## Concept: Controlling How Layers Combine

**Blend modes** determine how a layer's colors mix with the layers beneath it. This is a powerful feature found in all professional graphics software.

## What Are Blend Modes?

When you stack layers, blend modes control the mathematical operation used to combine pixels:

- **NORMAL**: Simple alpha blending (default)
- **MULTIPLY**: Darkens by multiplying colors
- **SCREEN**: Lightens (approximated with LIGHTEST in WebGL)
- **ADD**: Adds color values together (brightens)
- **SUBTRACT**: Subtracts color values (darkens)

## Code Walkthrough

### 1. Defining Blend Mode Constants

```javascript
const BlendModes = {
  NORMAL: 'NORMAL',
  MULTIPLY: 'MULTIPLY',
  SCREEN: 'SCREEN',
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT'
};
```

**Why use constants?** Prevents typos and makes code more maintainable.

### 2. Mapping to p5.js Blend Modes

```javascript
function getP5BlendMode(mode) {
  switch (mode) {
    case BlendModes.MULTIPLY: return MULTIPLY;
    case BlendModes.SCREEN: return LIGHTEST;  // WebGL approximation
    case BlendModes.ADD: return ADD;
    case BlendModes.SUBTRACT: return SUBTRACT;
    case BlendModes.NORMAL:
    default: return BLEND;
  }
}
```

**Note**: WebGL mode has different blend modes than 2D mode. SCREEN is approximated with LIGHTEST.

### 3. Adding Blend Mode to Layer

```javascript
class Layer {
  constructor(name, width, height) {
    // ... existing properties
    this.blendMode = BlendModes.NORMAL;
  }
  
  setBlendMode(mode) {
    this.blendMode = mode;
  }
  
  show() {
    // ... visibility/opacity checks
    
    push();
    blendMode(getP5BlendMode(this.blendMode));  // Apply blend mode
    tint(255, this.opacity * 255);
    image(this.framebuffer, 0, 0);
    blendMode(BLEND);  // Reset to default
    pop();
  }
}
```

**Important**: Always reset the blend mode after rendering!

## How Different Blend Modes Work

### NORMAL (BLEND)
Standard transparency blending. New pixels replace old pixels based on alpha.

### MULTIPLY
Multiplies color values (0-1 range):
- `result = bottom * top`
- Always darkens (except with white)
- Great for shadows, darkening

### ADD
Adds color values:
- `result = bottom + top`
- Always lightens
- Great for glows, light effects

### SUBTRACT
Subtracts top from bottom:
- `result = bottom - top`
- Darkens and can create interesting color shifts
- Great for inverse effects

### SCREEN (LIGHTEST)
Inverse of multiply:
- Always lightens (except with black)
- Great for light beams, highlights

## Visual Example

The demo shows three colored circles:
- **Red circle**: Left side
- **Green circle**: Center top
- **Blue circle**: Right side

Where they overlap, the blend mode determines the result color. Try different modes to see:
- **ADD**: Bright white where all three overlap
- **MULTIPLY**: Dark colors where circles overlap
- **NORMAL**: Just shows the top layer

## Practical Uses

### ADD
- Light effects (lens flares, glows)
- Particle systems
- Neon/glow aesthetics

### MULTIPLY
- Shadows
- Color grading
- Darkening effects

### SCREEN
- Highlights
- Light leaks
- Soft glows

## What's Next?

In Step 6, we'll create a **LayerSystem class** to manage multiple layers more easily, including automatic z-index sorting!

## Try It!

- Create a spotlight effect using ADD mode
- Make a shadow layer using MULTIPLY mode
- Combine multiple blend modes in one sketch
- Animate blend mode transitions
- Try different color combinations to see how they blend
