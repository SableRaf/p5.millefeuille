import { BlendModes } from './constants.js';
import { computeAlphaBounds, mergeBounds, padBounds } from './utils/alphaBounds.js';

/**
 * LayerUI - A visual panel for displaying and controlling layers
 */
export class LayerUI {
  /**
   * @param {LayerSystem} layerSystem - The layer system to display
   * @param {Object} options - UI configuration options
   */
  constructor(layerSystem, options = {}) {
    this.layerSystem = layerSystem;
    this.options = {
      ...options,
      position: options.position || 'top-right',
      width: options.width || 280,
      collapsible: options.collapsible !== false,
      draggable: options.draggable !== false,
      thumbnailPadding: options.thumbnailPadding ?? 4,
      thumbnailSampleMaxSize: options.thumbnailSampleMaxSize ?? 196,
      thumbnailAlphaThreshold: options.thumbnailAlphaThreshold ?? 12,
      thumbnailAnimationWindow: options.thumbnailAnimationWindow ?? 6,
      thumbnailEmptyFrameReset: options.thumbnailEmptyFrameReset ?? 6,
      thumbnailSampleStride: options.thumbnailSampleStride ?? 1
    };

    this.isCollapsed = false;
    this.container = null;
    this.layerElements = new Map(); // layerId -> DOM element
    this.selectedLayerId = null; // Currently selected layer
    this._dirtyThumbnailLayerIds = new Set();
    this._captureNeeded = new Set();
    this._thumbnailCache = new Map(); // layerId -> { image }
    this._thumbnailFlushHandle = null;
    this._cancelThumbnailFlush = null;
    this._thumbnailBatchSize = 1;
    this._thumbnailIdleBudgetMs = 8;
    this._thumbnailScratchCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    this._thumbnailScratchCtx = this._thumbnailScratchCanvas ? this._thumbnailScratchCanvas.getContext('2d') : null;
    if (this._thumbnailScratchCtx) {
      this._thumbnailScratchCtx.imageSmoothingEnabled = false;
    }

    this._createUI();
    this._attachStyles();
  }

  /**
   * Creates the DOM structure for the UI panel
   * @private
   */
  _createUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'p5ml-layer-panel';
    this.container.style.width = `${this.options.width}px`;

    // Create header
    const header = document.createElement('div');
    header.className = 'p5ml-panel-header';
    header.innerHTML = `
      <span class="p5ml-panel-title">Layers</span>
      <div class="p5ml-header-controls">
        <button class="p5ml-arrow-btn p5ml-arrow-up" title="Move layer up">↑</button>
        <button class="p5ml-arrow-btn p5ml-arrow-down" title="Move layer down">↓</button>
        ${this.options.collapsible ? '<button class="p5ml-collapse-btn">−</button>' : ''}
      </div>
    `;
    this.container.appendChild(header);

    // Create layers container
    this.layersContainer = document.createElement('div');
    this.layersContainer.className = 'p5ml-layers-container';
    this.container.appendChild(this.layersContainer);

    // Add to document
    document.body.appendChild(this.container);

    // Position the panel
    this._positionPanel();

    // Get cleanup signal for event listeners
    const signal = this.layerSystem.p._removeSignal;

    // Add event listeners
    if (this.options.collapsible) {
      const collapseBtn = header.querySelector('.p5ml-collapse-btn');
      collapseBtn.addEventListener('click', () => this.toggle(), { signal });
      // Prevent collapse button from triggering drag
      collapseBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
    }

