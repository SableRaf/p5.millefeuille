## LayerUI Thumbnail Performance Plan (2025-11-23)

1. **Visibility & change gating**
   - Detect when the Layer UI panel is hidden/collapsed or when `document.visibilityState !== 'visible'` and short-circuit `_scheduleThumbnailFlush()`.
   - Track a per-layer dirty flag that flips only when content changes (e.g., `Layer.hasBeenDrawnTo` timestamp) so we skip captures if nothing changed since the last thumbnail.

2. **Downsampled capture path**
   - Add a shared low-resolution framebuffer/canvas (configurable size) that blits each layer before calling `get()` — avoids high-cost `readPixels` on full-size framebuffers.
   - Ensure resizing that buffer follows pixelDensity changes to keep thumbnails sharp enough.

3. **Configurable capture cadence**
   - Introduce LayerSystem/UI options like `thumbnailCaptureIntervalMs` and `captureOnSelectOnly` to let users choose between live streaming thumbnails and manual updates.
   - Debounce `_markThumbnailsDirty` so repeated `scheduleThumbnailUpdate()` calls in a single frame collapse to one capture request.

4. **API & docs**
   - Expose new options via `createLayerSystem({ ui: { ... } })` or LayerUI constructor props.
   - Document defaults and performance implications in README + examples.
