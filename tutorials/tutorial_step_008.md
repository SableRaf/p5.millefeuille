# Tutorial Step 8: Masking

## Concept: Selective Layer Revealing

**Masking** allows you to selectively show or hide parts of a layer using a grayscale image or framebuffer. White areas in the mask reveal the layer, black areas hide it, and gray creates semi-transparency.

## How Masking Works

### Mask as Alpha Channel
```
Mask Value → Layer Visibility
255 (white) → Fully visible
128 (gray)  → Semi-transparent  
0 (black)   → Fully hidden
```

### Visual Example
```
Layer:    [Colorful Image]
Mask:     [Circle of white, rest black]
Result:   [Only circular portion visible]
```

## Code Walkthrough

### 1. Custom Shader for Masking

We need a GLSL shader because p5.js doesn't have built-in mask support for framebuffers.

**Vertex Shader:**
```glsl
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
```

**Fragment Shader:**
```glsl
uniform sampler2D layerTexture;  // The layer content
uniform sampler2D maskTexture;   // The mask
uniform bool hasMask;            // Is mask active?
uniform float layerOpacity;      // Layer opacity

void main() {
  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
  vec4 layerColor = texture2D(layerTexture, uv);
  
  float finalOpacity = layerOpacity;
  
  if (hasMask) {
    vec4 maskColor = texture2D(maskTexture, uv);
    float maskValue = maskColor.r;  // Red channel as mask
    finalOpacity *= maskValue;       // Multiply opacity by mask
  }
  
  // Apply final opacity
  layerColor.rgb *= finalOpacity;
  layerColor.a *= finalOpacity;
  
  gl_FragColor = layerColor;
}
```

**Key shader concepts:**
- Sample both layer texture and mask texture
- Use mask's red channel value (0-1) as multiplier
- Combine with layer opacity for final transparency

### 2. Adding Mask Support to Layer

```javascript
class Layer {
  constructor(id, name, width, height) {
    // ... existing properties
    this.mask = null;  // Store mask framebuffer or image
  }
  
  setMask(maskSource) {
    this.mask = maskSource;
  }
  
  clearMask() {
    this.mask = null;
  }
  
  show(maskShader) {
    if (!this.visible || this.opacity <= 0) return;
    
    push();
    blendMode(getP5BlendMode(this.blendMode));
    
    if (this.mask && maskShader) {
      // Use shader for masked rendering
      shader(maskShader);
      maskShader.setUniform('layerTexture', this.framebuffer);
      maskShader.setUniform('maskTexture', this.mask);
      maskShader.setUniform('hasMask', true);
      maskShader.setUniform('layerOpacity', this.opacity);
      
      rect(0, 0, width, height);  // Draw full-screen quad
      resetShader();
    } else {
      // Standard rendering without mask
      tint(255, this.opacity * 255);
      image(this.framebuffer, 0, 0);
      noTint();
    }
    
    blendMode(BLEND);
    pop();
  }
}
```

### 3. LayerSystem Shader Management

```javascript
class LayerSystem {
  constructor() {
    // ... existing properties
    this.maskShader = null;
  }
  
  initShader() {
    if (!this.maskShader) {
      this.maskShader = createShader(
        compositorVertShader, 
        compositorFragShader
      );
    }
  }
  
  render() {
    this.initShader();  // Lazy shader creation
    const sortedLayers = this.getSortedLayers();
    for (const layer of sortedLayers) {
      layer.show(this.maskShader);  // Pass shader to each layer
    }
  }
  
  setMask(layerId, maskSource) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setMask(maskSource);
  }
  
  clearMask(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) layer.clearMask();
  }
}
```

## Creating a Mask

### Static Mask (Image)
```javascript
let maskImage;

function preload() {
  maskImage = loadImage('mask.png');  // Grayscale image
}

function setup() {
  layerSystem.setMask(layerId, maskImage);
}
```

### Dynamic Mask (Framebuffer)
```javascript
let maskBuffer;

function setup() {
  maskBuffer = createFramebuffer({ width, height });
}

function draw() {
  // Draw to mask buffer
  maskBuffer.begin();
  clear();
  fill(255);  // White = visible
  circle(mouseX - width/2, mouseY - height/2, 150);
  maskBuffer.end();
  
  // Apply mask
  layerSystem.setMask(layerId, maskBuffer);
}
```

## Mask Patterns

### Circular Reveal
```javascript
maskBuffer.begin();
clear();
fill(255);
circle(x, y, radius);
maskBuffer.end();
```

### Gradient Fade
```javascript
maskBuffer.begin();
for (let x = 0; x < width; x++) {
  let brightness = map(x, 0, width, 0, 255);
  stroke(brightness);
  line(x, 0, x, height);
}
maskBuffer.end();
```

### Noise-based Mask
```javascript
maskBuffer.begin();
loadPixels();
for (let x = 0; x < width; x++) {
  for (let y = 0; y < height; y++) {
    let n = noise(x * 0.01, y * 0.01);
    let brightness = n * 255;
    // Set pixel to grayscale value
  }
}
updatePixels();
maskBuffer.end();
```

## Interactive Demo Features

The example demonstrates:

### Mouse-controlled Reveal
```javascript
// Mask follows mouse
translate(mouseX - width/2, mouseY - height/2);
circle(0, 0, 150);
```

### Multiple Mask Regions
```javascript
// Main reveal (white = fully visible)
fill(255);
circle(mouseX - width/2, mouseY - height/2, 150);

// Secondary reveal (gray = semi-visible)
fill(128);
circle(-200, 0, 100);
```

## Practical Applications

### Spotlight Effect
Create a dark overlay with a circular bright spot that reveals content underneath.

### Transition Effects
Animate mask position/size for wipe, fade, or reveal transitions.

### Irregular Shapes
Use custom-drawn masks for non-rectangular layer boundaries.

### Text Masking
Draw text to mask buffer to reveal layer content through letterforms.

### Brush Tool
Let users "paint" to reveal hidden content (scratch-off effect).

## Performance Considerations

### Mask Resolution
- Masks can be lower resolution than layers for better performance
- Upscaling is handled by GPU texture sampling

### Shader Overhead
- Shader switching has overhead, but negligible for typical layer counts
- Batching masked layers together would optimize further

### Mask Reuse
- Same mask can be applied to multiple layers
- No need to recreate mask if it doesn't change

## What's Next?

In Step 9, we'll put everything together into a complete, production-ready layer system with all features integrated!

## Try It!

- Create an animated mask (rotating, scaling, moving)
- Use noise() to create organic mask shapes
- Implement a "brush size" control with mouse wheel
- Create a mask from text using p5's text() function
- Combine multiple masks using blend modes on the mask buffer
- Try using the alpha channel of the mask instead of red channel
