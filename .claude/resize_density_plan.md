## Resize + Density Fix Plan (2025-11-23)

1. **Layer metadata updates**
   - Add a `customSize` flag to `Layer` (true when width/height/density overrides are provided).
   - Extend `Layer.resize(width, height, density?)` to store updated dimensions/density before recreating the framebuffer.

2. **LayerSystem auto-resize fixes**
   - Track `_lastPixelDensity` alongside canvas width/height.
   - In `_checkResize()`, trigger when width, height, or density changes.
   - Skip `Layer.resize()` for `customSize` layers; pass new density through for others.

3. **Compositor buffer sync**
   - Teach `_ensureBuffers()` to compare stored density to `p.pixelDensity()`.
   - Recreate ping-pong buffers whenever size or density drifts.

4. **Regression tests**
   - Update `test/utils/p5Stub.js` to allow dynamic `pixelDensity()` values.
   - Add Jest cases proving custom-sized layers stay untouched and density changes recreate framebuffers.

5. **Full-window resize example**
   - Add an example sketch that uses a full-window WebGL canvas plus `windowResized()` to demonstrate seamless layer resizing.
   - Link it from `examples/index.html`.
