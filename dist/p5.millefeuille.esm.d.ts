export namespace BlendModes {
    let NORMAL: string;
    let MULTIPLY: string;
    let SCREEN: string;
    let ADD: string;
    let SUBTRACT: string;
    let OVERLAY: string;
    let SOFT_LIGHT: string;
    let HARD_LIGHT: string;
    let COLOR_DODGE: string;
    let COLOR_BURN: string;
    let DARKEN: string;
    let LIGHTEN: string;
    let DIFFERENCE: string;
    let EXCLUSION: string;
}
/**
 * Handles the compositing of layers to the main canvas
 */
export class Compositor {
    /**
     * @param {p5} p5Instance - The p5.js instance
     */
    constructor(p5Instance: p5);
    p: p5;
    shader: any;
    shaderLoaded: boolean;
    bufferA: any;
    bufferB: any;
    _bufferDensity: any;
    /**
     * Lazily creates the compositor shader
     * @private
     */
    private _ensureShader;
    /**
     * Ensures the ping-pong buffers exist and match canvas size
     * @private
     */
    private _ensureBuffers;
    /**
     * Renders a single layer to the current framebuffer
     * @param {Layer} layer - The layer to render
     * @param {p5.Framebuffer} backgroundBuffer - The background to composite onto
     * @private
     */
    private _renderLayer;
    /**
     * Composites all layers to the main canvas using ping-pong buffering
     * @param {Layer[]} layers - Array of layers to composite (should be pre-sorted by zIndex)
     * @param {Function} clearCallback - Optional callback to clear the canvas before compositing
     */
    render(layers: Layer[], clearCallback?: Function): void;
    /**
     * Disposes of compositor resources
     */
    dispose(): void;
}
export namespace DEFAULT_LAYER_OPTIONS {
    export let visible: boolean;
    export let opacity: number;
    import blendMode = BlendModes.NORMAL;
    export { blendMode };
    export let width: any;
    export let height: any;
    export let density: any;
    export let depth: boolean;
    export let antialias: boolean;
}
/**
 * Represents a single layer backed by a p5.Framebuffer
 */
export class Layer {
    /**
     * @param {p5} p5Instance - The p5.js instance
     * @param {string|number} id - Unique identifier for this layer
     * @param {string} name - Human-readable name for this layer
     * @param {Object} options - Layer configuration options
     */
    constructor(p5Instance: p5, id: string | number, name?: string, options?: any);
    p: p5;
    id: string | number;
    name: string;
    visible: any;
    opacity: number;
    blendMode: any;
    zIndex: any;
    width: any;
    height: any;
    density: any;
    depth: any;
    antialias: any;
    customSize: boolean;
    mask: any;
    hasBeenDrawnTo: boolean;
    framebuffer: any;
    /**
     * Creates the underlying p5.Framebuffer
     * @private
     */
    private _createFramebuffer;
    /**
     * Clamps opacity value to valid range [0, 1]
     * @private
     */
    private _clampOpacity;
    /**
     * Shows this layer (makes it visible)
     * @returns {Layer} This layer for chaining
     */
    show(): Layer;
    /**
     * Hides this layer (makes it invisible)
     * @returns {Layer} This layer for chaining
     */
    hide(): Layer;
    /**
     * Sets the opacity of this layer
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {Layer} This layer for chaining
     */
    setOpacity(opacity: number): Layer;
    /**
     * Sets the blend mode for this layer
     * @param {string} mode - One of the BlendModes constants
     * @returns {Layer} This layer for chaining
     */
    setBlendMode(mode: string): Layer;
    /**
     * Sets the z-index (layer order) for this layer
     * @param {number} zIndex - The z-index value (higher = on top)
     * @returns {Layer} This layer for chaining
     */
    setZIndex(zIndex: number): Layer;
    /**
     * Attaches a mask to this layer
     * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
     * @returns {Layer} This layer for chaining
     */
    setMask(maskSource: p5.Framebuffer | p5.Image): Layer;
    /**
     * Removes the mask from this layer
     * @returns {Layer} This layer for chaining
     */
    clearMask(): Layer;
    /**
     * Resizes the layer's framebuffer
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width: number, height: number, density?: any): void;
    /**
     * Begins drawing to this layer's framebuffer
     */
    begin(): void;
    /**
     * Ends drawing to this layer's framebuffer
     */
    end(): void;
    /**
     * Disposes of this layer's resources
     */
    dispose(): void;
    /**
     * Returns a plain object representation of this layer's properties
     */
    toJSON(): {
        id: string | number;
        name: string;
        visible: any;
        opacity: number;
        blendMode: any;
        zIndex: any;
        hasMask: boolean;
        hasBeenDrawnTo: boolean;
        width: any;
        height: any;
        density: any;
        customSize: boolean;
    };
}
/**
 * Main layer system manager
 */
