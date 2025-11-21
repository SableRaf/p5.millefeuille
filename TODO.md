-[x] Include blend modes from https://github.com/jamieowen/glsl-blend/
- Check that all blend modes work correctly with proper alpha handling
- [x] Fix deployment to GitHub Pages to include the full example list
- [x] Update the layer thumbnail after the first draw
- [x] Fix  bug in LayerUI when dragging the panel or clicking the collapse button (moves the panel back to top-left corner)
- [x] Prevent moving the LayerUI panel offscreen

## Ready for work

## Needs planning/research/discussion
- [ ] Add `displayName` property to layers separate from ID & name
- [ ] Add visual unit tests for all blend modes
- [ ] Use the shaders from glsl-blend directly instead of importing via npm (to allow adding more modes and fixing issues since it is not actively maintained)
- [ ] Add REPLACE and REMOVE blend modes
- [ ] Investigate issue `#12 Subtract mode error` from the glsl-blend repo
- [ ] Investigate issue `#6 Blend Normal with Alpha` from the glsl-blend repo
- [ ] Add adjustment layers (hue, saturation, brightness, contrast, etc.)