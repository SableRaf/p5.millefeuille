-[x] Include blend modes from https://github.com/jamieowen/glsl-blend/
- Check that all blend modes work correctly with proper alpha handling
- [x] Fix deployment to GitHub Pages to include the full example list
- [x] Update the layer thumbnail after the first draw
- [x] Fix  bug in LayerUI when dragging the panel or clicking the collapse button (moves the panel back to top-left corner)
- [x] Prevent moving the LayerUI panel offscreen
- [x] Fix re-ordering of layers flipping y axis (see basic example)
- [x] Fix re-ordering of layers causing other layers to disappear (see blend modes example)
- [x] Turn into a p5.js library (see LIBRARY_PLAN.md for details)
- [x] Investigate [Violation] `'keydown' handler took 197ms` when moving layers in LayerUI with the keyboard (DOM-swap + thumbnail queue landed 2025-11-22)
- [x] Add tests for LayerSystem and LayerUI components using Jest and JSDOM
- [x] Crop layer thumbnails to non-transparent bounds with padding. If animated, use the largest frame's bounds with a sliding window to find the max extents across frames and avoid jumpy thumbnails.

## Ready for work
- [ ] Bundle should create a zipped version of the library files for easier download
- [ ] Change instance mode example to have multiple sketches on the same page all using p5.millefeuille
- [ ] Add JSDoc comments to all public methods and properties
- [ ] Add more examples demonstrating different use cases (e.g., masking, complex compositions, animations)
- [ ] Migrate to TypeScript for better type safety and developer experience
- [ ] Add TypeScript declaration file for better IDE support and type checking
- [ ] Add an example with resizeable canvas and layers that adapt to the new size.
- [ ] Add optional mask thumbnails to the LayerUI for layers that have masks applied

## Needs planning/research/discussion
- [ ] CI/CD pipeline for releasing new versions on GitHub (see Processing's release process)
- [ ] Fix `p5.millefeuille.js?v=0.1.0:1184 Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true. See: https://html.spec.whatwg.org/multipage/canvas.html#concept-canvas-will-read-frequently`
- [ ] Publish p5.millefeuille to npm
- [ ] Make documentation website with examples and API reference (use JSDoc or similar)
- [ ] Add `displayName` property to layers separate from ID/name (the ID is fixed and unique and used internally, the name can be changed at runtime and is not necessarily unique, the displayName is what is shown in the UI and can have duplicates)
  - [ ] Ability to rename layers in the LayerUI
- [ ] Add visual unit tests for all blend modes
- [ ] Use the shaders from glsl-blend directly instead of importing via npm (to allow adding more modes and fixing issues since it is not actively maintained)
- [ ] Add REPLACE and REMOVE blend modes
- [ ] Investigate issue `#12 Subtract mode error` from the glsl-blend repo
- [ ] Investigate issue `#6 Blend Normal with Alpha` from the glsl-blend repo
- [ ] Add adjustment layers (hue, saturation, brightness, contrast, etc.)
- [ ] Add ability to reorder layers via drag-and-drop in the LayerUI
- [ ] Add export to image for the full canvas or individual layers, with options for file type, quality, and size multipliers (e.g., 2x, 4x) similar to Figma's export options
- [ ] Add `focused` property to layers to allow specific actions to be applied only to the focused layer (e.g., drawing, transformations). Separate from `active` property used for visibility and blending.
- [ ] Submit to the p5.js community libraries