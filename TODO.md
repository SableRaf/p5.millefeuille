-[x] Include blend modes from https://github.com/jamieowen/glsl-blend/
- Check that all blend modes work correctly with proper alpha handling
- [x] Fix deployment to GitHub Pages to include the full example list
- [x] Update the layer thumbnail after the first draw
- [x] Fix  bug in LayerUI when dragging the panel or clicking the collapse button (moves the panel back to top-left corner)
- [x] Prevent moving the LayerUI panel offscreen
- [x] Fix re-ordering of layers flipping y axis (see basic example)
- [x] Fix re-ordering of layers causing other layers to disappear (see blend modes example)
- [x] Turn into a p5.js library (see LIBRARY_PLAN.md for details)

## Ready for work
- [ ] Publish p5.millefeuille to npm
- [ ] Investigate [Violation] `'keydown' handler took 197ms` when moving layers in LayerUI with the keyboard

## Needs planning/research/discussion
- [ ] Make documentation website with examples and API reference (use JSDoc or similar)
- [ ] Add `displayName` property to layers separate from ID & name
- [ ] Add visual unit tests for all blend modes
- [ ] Use the shaders from glsl-blend directly instead of importing via npm (to allow adding more modes and fixing issues since it is not actively maintained)
- [ ] Add REPLACE and REMOVE blend modes
- [ ] Investigate issue `#12 Subtract mode error` from the glsl-blend repo
- [ ] Investigate issue `#6 Blend Normal with Alpha` from the glsl-blend repo
- [ ] Add adjustment layers (hue, saturation, brightness, contrast, etc.)
- [ ] Add ability to reorder layers via drag-and-drop in the LayerUI
- [ ] Add export to image for the full canvas or individual layers, with options for file type, quality, and size multipliers (e.g., 2x, 4x) similar to Figma's export options
- [ ] Add `focused` property to layers to allow specific actions to be applied only to the focused layer (e.g., drawing, transformations). Separate from `active` property used for visibility and blending.