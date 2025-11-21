# Layer Re-ordering Bug Report

**Date**: 2025-11-21  
**Status**: Root cause identified, fix ready for implementation  
**Priority**: High  
**Affected**: Basic example, Blend modes example

---

## Problem Statement

Two critical bugs occur when re-ordering layers via the LayerUI:

1. **Y-axis flipping** (Issue #1): Content appears vertically flipped after reordering layers in the basic example
2. **Layers disappearing** (Issue #2): Layers vanish or render incorrectly after reordering in the blend modes example

Both issues occur when using the arrow buttons or keyboard shortcuts to change layer order in the LayerUI panel.

---

## Root Cause Analysis

### Core Issue: Texture Coordinate System Mismatch

The bugs stem from **inconsistent Y-coordinate handling** between different rendering contexts in WebGL:

#### Background: p5.js WebGL Coordinate Systems

In p5.js WebGL mode:
- **Main canvas rendering**: Standard WebGL coordinates (Y-up)
- **Framebuffer-to-framebuffer rendering**: Inverted Y-coordinates (Y-down)
- **Texture sampling**: Coordinates depend on render target

#### The Problematic Code Path

**Location**: `src/shaders/compositor.frag`, line 46
```glsl
vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
```

This Y-flip was added to handle p5.js coordinate conventions when rendering to the **main canvas**. However, it creates issues in the **ping-pong buffer compositing pipeline**.

#### Why It Works Initially

On first render:
```
Layer Framebuffer → Ping-pong Buffer A (shader flips) → Ping-pong Buffer B (shader flips) → Main Canvas (shader flips)
```

The multiple flips happen to cancel out for the initial layer order.

#### Why Re-ordering Breaks It

When layers are re-ordered:
1. **Layer framebuffers retain their original content** (already in a specific Y-orientation)
2. **Compositor re-runs** with new zIndex order
3. **Shader applies Y-flip again** to content that was already processed
4. **Result**: Double-flip effect (Y-axis inversion) or misaligned content (disappearing layers)

### Specific Flow Analysis

**`Compositor.render()` flow** (`src/Compositor.js:125-185`):

```javascript
// Clear first buffer
currentBuffer.begin();
p.clear();
currentBuffer.end();

// For each layer (sorted by zIndex):
for (let i = 0; i < sortedLayers.length; i++) {
  // Render layer on top of currentBuffer into nextBuffer
  nextBuffer.begin();
  p.clear();
  this._renderLayer(layer, currentBuffer);  // ← Uses shader with Y-flip
  nextBuffer.end();
  
  // Swap buffers
  [currentBuffer, nextBuffer] = [nextBuffer, currentBuffer];
}

// Final render to main canvas
p.image(currentBuffer, 0, 0);  // ← Another potential flip point
```

**`Compositor._renderLayer()` flow** (`src/Compositor.js:76-122`):

```javascript
// Set shader uniforms
shader.setUniform('layerTexture', layer.framebuffer);
shader.setUniform('backgroundTexture', backgroundBuffer);
// ...

// Draw full-screen quad with shader
p.rect(0, 0, p.width, p.height);  // ← Applies shader with Y-flip
```

The shader is applied during **every** ping-pong pass, not just the final render to main canvas. This causes:
- **Accumulating coordinate transformations** in the ping-pong buffers
- **Inconsistent orientation** between what's in layer framebuffers vs what's expected

---

## Reproduction Steps

### Setup
1. Open `examples/01-basic/index.html` or `examples/02-blend-modes/index.html`
2. Observe initial correct rendering
3. Open LayerUI panel (appears on page load)

### Trigger Bug #1 (Y-axis flip)
1. In basic example, click the up/down arrows in LayerUI to reorder any layer
2. **Expected**: Layer maintains correct orientation
3. **Actual**: Layer content appears vertically flipped

### Trigger Bug #2 (Disappearing layers)
1. In blend modes example, reorder the colored ellipse layers
2. **Expected**: Layers remain visible with correct blending
3. **Actual**: Some layers disappear or render incorrectly

---

## Proposed Solutions

### Option 1: Remove Y-flip from Shader (RECOMMENDED)

**Approach**: Remove the coordinate flip from the shader entirely.

**Changes Required**:
- **File**: `src/shaders/compositor.frag`
- **Line**: 46
- **Current**: `vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);`
- **New**: `vec2 uv = vTexCoord;`

**Rationale**:
- p5.js may handle framebuffer coordinate systems correctly without manual flipping
- Simplest fix with minimal code changes
- Maintains shader-based compositing performance

**Risk**: Medium
- May cause textures to appear upside-down on initial render
- Would require Option 2 if this occurs

**Testing**:
1. Make the change
2. Rebuild: `npm run build`
3. Test both examples for correct initial render
4. Test layer re-ordering works correctly

---

### Option 2: Conditional Y-flip Based on Render Target (FALLBACK)

**Approach**: Only flip Y-coordinates when rendering to main canvas, not during ping-pong compositing.

**Changes Required**:

**File 1**: `src/shaders/compositor.frag`
```glsl
// Add new uniform (after line 8)
uniform bool renderingToMainCanvas;

// Modify UV calculation (line 46)
vec2 uv = renderingToMainCanvas 
  ? vec2(vTexCoord.x, 1.0 - vTexCoord.y)  // Flip for main canvas
  : vTexCoord;                              // No flip for framebuffers
```

**File 2**: `src/Compositor.js`

In `_renderLayer()` method (around line 107):
```javascript
shader.setUniform('layerTexture', layer.framebuffer);
shader.setUniform('backgroundTexture', backgroundBuffer);
shader.setUniform('maskTexture', layer.mask || layer.framebuffer);
shader.setUniform('hasMask', layer.mask ? true : false);
shader.setUniform('layerOpacity', layer.opacity);
shader.setUniform('blendMode', getBlendModeIndex(layer.blendMode));
shader.setUniform('renderingToMainCanvas', false);  // ← Add this
```

In `render()` method, before final canvas render (around line 179):
```javascript
// For final render to main canvas, we might need to handle this differently
// Consider using a separate code path or setting the uniform to true
```

**Rationale**:
- Explicit control over when Y-flipping occurs
- Separates framebuffer-to-framebuffer rendering from framebuffer-to-canvas rendering
- Robust solution that handles both contexts correctly

**Risk**: Low
- More code changes, but clear logic
- Easy to understand and maintain

---

### Option 3: Use p5.image() Instead of Shader Rect (ALTERNATIVE)

**Approach**: Replace the rect-based shader application with p5's built-in image rendering.

**Changes Required**:
- **File**: `src/Compositor.js`
- **Method**: `_renderLayer()` (lines 111-115)

**Current**:
```javascript
p.imageMode(p.CENTER);
p.rectMode(p.CENTER);
p.noStroke();
p.fill(255);
p.rect(0, 0, p.width, p.height);
```

**New** (conceptual - needs refinement):
```javascript
p.push();
p.shader(shader);
p.imageMode(p.CENTER);
// Use texture() or image() with proper scaling
p.texture(layer.framebuffer);
p.plane(p.width, p.height);
p.pop();
```

**Rationale**:
- Leverages p5.js's built-in framebuffer display logic
- p5 may handle coordinate systems correctly internally

**Risk**: Medium
- May not provide enough control over blending and masking
- Requires more investigation into p5's texture rendering

---

## Implementation Recommendation

### Step 1: Try Option 1 (Simplest)
1. Remove Y-flip from `compositor.frag`
2. Rebuild and test thoroughly
3. If initial renders are incorrect (upside-down), proceed to Step 2

### Step 2: Implement Option 2 (Robust)
1. Add `renderingToMainCanvas` uniform to shader
2. Update compositor to set uniform appropriately
3. Rebuild and test thoroughly

### Step 3: Validation
Test the following scenarios:
- ✅ Initial render in basic example (correct orientation)
- ✅ Initial render in blend modes example (correct orientation)
- ✅ Reorder layers in basic example (no Y-flip)
- ✅ Reorder layers in blend modes example (layers remain visible)
- ✅ All blend modes work correctly
- ✅ Masking still functions
- ✅ Opacity changes work
- ✅ Layer visibility toggle works

---

## Technical Context

### Affected Files
- `src/shaders/compositor.frag` - Fragment shader with Y-flip
- `src/shaders/compositor.vert` - Vertex shader (may need review)
- `src/Compositor.js` - Rendering pipeline and ping-pong buffering
- `src/LayerUI.js` - UI that triggers re-ordering (works correctly)
- `src/LayerSystem.js` - reorderLayers() method (works correctly)

### Not Affected
The layer re-ordering logic itself is **correct**:
- `LayerUI._moveSelectedLayer()` properly swaps layers in array
- `LayerSystem.reorderLayers()` correctly updates zIndex values
- Compositor properly sorts by zIndex before rendering

The bug is purely in the **rendering/compositing phase**, not the data management.

---

## References

### Related Code Sections

**Layer framebuffer creation** (`src/Layer.js:47-70`):
- Framebuffers created with standard p5 options
- No special coordinate handling

**Ping-pong compositing** (`src/Compositor.js:125-185`):
- Each layer rendered progressively
- Buffers swapped after each layer
- Final result drawn to main canvas

**Shader uniforms** (`src/Compositor.js:104-109`):
- layerTexture: Current layer's framebuffer
- backgroundTexture: Accumulated previous layers
- maskTexture: Layer's mask (if any)
- blendMode: Blend mode index for glsl-blend functions

### p5.js WebGL Coordinate Systems
- [p5.js Framebuffer Reference](https://p5js.org/reference/p5/createFramebuffer/)
- [p5.js WebGL Tutorial](https://p5js.org/tutorials/layered-rendering-with-framebuffers/)
- Note: p5.js uses Y-down in 2D mode, but WebGL is Y-up

---

## Additional Notes

### Why This Wasn't Caught Earlier
- Initial rendering works because the Y-flips cancel out
- Bug only manifests when layers are **re-composited** with a different order
- Layer framebuffers retain content from initial draw, causing coordinate mismatch

### Performance Impact of Fix
- Option 1: No performance impact (same shader, simpler logic)
- Option 2: Negligible impact (one extra uniform, one conditional in shader)
- Both maintain single-pass compositing per layer

### Future Considerations
- Add visual regression tests for layer re-ordering
- Document coordinate system assumptions in code comments
- Consider adding a test suite that exercises layer manipulation

---

## Questions for Developer

1. Have you observed any existing issues with texture orientation in other parts of the codebase?
2. Are there p5.js version-specific behaviors we should be aware of regarding framebuffer coordinate systems?
3. Should we add automated tests for this fix, or rely on manual testing with examples?

---

**End of Report**
