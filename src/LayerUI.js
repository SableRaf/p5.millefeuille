import { BlendModes } from './constants.js';

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
      position: options.position || 'top-right',
      width: options.width || 280,
      collapsible: options.collapsible !== false,
      draggable: options.draggable !== false,
      ...options
    };

    this.isCollapsed = false;
    this.container = null;
    this.layerElements = new Map(); // layerId -> DOM element
    this.selectedLayerId = null; // Currently selected layer

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

    // Add event listeners
    if (this.options.collapsible) {
      const collapseBtn = header.querySelector('.p5ml-collapse-btn');
      collapseBtn.addEventListener('click', () => this.toggle());
    }

    // Arrow button handlers
    const upBtn = header.querySelector('.p5ml-arrow-up');
    const downBtn = header.querySelector('.p5ml-arrow-down');
    upBtn.addEventListener('click', () => this._moveSelectedLayer(-1));
    downBtn.addEventListener('click', () => this._moveSelectedLayer(1));

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
    });

    // Keyboard navigation for arrow keys
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Don't interfere if user is typing in an input field
        if (e.target.matches('input, select, textarea')) {
          return;
        }

        e.preventDefault();

        if (e.key === 'ArrowUp') {
          this._moveSelectedLayer(-1);
        } else if (e.key === 'ArrowDown') {
          this._moveSelectedLayer(1);
        }
      }
    });
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
   * Makes the panel draggable
   * @private
   */
  _makeDraggable(header) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - (parseInt(this.container.style.left) || 0);
      initialY = e.clientY - (parseInt(this.container.style.top) || 0);

      // Remove positioning from initial placement
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        this.container.style.left = currentX + 'px';
        this.container.style.top = currentY + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * Updates the UI to reflect current layer state
   */
  update() {
    const layers = this.layerSystem.getLayers();

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

    // Initial thumbnail render
    this._updateThumbnails();
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
  _updateThumbnails() {
    const layers = this.layerSystem.getLayers();
    layers.forEach(layer => {
      this._updateLayerThumbnail(layer.id);
    });
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
    const source = layer.framebuffer;

    if (!source) return;

    try {
      // Clear and redraw checkerboard
      this._drawCheckerboard(ctx, canvas.width, canvas.height);

      // Get framebuffer content as a p5.Image using the get() method
      let imageData;

      if (typeof source.get === 'function') {
        imageData = source.get();
      } else if (source.canvas) {
        imageData = source;
      }

      if (imageData && imageData.canvas) {
        const sourceCanvas = imageData.canvas;

        // Calculate aspect-fit scaling
        const scale = Math.min(canvas.width / sourceCanvas.width, canvas.height / sourceCanvas.height);
        const scaledWidth = sourceCanvas.width * scale;
        const scaledHeight = sourceCanvas.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(sourceCanvas, x, y, scaledWidth, scaledHeight);
      }
    } catch (e) {
      console.debug('Could not render thumbnail:', e);
    }
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
    });

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
    });

    // Visibility checkbox
    const visibilityCheckbox = document.createElement('input');
    visibilityCheckbox.type = 'checkbox';
    visibilityCheckbox.className = 'p5ml-visibility-checkbox';
    visibilityCheckbox.checked = layer.visible;
    visibilityCheckbox.title = 'Toggle visibility';
    visibilityCheckbox.addEventListener('change', (e) => {
      e.stopPropagation();
      this.layerSystem.setVisible(layer.id, e.target.checked);
    });

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
    });

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
    });

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
    document.querySelectorAll('.p5ml-layer-item').forEach(el => {
      if (el.dataset.layerId === layerId) {
        el.classList.add('p5ml-selected');
      } else {
        el.classList.remove('p5ml-selected');
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
    });
  }

  /**
   * Moves the selected layer up or down in the stack
   * @private
   * @param {number} direction - -1 for up (higher in stack), 1 for down (lower in stack)
   */
  _moveSelectedLayer(direction) {
    if (!this.selectedLayerId) return;

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
    const temp = layers[currentIndex];
    layers[currentIndex] = layers[newIndex];
    layers[newIndex] = temp;

    // Update the layer system's internal order
    if (typeof this.layerSystem.reorderLayers === 'function') {
      this.layerSystem.reorderLayers(layers);
    }

    // Refresh the UI to reflect new order
    this.update();

    // Re-select the layer after update
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
        background: rgba(74, 144, 226, 0.35);
        border-left: 3px solid #4a90e2;
      }

      .p5ml-layer-item.p5ml-selected:hover {
        background: rgba(74, 144, 226, 0.4);
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
  }
}
