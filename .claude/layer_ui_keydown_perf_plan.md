# LayerUI Keyboard Reorder Performance Plan

## Problem
Chrome reports a `'keydown' handler took 197ms` violation whenever we move layers with the arrow keys in the LayerUI. The performance trace shows the document-level `keydown` listener kicking off a full UI rebuild: `_moveSelectedLayer` calls `this.update()`, which tears down and recreates every layer row, then `_updateThumbnails()` iterates all layers and calls `framebuffer.get()`/`loadPixels`. Those synchronous GPU→CPU reads dominate the yellow bars in the screenshot. The issue is amplified because `LayerSystem.reorderLayers()` also invokes `ui.update()`, so each keystroke triggers the heavy rebuild twice. Finally, the handler fires continuously while the key is held because we do not guard against `KeyboardEvent.repeat` or check whether a layer is even selected, compounding the cost.

## Goal
Drive the `'keydown' handler took ~200ms` violation down to <16ms by eliminating unnecessary DOM rebuilds and synchronous framebuffer reads that fire on every arrow-key reorder inside the LayerUI panel.

## Context Recap
- Current flow: `keydown` → `_moveSelectedLayer` → `this.update()` → `_updateThumbnails()` which loops over every layer and calls `framebuffer.get()`/`loadPixels`. Those calls show up as the long yellow bars in the provided Chrome trace.
- `LayerSystem.reorderLayers()` also calls `ui.update()`, so each reorder rebuilds the UI twice.
- Holding arrow keys floods the handler because we do not guard against `KeyboardEvent.repeat` or missing selections.

## Implementation Steps

1. **Add lightweight profiling helpers (temp) so we can verify improvements.**
   - Wrap `_moveSelectedLayer` body with `performance.mark`+`measure` or `console.time` while developing. Remove or behind `if (process.env.NODE_ENV !== 'production')` gate before committing.

2. **Short-circuit the global `keydown` listener.**
   - Bail out immediately when `this.selectedLayerId === null`.
   - Ignore repeated keydown events by checking `e.repeat`.
   - Return early unless `e.key` is ArrowUp/ArrowDown and the LayerUI panel is visible.

3. **Stop rebuilding the entire panel in `_moveSelectedLayer`.**
   - Replace `this.update()` with a dom-level reorder:
     - Keep `layerElements` as the source of truth.
     - When moving, swap the `Map` entries for the two affected layers.
     - Use `parentNode.insertBefore` (or `after`) to move only the two DOM nodes inside `this.layersContainer`.
   - After the swap, call `this.layerSystem.reorderLayers()` with the updated array so z-indices stay consistent.
   - Remove the UI rebuild inside `LayerSystem.reorderLayers()` to avoid recursion. The UI already updated itself above.

4. **Throttle thumbnail work.**
   - Replace `_updateThumbnails()` inside `update()` with a lazy scheduler:
     - Maintain a `Set` of `dirtyThumbnailLayerIds`.
     - When `update()` runs, enqueue all ids but defer actual drawing to `requestAnimationFrame` or `requestIdleCallback`.
     - `_moveSelectedLayer` should only add the swapped layers to the dirty set.
   - Implement `_flushDirtyThumbnails()` that processes a small batch per frame (e.g., 2 layers) and stops when set empties.

5. **Cache framebuffer snapshots.**
   - Introduce `layer._thumbnailImage` (or a WeakMap in LayerUI) that holds the last `p5.Image` captured via `layer.framebuffer.get()`.
   - `_updateLayerThumbnail` should reuse this cached image until a layer actually draws new content (hook into `LayerSystem.end()` after `layer.end()` to flag the layer dirty).
   - When generating the thumbnail, draw the cached canvas into the 60×60 preview without calling `getImageData` again.

6. **Housekeeping and UX polish.**
   - Ensure selection highlight persists after reordering by reusing `_selectLayer(this.selectedLayerId)`.
   - Update arrow button click handlers to reuse the new lightweight move logic.
   - Consider showing a very quick opacity transition or placeholder while thumbnail refresh occurs so the UI never "blinks" when swapping layers.

## Validation Checklist
- Profiling in Chrome Performance on `examples/02-blend-modes` while holding ArrowUp/ArrowDown shows handler slices well under 16ms, with no `[Violation]` logs.
- Layer order, visibility toggles, blend dropdowns, and drag-to-reorder (if enabled) still operate as before.
- Thumbnails update after drawing to a layer (triggered by `LayerSystem.end()`) and after manual refresh button (if any) without blocking input.
- Global keyboard navigation ignores inputs while typing in form fields and when no layer is selected.

## Suggested Work Breakdown
1. Refactor `_moveSelectedLayer` + `LayerSystem.reorderLayers` (DOM swap + no auto-update).
2. Introduce thumbnail dirty queue + scheduler.
3. Add framebuffer snapshot cache + hook from `LayerSystem.end()`.
4. Polish keyboard handler guard + validation.
5. Run manual regression pass on all examples and capture before/after traces for documentation.

Document findings and paste final numbers/screenshots into the project knowledge base (TODO.md or a follow-up note in `.claude`).