    // Arrow button handlers
    const upBtn = header.querySelector('.p5ml-arrow-up');
    const downBtn = header.querySelector('.p5ml-arrow-down');
    upBtn.addEventListener('click', () => this._moveSelectedLayer(-1), { signal });
    downBtn.addEventListener('click', () => this._moveSelectedLayer(1), { signal });
    // Prevent arrow buttons from triggering drag
    upBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
    downBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });

    // Make draggable if enabled
    if (this.options.draggable) {
      this._makeDraggable(header);
    }

    // Close dropdowns and deselect when clicking outside
    document.addEventListener('click', (e) => {
      // Check if click is outside the layer panel
      if (!this.container.contains(e.target)) {
        this._closeAllDropdowns();
        this._deselectLayer();
      }
    }, { signal });

    // Keyboard navigation for arrow keys
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }

      if (e.repeat || this.selectedLayerId === null) {
        return;
      }

      if (!this._isPanelVisible()) {
        return;
      }

      // Don't interfere if user is typing in an input field
      if (e.target.matches('input, select, textarea')) {
        return;
      }

      e.preventDefault();

      this._moveSelectedLayer(e.key === 'ArrowUp' ? -1 : 1);
    }, { signal });
  }

  /**
   * Closes all open layer dropdowns
   * @private
   */
  _closeAllDropdowns() {
    document.querySelectorAll('.p5ml-layer-dropdown').forEach(d => {
      d.style.display = 'none';
    });
  }

  /**
   * Positions the panel based on options
   * @private
   */
  _positionPanel() {
    const positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' }
    };

    const pos = positions[this.options.position] || positions['top-right'];
    Object.assign(this.container.style, pos);
  }

  /**
   * Determines if the panel is currently visible on screen
   * @private
   */
  _isPanelVisible() {
    if (!this.container || this.container.style.display === 'none') {
      return false;
    }
    return this.container.getClientRects().length > 0;
  }

  /**
   * Makes the panel draggable
   * @private
   */
  _makeDraggable(header) {
    let isDragging = false;
    let offsetX;
    let offsetY;

    header.style.cursor = 'move';

    const signal = this.layerSystem.p._removeSignal;

    header.addEventListener('mousedown', (e) => {
      // Get current position using getBoundingClientRect for accuracy
      const rect = this.container.getBoundingClientRect();
      
      // Calculate offset from mouse to panel's top-left corner
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      isDragging = true;

      // Clear all positioning properties and switch to left/top only
      this.container.style.right = '';
      this.container.style.bottom = '';
      this.container.style.left = rect.left + 'px';
      this.container.style.top = rect.top + 'px';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        
        // Calculate new position
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // Get panel dimensions
        const panelWidth = this.container.offsetWidth;
        
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Constrain position to keep panel visible (with minimum 50px visible)
        const minVisible = 50;
        newX = Math.max(-panelWidth + minVisible, Math.min(newX, viewportWidth - minVisible));
        newY = Math.max(0, Math.min(newY, viewportHeight - minVisible));

        this.container.style.left = newX + 'px';
        this.container.style.top = newY + 'px';
      }
    }, { signal });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    }, { signal });
  }

  /**
   * Updates the UI to reflect current layer state
   */
  update() {
    const layers = this.layerSystem.getLayers();

    this._pruneThumbnailState(layers);

    // Clear existing layer elements
    this.layersContainer.innerHTML = '';
    this.layerElements.clear();

    // Create elements for each layer (reverse order so top layers appear first)
    const reversedLayers = [...layers].reverse();

    reversedLayers.forEach(layer => {
      const layerEl = this._createLayerElement(layer);
      this.layersContainer.appendChild(layerEl);
      this.layerElements.set(layer.id, layerEl);
    });

    // Initial thumbnail render is scheduled lazily to avoid blocking
    this._markThumbnailsDirty(reversedLayers.map(layer => layer.id), { needsCapture: true });
  }

  /**
   * Public helper so the LayerSystem can schedule updates when layer content changes
   * @param {number|string} layerId
   * @param {{needsCapture?: boolean}} options
   */
  scheduleThumbnailUpdate(layerId, options = {}) {
    this._markThumbnailsDirty([layerId], options);
  }

  /**
   * Synchronizes UI controls with current layer state without recreating elements
   */
  syncState() {
    const layers = this.layerSystem.getLayers();

    layers.forEach(layer => {
      const layerEl = this.layerElements.get(layer.id);
      if (!layerEl) return;

      // Update checkbox
      const checkbox = layerEl.querySelector('.p5ml-visibility-checkbox');
      if (checkbox) {
        checkbox.checked = layer.visible;
      }

      // Update opacity slider and value
      const opacitySlider = layerEl.querySelector('.p5ml-opacity-slider');
      const opacityValue = layerEl.querySelector('.p5ml-opacity-value');
      if (opacitySlider && opacityValue) {
        const opacityPercent = Math.round(layer.opacity * 100);
        opacitySlider.value = opacityPercent;
        opacityValue.textContent = opacityPercent + '%';
      }

      // Update blend mode select and indicator
      const blendSelect = layerEl.querySelector('.p5ml-blend-select');
      const blendIndicator = layerEl.querySelector('.p5ml-blend-indicator');
      if (blendSelect) {
        blendSelect.value = layer.blendMode;
      }
      if (blendIndicator) {
        blendIndicator.textContent = this._getBlendModeLetter(layer.blendMode);
        blendIndicator.title = `Blend Mode: ${layer.blendMode}`;
      }
    });

    // Thumbnails are only updated when clicked (not automatically)
  }

  /**
   * Updates all thumbnails
   * @private
   */
  _markThumbnailsDirty(layerIds = [], options = {}) {
    const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
    const needsCapture = !!options.needsCapture;
    ids.forEach(id => {
      if (id === null || id === undefined) {
        return;
      }
      this._dirtyThumbnailLayerIds.add(id);
      if (needsCapture) {
        this._captureNeeded.add(id);
      }
    });
    this._scheduleThumbnailFlush();
  }

  /**
   * Removes cached thumbnail data for layers that no longer exist
   * @private
   */
  _pruneThumbnailState(activeLayers) {
    const liveIds = new Set(activeLayers.map(layer => layer.id));

    for (const id of Array.from(this._thumbnailCache.keys())) {
      if (!liveIds.has(id)) {
        this._thumbnailCache.delete(id);
      }
    }

    for (const id of Array.from(this._captureNeeded)) {
      if (!liveIds.has(id)) {
        this._captureNeeded.delete(id);
      }
    }

    for (const id of Array.from(this._dirtyThumbnailLayerIds)) {
      if (!liveIds.has(id)) {
        this._dirtyThumbnailLayerIds.delete(id);
      }
    }
  }

  /**
   * Processes a small batch of dirty thumbnails on each animation frame
   * @private
   */
  _flushDirtyThumbnails(deadline) {
    if (this._dirtyThumbnailLayerIds.size === 0) {
      return;
    }

    const hasPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';
    const start = hasPerformanceNow ? performance.now() : null;

    const timeRemaining = (deadline && typeof deadline.timeRemaining === 'function')
      ? () => deadline.timeRemaining()
      : () => {
        if (!hasPerformanceNow || start === null) {
          return Number.POSITIVE_INFINITY;
        }
        const elapsed = performance.now() - start;
        return Math.max(0, this._thumbnailIdleBudgetMs - elapsed);
      };

    const shouldYield = () => timeRemaining() <= 1;

    let processed = 0;
    while (this._dirtyThumbnailLayerIds.size > 0) {
      if (processed >= this._thumbnailBatchSize) {
        break;
      }

      const iterator = this._dirtyThumbnailLayerIds.values().next();
      if (iterator.done) {
        break;
      }
      const layerId = iterator.value;
      this._dirtyThumbnailLayerIds.delete(layerId);
      this._updateLayerThumbnail(layerId);
      processed++;

      if (shouldYield()) {
        break;
      }
    }
  }

  /**
   * Schedules a flush using requestIdleCallback/requestAnimationFrame fallback
   * @private
   */
  _scheduleThumbnailFlush() {
    if (this._thumbnailFlushHandle !== null || this._dirtyThumbnailLayerIds.size === 0) {
      return;
    }

    const flushCallback = (deadline) => {
      this._thumbnailFlushHandle = null;
      this._cancelThumbnailFlush = null;
      this._flushDirtyThumbnails(deadline);
      if (this._dirtyThumbnailLayerIds.size > 0) {
        this._scheduleThumbnailFlush();
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      this._thumbnailFlushHandle = window.requestIdleCallback(flushCallback);
      this._cancelThumbnailFlush = (handle) => window.cancelIdleCallback(handle);
    } else if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this._thumbnailFlushHandle = window.requestAnimationFrame(() => flushCallback());
      this._cancelThumbnailFlush = (handle) => window.cancelAnimationFrame(handle);
    } else {
      this._thumbnailFlushHandle = setTimeout(() => flushCallback(), 16);
      this._cancelThumbnailFlush = (handle) => clearTimeout(handle);
    }
  }

  /**
   * Updates thumbnails for a specific layer
   * @private
   */
  _updateLayerThumbnail(layerId) {
    const layer = this.layerSystem.getLayers().find(l => l.id === layerId);
    if (!layer) return;

    const layerEl = this.layerElements.get(layerId);
    if (!layerEl) return;

    const canvas = layerEl.querySelector('.p5ml-thumbnail-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const cacheEntry = this._getOrCreateThumbnailCacheEntry(layerId);
    let sourceCanvas = cacheEntry.image && cacheEntry.image.canvas ? cacheEntry.image.canvas : null;
    const needsCapture = this._captureNeeded.has(layerId) || !sourceCanvas;

    if (needsCapture) {
      const captured = this._captureLayerImage(layer);
      if (captured && captured.canvas) {
        cacheEntry.image = captured;
        sourceCanvas = captured.canvas;
        cacheEntry.boundsDirty = true;
        this._captureNeeded.delete(layerId);
      }
    }

    if (!sourceCanvas) {
      return;
    }

    const previousSize = cacheEntry.lastSourceSize;
    if (!previousSize || previousSize.width !== sourceCanvas.width || previousSize.height !== sourceCanvas.height) {
      cacheEntry.window = [];
    }
    cacheEntry.lastSourceSize = { width: sourceCanvas.width, height: sourceCanvas.height };

    if (this._thumbnailScratchCtx && (cacheEntry.boundsDirty || !cacheEntry.drawBounds)) {
      const rawBounds = this._calculateBoundsFromCanvas(sourceCanvas);
      this._applyBoundsToCache(cacheEntry, rawBounds, sourceCanvas);
      cacheEntry.boundsDirty = false;
    } else if (!cacheEntry.drawBounds) {
      cacheEntry.drawBounds = this._createFullBounds(sourceCanvas);
      cacheEntry.boundsDirty = false;
    }

    this._drawCheckerboard(ctx, canvas.width, canvas.height);
    const drawBounds = cacheEntry.drawBounds || this._createFullBounds(sourceCanvas);
    this._drawThumbnailImage(ctx, canvas, sourceCanvas, drawBounds);
  }

  _getOrCreateThumbnailCacheEntry(layerId) {
    if (!this._thumbnailCache.has(layerId)) {
      this._thumbnailCache.set(layerId, {
        image: null,
        boundsDirty: false,
        window: [],
        emptyFrames: 0,
        drawBounds: null,
        lastSourceSize: null
      });
    }
    return this._thumbnailCache.get(layerId);
  }

  _captureLayerImage(layer) {
    const source = layer.framebuffer;
    if (!source) {
      return null;
    }

    try {
      if (typeof source.get === 'function') {
        return source.get();
      }
      if (source.canvas) {
        return source;
      }
    } catch (e) {
      console.debug('Could not capture thumbnail:', e);
    }
    return null;
  }

  _calculateBoundsFromCanvas(sourceCanvas) {
    if (!this._thumbnailScratchCtx || !sourceCanvas.width || !sourceCanvas.height) {
      return null;
    }

    const maxSize = Math.max(1, this.options.thumbnailSampleMaxSize);
    const largestSide = Math.max(sourceCanvas.width, sourceCanvas.height);
    const scale = largestSide > maxSize ? maxSize / largestSide : 1;
    const sampleWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
    const sampleHeight = Math.max(1, Math.round(sourceCanvas.height * scale));

    this._thumbnailScratchCanvas.width = sampleWidth;
    this._thumbnailScratchCanvas.height = sampleHeight;

    const ctx = this._thumbnailScratchCtx;
    ctx.clearRect(0, 0, sampleWidth, sampleHeight);
    ctx.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    } catch (e) {
      console.debug('Could not read thumbnail buffer:', e);
      return null;
    }

    const bounds = computeAlphaBounds(imageData.data, sampleWidth, sampleHeight, {
      alphaThreshold: this.options.thumbnailAlphaThreshold,
      stride: this.options.thumbnailSampleStride
    });

    if (!bounds) {
      return null;
    }

    const scaleX = sourceCanvas.width / sampleWidth;
    const scaleY = sourceCanvas.height / sampleHeight;
    return {
      x: bounds.x * scaleX,
      y: bounds.y * scaleY,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY
    };
  }

  _applyBoundsToCache(cacheEntry, bounds, sourceSize) {
    if (!cacheEntry) {
      return;
    }

    if (!cacheEntry.window) {
      cacheEntry.window = [];
    }

    if (bounds) {
      cacheEntry.window.push(bounds);
      const maxWindow = Math.max(1, this.options.thumbnailAnimationWindow || 0);
      while (cacheEntry.window.length > maxWindow) {
        cacheEntry.window.shift();
      }
      cacheEntry.emptyFrames = 0;
    } else {
      const resetLimit = Math.max(1, this.options.thumbnailEmptyFrameReset || 0);
      cacheEntry.emptyFrames = (cacheEntry.emptyFrames || 0) + 1;
      if (cacheEntry.emptyFrames >= resetLimit) {
        cacheEntry.window = [];
        cacheEntry.emptyFrames = resetLimit;
      }
    }

    const merged = mergeBounds(cacheEntry.window);
    const padded = merged
      ? padBounds(merged, this.options.thumbnailPadding, sourceSize.width, sourceSize.height)
      : null;

    if (padded && padded.width > 0 && padded.height > 0) {
      cacheEntry.drawBounds = padded;
    } else if (!cacheEntry.drawBounds) {
      cacheEntry.drawBounds = this._createFullBounds(sourceSize);
    }

    if (!cacheEntry.window.length) {
      cacheEntry.drawBounds = this._createFullBounds(sourceSize);
    }
  }

  _createFullBounds(sourceSize) {
    const width = sourceSize.width || 0;
    const height = sourceSize.height || 0;
    return { x: 0, y: 0, width, height };
  }

  _drawThumbnailImage(ctx, targetCanvas, sourceCanvas, bounds) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const sourceWidth = sourceCanvas.width || 1;
    const sourceHeight = sourceCanvas.height || 1;
    const uniformScale = Math.min(
      targetCanvas.width / sourceWidth,
      targetCanvas.height / sourceHeight
    );

    const scaledSourceWidth = sourceWidth * uniformScale;
    const scaledSourceHeight = sourceHeight * uniformScale;
    const offsetX = (targetCanvas.width - scaledSourceWidth) / 2;
    const offsetY = (targetCanvas.height - scaledSourceHeight) / 2;

    const destWidth = Math.max(1, bounds.width * uniformScale);
    const destHeight = Math.max(1, bounds.height * uniformScale);
    const destX = offsetX + bounds.x * uniformScale;
    const destY = offsetY + bounds.y * uniformScale;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      destX,
      destY,
      destWidth,
      destHeight
    );
    ctx.restore();
  }

  /**
   * Creates a DOM element for a single layer
   * @private
   */
  _createLayerElement(layer) {
    const layerEl = document.createElement('div');
    layerEl.className = 'p5ml-layer-item';
    layerEl.dataset.layerId = layer.id;

    // Add click handler to select layer and update thumbnail
    const signal = this.layerSystem.p._removeSignal;
    layerEl.addEventListener('click', (e) => {
      // Close all dropdowns when clicking on the layer row itself
      if (e.target.classList.contains('p5ml-layer-row') ||
          e.target.classList.contains('p5ml-layer-name') ||
          e.target.classList.contains('p5ml-layer-thumbnail') ||
          e.target.classList.contains('p5ml-thumbnail-canvas')) {
        this._closeAllDropdowns();
        this._selectLayer(layer.id);
        this._updateLayerThumbnail(layer.id);
      }
    }, { signal });

    // Main layer row (Procreate style: thumbnail | name | blend letter | checkbox)
    const layerRow = document.createElement('div');
    layerRow.className = 'p5ml-layer-row';

    // Left: Thumbnail
    const thumbnail = this._createThumbnail();
    thumbnail.className = 'p5ml-layer-thumbnail';
    layerRow.appendChild(thumbnail);

    // Center: Layer name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'p5ml-layer-name';
    nameSpan.textContent = layer.name;
    layerRow.appendChild(nameSpan);

    // Right side controls container
    const rightControls = document.createElement('div');
    rightControls.className = 'p5ml-right-controls';

    // Blend mode letter indicator (clickable)
    const blendIndicator = document.createElement('button');
    blendIndicator.className = 'p5ml-blend-indicator';
    blendIndicator.textContent = this._getBlendModeLetter(layer.blendMode);
    blendIndicator.title = `Blend Mode: ${layer.blendMode}`;
    blendIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = layerEl.querySelector('.p5ml-layer-dropdown');
      const isExpanded = dropdown.style.display === 'block';

      // Close all other dropdowns first
      this._closeAllDropdowns();

      // Toggle this dropdown (if it wasn't already open)
      dropdown.style.display = isExpanded ? 'none' : 'block';
    }, { signal });

    // Visibility checkbox
    const visibilityCheckbox = document.createElement('input');
    visibilityCheckbox.type = 'checkbox';
    visibilityCheckbox.className = 'p5ml-visibility-checkbox';
    visibilityCheckbox.checked = layer.visible;
    visibilityCheckbox.title = 'Toggle visibility';
    visibilityCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) {
        this.layerSystem.show(layer.id);
      } else {
        this.layerSystem.hide(layer.id);
      }
    }, { signal });

    rightControls.appendChild(blendIndicator);
    rightControls.appendChild(visibilityCheckbox);
    layerRow.appendChild(rightControls);

    // Dropdown panel (hidden by default, shown when blend indicator is clicked)
    const dropdown = document.createElement('div');
    dropdown.className = 'p5ml-layer-dropdown';
    dropdown.style.display = 'none';

    // Opacity control
    const opacityGroup = document.createElement('div');
    opacityGroup.className = 'p5ml-control-group';

    const opacityLabel = document.createElement('label');
    opacityLabel.textContent = 'OPACITY';

    const opacityValue = document.createElement('span');
    opacityValue.className = 'p5ml-opacity-value';
    opacityValue.textContent = Math.round(layer.opacity * 100) + '%';

    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '100';
    opacitySlider.value = Math.round(layer.opacity * 100);
    opacitySlider.className = 'p5ml-opacity-slider';
    opacitySlider.addEventListener('input', (e) => {
      e.stopPropagation();
      const value = parseFloat(e.target.value) / 100;
      this.layerSystem.setOpacity(layer.id, value);
      opacityValue.textContent = e.target.value + '%';
    }, { signal });

    opacityGroup.appendChild(opacityLabel);
    opacityGroup.appendChild(opacityValue);
    opacityGroup.appendChild(opacitySlider);

    // Blend mode control
    const blendGroup = document.createElement('div');
    blendGroup.className = 'p5ml-control-group';

    const blendLabel = document.createElement('label');
    blendLabel.textContent = 'BLEND MODE';

    const blendSelect = document.createElement('select');
    blendSelect.className = 'p5ml-blend-select';

    Object.values(BlendModes).forEach(mode => {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = this._formatBlendModeName(mode);
      option.selected = layer.blendMode === mode;
      blendSelect.appendChild(option);
    });

    blendSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      this.layerSystem.setBlendMode(layer.id, e.target.value);
      blendIndicator.textContent = this._getBlendModeLetter(e.target.value);
      blendIndicator.title = `Blend Mode: ${e.target.value}`;
    }, { signal });

    blendGroup.appendChild(blendLabel);
    blendGroup.appendChild(blendSelect);

    dropdown.appendChild(opacityGroup);
    dropdown.appendChild(blendGroup);

    // Assemble layer element
    layerEl.appendChild(layerRow);
    layerEl.appendChild(dropdown);

    return layerEl;
  }

  /**
   * Gets a single letter representing the blend mode
   * @private
   */
  _getBlendModeLetter(blendMode) {
    const letters = {
      [BlendModes.NORMAL]: 'N',
      [BlendModes.MULTIPLY]: 'M',
      [BlendModes.SCREEN]: 'S',
      [BlendModes.OVERLAY]: 'O',
      [BlendModes.DARKEN]: 'D',
      [BlendModes.LIGHTEN]: 'Li',
      [BlendModes.COLOR_DODGE]: 'Cd',
      [BlendModes.COLOR_BURN]: 'B',
      [BlendModes.HARD_LIGHT]: 'HL',
      [BlendModes.SOFT_LIGHT]: 'SL',
      [BlendModes.DIFFERENCE]: 'Di',
      [BlendModes.EXCLUSION]: 'E',
      [BlendModes.ADD]: 'A',
      [BlendModes.SUBTRACT]: 'Su',
    };
    return letters[blendMode] || '-';
  }

  /**
   * Formats blend mode name for display
   * @private
   */
  _formatBlendModeName(mode) {
    // Convert BLEND_MODE to "Blend Mode"
    return mode.split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Creates a thumbnail canvas for a framebuffer or image
   * @private
   */
  _createThumbnail() {
    const container = document.createElement('div');
    container.className = 'p5ml-thumbnail';

    const canvas = document.createElement('canvas');
    canvas.className = 'p5ml-thumbnail-canvas';
    canvas.width = 60;
    canvas.height = 60;

    const ctx = canvas.getContext('2d');

    // Draw a checkerboard background for transparency
    this._drawCheckerboard(ctx, canvas.width, canvas.height);

    container.appendChild(canvas);
    return container;
  }


  /**
   * Draws a checkerboard pattern for transparency background
   * @private
   */
  _drawCheckerboard(ctx, width, height) {
    const squareSize = 4;
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#444';

    for (let y = 0; y < height; y += squareSize) {
      for (let x = 0; x < width; x += squareSize) {
        if ((x / squareSize + y / squareSize) % 2 === 0) {
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }
    }
  }

  /**
   * Selects a layer
   * @private
   */
  _selectLayer(layerId) {
    this.selectedLayerId = layerId;

    // Update visual selection state
    const elements = document.querySelectorAll('.p5ml-layer-item');

    elements.forEach(el => {
      // Convert both to strings for comparison (dataset values are always strings)
      if (el.dataset.layerId == layerId) {
        el.classList.add('p5ml-selected');
        // Force bright blue background with inline style
        el.style.background = '#3a7bc8';
        el.style.borderLeft = '3px solid #5dade2';
      } else {
        el.classList.remove('p5ml-selected');
        // Remove inline styles
        el.style.background = '';
        el.style.borderLeft = '';
      }
    });
  }

  /**
   * Deselects the currently selected layer
   * @private
   */
  _deselectLayer() {
    this.selectedLayerId = null;

    // Remove visual selection state from all layers
    document.querySelectorAll('.p5ml-layer-item').forEach(el => {
      el.classList.remove('p5ml-selected');
      // Remove inline styles
      el.style.background = '';
      el.style.borderLeft = '';
    });
  }

  /**
   * Moves the selected layer up or down in the stack
   * @private
   * @param {number} direction - -1 for up (higher in stack), 1 for down (lower in stack)
   */
  _moveSelectedLayer(direction) {
    if (this.selectedLayerId === null) return;

    const layers = this.layerSystem.getLayers();
    const currentIndex = layers.findIndex(l => l.id === this.selectedLayerId);

    if (currentIndex === -1) return;

    // Calculate new index (remember layers are in bottom-to-top order)
    // direction -1 means "up" which is higher index
    // direction 1 means "down" which is lower index
    const newIndex = currentIndex - direction;

    // Check bounds
    if (newIndex < 0 || newIndex >= layers.length) return;

    // Swap layers
    const targetLayer = layers[newIndex];

    // Swap entries inside the layer array
    [layers[currentIndex], layers[newIndex]] = [layers[newIndex], layers[currentIndex]];

    // Move only the affected DOM nodes instead of rebuilding the entire list
    const selectedElement = this.layerElements.get(this.selectedLayerId);
    const targetElement = this.layerElements.get(targetLayer.id);
    if (selectedElement && targetElement && this.layersContainer) {
      if (direction === -1) {
        this.layersContainer.insertBefore(selectedElement, targetElement);
      } else {
        const nextNode = targetElement.nextSibling;
        this.layersContainer.insertBefore(selectedElement, nextNode);
      }
    }

    // Only the swapped layers need their thumbnails refreshed
    this._markThumbnailsDirty([this.selectedLayerId, targetLayer.id]);

    // Update the layer system's internal order
    if (typeof this.layerSystem.reorderLayers === 'function') {
      this.layerSystem.reorderLayers(layers);
    }

    // Re-select the layer to keep the highlight consistent
    this._selectLayer(this.selectedLayerId);
  }

  /**
   * Attaches CSS styles to the document
   * @private
   */
  _attachStyles() {
    // Check if styles already exist
    if (document.getElementById('p5ml-layer-ui-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'p5ml-layer-ui-styles';
    style.textContent = `
      .p5ml-layer-panel {
        position: fixed;
        background: rgba(26, 26, 26, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #e0e0e0;
        z-index: 10000;
        backdrop-filter: blur(10px);
        overflow: hidden;
      }

      .p5ml-layer-panel.collapsed .p5ml-layers-container {
        display: none;
      }

      .p5ml-panel-header {
        background: rgba(60, 60, 60, 0.9);
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }

      .p5ml-panel-title {
        font-weight: 600;
        font-size: 16px;
        letter-spacing: 0.5px;
        color: #ccc;
      }

      .p5ml-header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .p5ml-arrow-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #e8e8e8;
        font-size: 16px;
        cursor: pointer;
        padding: 4px 8px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .p5ml-arrow-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .p5ml-arrow-btn:active {
        background: rgba(255, 255, 255, 0.2);
      }

      .p5ml-collapse-btn {
        background: none;
        border: none;
        color: #aaa;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .p5ml-collapse-btn:hover {
        color: #fff;
      }

      .p5ml-layers-container {
        max-height: 500px;
        overflow-y: auto;
        padding: 0;
        background: #2a2a2a;
      }

      .p5ml-layers-container::-webkit-scrollbar {
        width: 8px;
      }

      .p5ml-layers-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }

      .p5ml-layers-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .p5ml-layers-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Procreate-style layer item */
      .p5ml-layer-item {
        background: transparent;
        border-bottom: 1px solid #3a3a3a;
        transition: background 0.15s ease;
        cursor: pointer;
      }

      .p5ml-layer-item:hover {
        background: rgba(100, 150, 255, 0.15);
      }

      /* Selected state */
      .p5ml-layer-item.p5ml-selected {
        background: #3a7bc8 !important;
        border-left: 3px solid #5dade2;
      }

      .p5ml-layer-item.p5ml-selected:hover {
        background: #4a8dd8 !important;
      }

      .p5ml-layer-item.p5ml-selected .p5ml-layer-row {
        background: transparent;
      }

      /* Main layer row (horizontal layout) */
      .p5ml-layer-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
      }

      /* Thumbnail on the left */
      .p5ml-layer-thumbnail {
        flex-shrink: 0;
      }

      .p5ml-layer-thumbnail canvas {
        display: block;
        width: 60px;
        height: 60px;
        border: 1px solid #555;
        border-radius: 4px;
        image-rendering: pixelated;
      }

      /* Layer name in center */
      .p5ml-layer-name {
        flex: 1;
        font-weight: 500;
        font-size: 15px;
        color: #e8e8e8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Right side controls */
      .p5ml-right-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      /* Blend mode letter indicator */
      .p5ml-blend-indicator {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e8e8e8;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s;
        pointer-events: auto;
      }

      .p5ml-blend-indicator:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      /* Visibility checkbox */
      .p5ml-visibility-checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #4a90e2;
        pointer-events: auto;
      }

      /* Dropdown panel for opacity and blend mode */
      .p5ml-layer-dropdown {
        background: rgba(40, 40, 40, 0.95);
        border-top: 1px solid #555;
        padding: 16px;
        display: none;
      }

      .p5ml-control-group {
        margin-bottom: 16px;
      }

      .p5ml-control-group:last-child {
        margin-bottom: 0;
      }

      .p5ml-control-group label {
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .p5ml-opacity-value {
        color: #e0e0e0;
        font-weight: 600;
      }

      .p5ml-opacity-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.15);
        margin-top: 4px;
      }

      .p5ml-opacity-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      }

      .p5ml-opacity-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      }

      .p5ml-blend-select {
        width: 100%;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #555;
        border-radius: 6px;
        color: #e8e8e8;
        padding: 10px 12px;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        margin-top: 4px;
      }

      .p5ml-blend-select:hover {
        border-color: #777;
        background: rgba(0, 0, 0, 0.5);
      }

      .p5ml-blend-select option {
        background: #2a2a2a;
        color: #e8e8e8;
        padding: 8px;
      }

      /* Hide old thumbnail styles - no longer used */
      .p5ml-thumbnail-label {
        display: none;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Toggles the collapsed state of the panel
   */
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.container.classList.toggle('collapsed', this.isCollapsed);

    const btn = this.container.querySelector('.p5ml-collapse-btn');
    if (btn) {
      btn.innerHTML = this.isCollapsed ? '+' : '−';
    }
  }

  /**
   * Shows the panel
   */
  show() {
    this.container.style.display = 'block';
  }

  /**
   * Hides the panel
   */
  hide() {
    this.container.style.display = 'none';
  }

  /**
   * Removes the panel from the DOM
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    if (this._cancelThumbnailFlush && this._thumbnailFlushHandle !== null) {
      this._cancelThumbnailFlush(this._thumbnailFlushHandle);
    }
    this._dirtyThumbnailLayerIds.clear();
    this._captureNeeded.clear();
    this._thumbnailCache.clear();
    this._thumbnailFlushHandle = null;
    this._cancelThumbnailFlush = null;
    this._thumbnailScratchCanvas = null;
    this._thumbnailScratchCtx = null;
  }
}