export class LayerSystem {
    /**
     * @param {p5} p5Instance - The p5.js instance
     */
    constructor(p5Instance: p5);
    p: p5;
    layers: Map<any, any>;
    layerNames: Map<any, any>;
    layerIdCounter: number;
    activeLayerId: string | number;
    compositor: Compositor;
    ui: LayerUI;
    autoResize: boolean;
    _lastCanvasWidth: any;
    _lastCanvasHeight: any;
    _lastPixelDensity: any;
    /**
     * Generates a unique layer ID
     * @private
     */
    private _generateId;
    /**
     * Gets a layer by ID or name
     * @private
     * @param {number|string} layerIdOrName - The layer ID (number) or name (string)
     * @returns {Layer|null} The layer, or null if not found
     */
    private _getLayerById;
    /**
     * Creates a new layer
     * @param {string} name - Optional name for the layer
     * @param {Object} options - Layer configuration options
     * @returns {Layer} The created layer instance
     */
    createLayer(name?: string, options?: any): Layer;
    /**
     * Removes a layer and disposes of its resources
     * @param {number|string} layerIdOrName - The ID or name of the layer to remove
     */
    removeLayer(layerIdOrName: number | string): void;
    /**
     * Gets a layer by ID or name
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer, or null if not found
     */
    getLayer(layerIdOrName: number | string): Layer | null;
    /**
     * Gets all layers as an array, sorted by zIndex
     * @returns {Layer[]} Array of layers
     */
    getLayers(): Layer[];
    /**
     * Gets layer information as plain objects
     * @returns {Object[]} Array of layer info objects
     */
    getLayerInfo(): any[];
    /**
     * Begins drawing to a specific layer
     * @param {number|string} layerIdOrName - The ID or name of the layer to draw to
     */
    begin(layerIdOrName: number | string): void;
    /**
     * Ends drawing to the current layer
     */
    end(): void;
    /**
     * Shows a layer (makes it visible)
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    show(layerIdOrName: number | string): Layer | null;
    /**
     * Hides a layer (makes it invisible)
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    hide(layerIdOrName: number | string): Layer | null;
    /**
     * Sets the opacity of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setOpacity(layerIdOrName: number | string, opacity: number): Layer | null;
    /**
     * Sets the blend mode of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {string} blendMode - One of the BlendModes constants
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setBlendMode(layerIdOrName: number | string, blendMode: string): Layer | null;
    /**
     * Sets the z-index of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} zIndex - The new z-index (higher = on top)
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setLayerIndex(layerIdOrName: number | string, zIndex: number): Layer | null;
    /**
     * Moves a layer by a relative amount in the stack
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} delta - The amount to move (positive = forward, negative = backward)
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    moveLayer(layerIdOrName: number | string, delta: number): Layer | null;
    /**
     * Reorders layers to match a new array order
     * @param {Layer[]} orderedLayers - Array of layers in the desired order
     */
    reorderLayers(orderedLayers: Layer[]): void;
    /**
     * Attaches a mask to a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setMask(layerIdOrName: number | string, maskSource: p5.Framebuffer | p5.Image): Layer | null;
    /**
     * Removes the mask from a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    clearMask(layerIdOrName: number | string): Layer | null;
    /**
     * Renders all layers to the main canvas
     * @param {Function} clearCallback - Optional callback to clear the canvas before rendering
     */
    render(clearCallback?: Function): void;
    /**
     * Checks if canvas was resized and updates layers accordingly
     * @private
     */
    private _checkResize;
    /**
     * Enables or disables automatic layer resizing when canvas size changes
     * @param {boolean} enabled - Whether to enable auto-resize
     */
    setAutoResize(enabled: boolean): void;
    /**
     * Creates and shows a UI panel for controlling layers
     * @param {Object} options - UI configuration options
     * @returns {LayerUI} The created UI instance
     */
    createUI(options?: any): LayerUI;
    /**
     * Updates the UI if it exists
     */
    updateUI(): void;
    /**
     * Disposes of all layers and resources
     */
    dispose(): void;
}
/**
 * LayerUI - A visual panel for displaying and controlling layers
 */
