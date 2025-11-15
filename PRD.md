**Title**
Layer System using p5.Framebuffer

---

### 1. Problem / Motivation

Right now, building complex layered compositions in p5.js (WebGL) requires manually juggling multiple framebuffers or graphics buffers. Users who are familiar with Photoshop-style layers expect features like ordering, visibility toggles, blend modes, and opacity masks, but implementing these from scratch is repetitive and error-prone.

We want a small layer system abstraction on top of `p5.Framebuffer` that makes it easy to:

* Draw into multiple layers
* Reorder and toggle them
* Set blend modes and opacity
* Apply per-layer opacity masks

and then composite everything into the main canvas.

---

### 2. Goals

* Provide an easy-to-use, Photoshop-like layer system for p5.js WebGL sketches backed by `p5.Framebuffer`.
* Support at least:

  * Layer order (z-index)
  * Layer visibility (on/off)
  * Layer opacity (0–1)
  * Blend mode (subset of Photoshop-like modes)
  * Opacity mask (per-layer)
* Keep the API minimal and learnable within a few minutes by a typical p5.js user.
* Minimize performance overhead by:

  * Using a single WebGL context
  * Reusing framebuffers where possible
  * Avoiding unnecessary copies

---

### 3. Non-Goals

* Full feature parity with Photoshop (no adjustment layers, smart objects, etc.).
* 2D renderer support with createGraphics (this is WebGL-only).
* A full GUI layer editor. Initial scope is programmatic control; a GUI can be built on top.

---

### 4. Target Users / Use Cases

**Primary users**

* Creative coders using p5.js WebGL who want compositing without hand-rolling framebuffer logic.

**Example use cases**

1. **UI / HUD overlays**
   Draw a scene in the background layer, then draw UI text and widgets on separate layers with different blend modes.

2. **Post-processing effects**
   Render the base scene to one layer, add glow, noise, or color grading on additional layers using blend modes like ADD or MULTIPLY.

3. **Masked drawing**
   Use a grayscale mask layer to reveal parts of another layer (e.g. “scratch off” effect, spotlight, soft vignette).

---

### 5. High-level Behavior

* The system manages a stack of layers. Each layer internally owns a `p5.Framebuffer` for color (and depth if needed).
* Drawing into a layer:

  * User calls something like `layers.begin(layerId)` / `layers.end()`
  * Between those calls, all drawing operations go to that layer’s framebuffer.
* Compositing:

  * On each frame, the layer system composites all visible layers, in order, into the main canvas framebuffer.
  * Compositing respects:

    * Layer visibility
    * Opacity (alpha)
    * Blend mode
    * Opacity mask (if present)
* Masks:

  * A mask is represented as another framebuffer/image, sampled as a single-channel (or alpha) texture.
  * Mask is applied as a multiplier on the layer’s opacity per pixel.

---

### 6. Functional Requirements

#### 6.1 Layer Management

* Create a layer:

  * `createLayer(name?, options?)`
  * Options: initial visibility (default true), initial blend mode, initial opacity, resolution override (optional).
* Remove a layer:

  * `removeLayer(id)`
* Reorder layers:

  * `setLayerIndex(id, index)` or `moveLayer(id, delta)`
* Query layers:

  * List layers with their properties (id, name, order, visible, opacity, blendMode, hasMask).

#### 6.2 Drawing API

* `beginLayer(id)`:

  * Binds the layer’s framebuffer, sets appropriate viewport.
* `endLayer()`:

  * Restores previous framebuffer (main canvas).
* Only one layer can be active at a time. If `beginLayer` is called while another is active, log a warning and close the previous one.

#### 6.3 Layer Properties

* Visibility:

  * `setVisible(id, boolean)`
* Opacity:

  * `setOpacity(id, value)` where `value` is in `[0, 1]`
* Blend mode:

  * `setBlendMode(id, mode)`
  * MVP supported modes:

    * `NORMAL`
    * `MULTIPLY`
    * `SCREEN`
    * `ADD`
    * `SUBTRACT`
  * Future: OVERLAY, SOFT_LIGHT, etc., if shader complexity remains manageable.

#### 6.4 Masks

* Attach/remove a mask:

  * `setMask(id, maskSource)` where `maskSource` can be:

    * another framebuffer
    * a `p5.Image`
  * `clearMask(id)`
* The mask is sampled in the compositor shader and multiplies the layer’s opacity per pixel.

#### 6.5 Compositing Pipeline

* `renderLayers()`:

  * Clears the main canvas (or respects a user-provided clear callback).
  * Iterates layers in ascending z-order:
    * Skips invisible layers.
    * For each visible layer:
        * Applies the selected blend mode using `blendMode()`.
        * Applies per-layer opacity using `tint()`.
        * Applies mask if present using a custom shader logic.
        * Draws the layer’s framebuffer to the main canvas using `image()`.
        * Restore state: `blendMode(BLEND)`, `noTint()`
* The compositor must work correctly with:
  * Different canvas sizes and pixel densities.
  * Resized canvas or framebuffers (auto-resize mode and manual mode).

---

### 7. Technical Constraints / Implementation Notes

* WebGL-only, built on `p5.Framebuffer` as per `createFramebuffer()` docs. ([p5.js][1])
* Default framebuffer options:

  * Match main canvas width/height and density.
  * `channels: RGBA`, `format: UNSIGNED_BYTE`, `depth: false` unless explicitly requested.
* Must not break existing WebGL state:

  * After compositing, restore:

    * Active shader (or none)
    * Blend mode
    * Depth test state
* GPU performance:

  * Composite with a single pass per layer using a shared compositor shader.
  * Avoid readbacks to CPU (no `loadPixels()` in core flow).
* Error handling:

  * Fail loudly in console if:

    * Called outside WebGL mode.
    * Framebuffers cannot be created.
    * Layer id not found.

---

### 8. API Sketch (non-binding)

```js
// setup
function setup() {
  createCanvas(800, 600, WEBGL);
  layers = createLayerSystem(); // factory
  bgLayer = layers.createLayer('background');
  fxLayer = layers.createLayer('effects', { blendMode: 'ADD', opacity: 0.7 });
}

// draw
function draw() {
  // draw background
  layers.beginLayer(bgLayer);
  clear();
  // draw scene...
  layers.endLayer();

  // draw fx
  layers.beginLayer(fxLayer);
  clear();
  // draw particles, glows...
  layers.endLayer();

  // composite everything
  layers.render();
}
```

---

### 9. Acceptance Criteria

* Developer can:

  * Create at least 3 layers, draw different content into each, and see them composited in order.
  * Toggle a layer’s visibility and see it appear/disappear without affecting others.
  * Change a layer’s blend mode from NORMAL to MULTIPLY/ADD and observe the correct blending result.
  * Attach a grayscale mask to a layer and see only masked regions rendered.
  * Reorder layers and see the composited result update accordingly.
* Performance remains interactive (60 fps on a mid-range laptop) for a small number of full-screen layers (e.g. 3–5) with simple content.
* Includes code examples and documentation for all public API methods.
* Includes unit tests for core functionality (layer creation, property setting, compositing logic).

[1]: https://p5js.org/reference/p5/createFramebuffer/ "createFramebuffer"


### References

* p5.js WebGL documentation: https://p5js.org/reference/#/p5/createFramebuffer
* Layered Rendering with Framebuffers: https://p5js.org/tutorials/layered-rendering-with-framebuffers/
* https://p5js.org/reference/p5/clip/
* p5.layers (existing layer system for 2D): https://osteele.github.io/p5.libs/p5.layers/ | https://github.com/osteele/p5.libs/tree/main/p5.layers