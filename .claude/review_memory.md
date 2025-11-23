## 2025-11-23T19:23:30Z @ 29d28cc8488c7614b771823460735a322f60759e

- **Layer resize flag gap (src/LayerSystem.js lines 339-349)**: auto-resize always resizes layers because `Layer` never defines `customSize`. Layers with custom dimensions can’t preserve their overrides, violating the PRD’s resolution override requirement.
- **Blend-mode docs mismatch (README.md lines 17-24 vs 257-273)**: feature list advertises 14 modes but API reference still documents only 5, leaving users unsure which values are supported.
- **Pixel density drift (src/LayerSystem.js lines 339-349)**: resize logic ignores changes to `pixelDensity()`, so framebuffers/compositor buffers stay at the old density, causing blurry composites contrary to PRD §7.

**Open questions**
- Should masks enforce or warn about size mismatches? (`src/Layer.js` lines 136-155)
  - They should have the same size as their layer to avoid unexpected cropping or scaling issues. This is also the behavior in many graphics applications, and the default behavior in p5.js when applying masks, ensuring that masks align correctly with their layers.
- Can we rely on a single sorting pass instead of both `LayerSystem.getLayers()` and `Compositor.render()` re-sorting every frame?
  - Yes, if callers pass a pre-sorted array. Keep `LayerSystem.getLayers()` as the sole sorter, drop the defensive sort inside `Compositor.render()`, and document/assert that inputs must already be ordered. This removes an extra O(n log n) per frame while keeping behavior predictable; optional guard code can re-sort when unsorted data is detected.