export class LayerUI {
    /**
     * @param {LayerSystem} layerSystem - The layer system to display
     * @param {Object} options - UI configuration options
     */
    constructor(layerSystem: LayerSystem, options?: any);
    layerSystem: LayerSystem;
    options: any;
    isCollapsed: boolean;
    container: HTMLDivElement;
    layerElements: Map<any, any>;
    selectedLayerId: any;
    _dirtyThumbnailLayerIds: Set<any>;
    _captureNeeded: Set<any>;
    _thumbnailCache: Map<any, any>;
    _thumbnailFlushHandle: number | NodeJS.Timeout;
    _cancelThumbnailFlush: ((handle: any) => void) | ((handle: any) => void) | ((handle: any) => void);
    _thumbnailBatchSize: number;
    _thumbnailIdleBudgetMs: number;
    _thumbnailScratchCanvas: HTMLCanvasElement;
    _thumbnailScratchCtx: CanvasRenderingContext2D;
    _downsampleBuffer: any;
    _checkerPatternCanvas: HTMLCanvasElement;
    _checkerPatternCache: WeakMap<object, any>;
    /**
     * Creates the DOM structure for the UI panel
     * @private
     */
    private _createUI;
    layersContainer: HTMLDivElement;
    /**
     * Closes all open layer dropdowns
     * @private
     */
    private _closeAllDropdowns;
    /**
     * Positions the panel based on options
     * @private
     */
    private _positionPanel;
    /**
     * Determines if the panel is currently visible on screen
     * @private
     */
    private _isPanelVisible;
    /**
     * Makes the panel draggable
     * @private
     */
    private _makeDraggable;
    /**
     * Updates the UI to reflect current layer state
     */
    update(): void;
    /**
     * Public helper so the LayerSystem can schedule updates when layer content changes
     * @param {number|string} layerId
     * @param {{needsCapture?: boolean}} options
     */
    scheduleThumbnailUpdate(layerId: number | string, options?: {
        needsCapture?: boolean;
    }): void;
    /**
     * Synchronizes UI controls with current layer state without recreating elements
     */
    syncState(): void;
    /**
     * Updates all thumbnails
     * @private
     */
    private _markThumbnailsDirty;
    /**
     * Removes cached thumbnail data for layers that no longer exist
     * @private
     */
    private _pruneThumbnailState;
    /**
     * Processes a small batch of dirty thumbnails on each animation frame
     * @private
     */
    private _flushDirtyThumbnails;
    /**
     * Schedules a flush using requestIdleCallback/requestAnimationFrame fallback
     * @private
     */
    private _scheduleThumbnailFlush;
    /**
     * Updates thumbnails for a specific layer
     * @private
     */
    private _updateLayerThumbnail;
    _getOrCreateThumbnailCacheEntry(layerId: any): any;
    /**
     * Lazily initializes a framebuffer for GPU-to-GPU downsampling.
     * Uses p5.Framebuffer to stay in the same WebGL context as source framebuffers.
     * @private
     */
    private _getDownsampleBuffer;
    /**
     * Captures a downsampled image from a framebuffer using GPU-to-GPU copy.
     * This avoids reading the full framebuffer, reducing readback from ~8MB to ~150KB.
     * @private
     */
    private _captureLayerImage;
    _calculateBoundsFromCanvas(sourceCanvas: any): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    _applyBoundsToCache(cacheEntry: any, bounds: any, sourceSize: any): void;
    _createFullBounds(sourceSize: any): {
        x: number;
        y: number;
        width: any;
        height: any;
    };
    /**
     * Returns a scalar in [0, 1] representing how tight the crop is.
     * 0 = no crop (full layer), 1 = extremely tight crop (tiny region)
     * @private
     */
    private _getCropAmount;
    _drawThumbnailImage(ctx: any, targetCanvas: any, sourceCanvas: any, bounds: any): void;
    /**
     * Creates a DOM element for a single layer
     * @private
     */
    private _createLayerElement;
    /**
     * Gets a single letter representing the blend mode
     * @private
     */
    private _getBlendModeLetter;
    /**
     * Formats blend mode name for display
     * @private
     */
    private _formatBlendModeName;
    /**
     * Creates a thumbnail canvas for a framebuffer or image
     * @private
     */
    private _createThumbnail;
    /**
     * Draws a checkerboard pattern for transparency background
     * @private
     */
    private _drawCheckerboard;
    _getCheckerboardScale(cropAmount?: number): number;
    _getCheckerPattern(ctx: any): any;
    /**
     * Selects a layer
     * @private
     */
    private _selectLayer;
    /**
     * Deselects the currently selected layer
     * @private
     */
    private _deselectLayer;
    /**
     * Moves the selected layer up or down in the stack
     * @private
     * @param {number} direction - -1 for up (higher in stack), 1 for down (lower in stack)
     */
    private _moveSelectedLayer;
    /**
     * Attaches CSS styles to the document
     * @private
     */
    private _attachStyles;
    /**
     * Toggles the collapsed state of the panel
     */
    toggle(): void;
    /**
     * Shows the panel
     */
    show(): void;
    /**
     * Hides the panel
     */
    hide(): void;
    /**
     * Removes the panel from the DOM
     */
    dispose(): void;
}
/**
 * p5.millefeuille - A Photoshop-like layer system for p5.js WebGL
 *
 * @module p5.millefeuille
 */
export const VERSION: "0.2.1";
/**
 * p5.js addon registration function
 * @param {object} p5 - The p5 constructor
 * @param {object} fn - The p5 prototype
 * @param {object} lifecycles - Lifecycle hooks
 */
declare function millefeuilleAddon(p5: object, fn: object, lifecycles: object): void;
/**
 * Maps our blend modes to shader uniform integers
 * These correspond to the blend mode indices in compositor.frag
 */
export function getBlendModeIndex(mode: any): 1 | 0 | 4 | 12 | 6 | 8 | 2 | 3 | 5 | 7 | 9 | 10 | 11 | 13;
export { millefeuilleAddon as default };
