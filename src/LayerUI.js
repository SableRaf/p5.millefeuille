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

    // Drag and drop state
    this.draggedLayer = null;
    this.draggedElement = null;
    this.dragEnterTimeout = null;
    this.lastDragTarget = null;

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
      ${this.options.collapsible ? '<button class="p5ml-collapse-btn">−</button>' : ''}
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

    // Make draggable if enabled
    if (this.options.draggable) {
      this._makeDraggable(header);
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      // Check if click is outside the layer panel
      if (!this.container.contains(e.target)) {
        this._closeAllDropdowns();
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
    layerEl.draggable = true;

    // Add click handler to update thumbnails on demand
    layerEl.addEventListener('click', (e) => {
      // Don't close dropdown if clicking inside it or on dropdown controls
      // Use closest() to check if any parent element is the dropdown
      if (e.target.closest('.p5ml-layer-dropdown')) {
        return;
      }

      // Close all dropdowns when clicking on the layer row itself
      if (e.target.classList.contains('p5ml-layer-row') ||
          e.target.classList.contains('p5ml-layer-name') ||
          e.target.classList.contains('p5ml-layer-thumbnail') ||
          e.target.classList.contains('p5ml-thumbnail-canvas')) {
        this._closeAllDropdowns();
        this._updateLayerThumbnail(layer.id);
      }
    });

    // Drag and drop handlers
    layerEl.addEventListener('dragstart', (e) => this._handleDragStart(e, layer));
    layerEl.addEventListener('dragend', (e) => this._handleDragEnd(e));
    layerEl.addEventListener('dragover', (e) => this._handleDragOver(e));
    layerEl.addEventListener('drop', (e) => this._handleDrop(e, layer));
    layerEl.addEventListener('dragenter', (e) => this._handleDragEnter(e));
    layerEl.addEventListener('dragleave', (e) => this._handleDragLeave(e));

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
   * Handles the start of a drag operation
   * @private
   */
  _handleDragStart(e, layer) {
    // Don't allow dragging if clicking on controls
    if (e.target.matches('input, select, button, .p5ml-blend-indicator')) {
      e.preventDefault();
      return;
    }

    this.draggedLayer = layer;
    this.draggedElement = e.currentTarget;

    // Add dragging state with a slight delay for smooth animation
    requestAnimationFrame(() => {
      e.currentTarget.classList.add('p5ml-dragging');
    });

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);

    // Close all dropdowns when starting drag
    this._closeAllDropdowns();
  }

  /**
   * Handles the end of a drag operation
   * @private
   */
  _handleDragEnd(e) {
    // Clear any pending timeout
    if (this.dragEnterTimeout) {
      clearTimeout(this.dragEnterTimeout);
      this.dragEnterTimeout = null;
    }

    // Remove dragging state - element will animate back to normal
    e.currentTarget.classList.remove('p5ml-dragging');

    // Remove all drag-over indicators and placeholders
    document.querySelectorAll('.p5ml-layer-item').forEach(el => {
      el.classList.remove('p5ml-drag-over-before', 'p5ml-drag-over-after', 'p5ml-drag-placeholder');
    });

    this.draggedLayer = null;
    this.draggedElement = null;
    this.lastDragTarget = null;
  }

  /**
   * Handles drag over event
   * @private
   */
  _handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  /**
   * Handles drag enter event
   * @private
   */
  _handleDragEnter(e) {
    const target = e.currentTarget;

    if (target === this.draggedElement) {
      return;
    }

    // Skip if we're re-entering the same target
    if (this.lastDragTarget === target) {
      return;
    }

    // Clear any pending timeout
    if (this.dragEnterTimeout) {
      clearTimeout(this.dragEnterTimeout);
    }

    // Debounce the drag enter animation
    this.dragEnterTimeout = setTimeout(() => {
      // Remove previous indicators
      document.querySelectorAll('.p5ml-layer-item').forEach(el => {
        if (el !== this.draggedElement) {
          el.classList.remove('p5ml-drag-over-before', 'p5ml-drag-over-after');
        }
      });

      // Determine if we're dragging up or down based on indices
      const draggedIndex = Array.from(this.layersContainer.children).indexOf(this.draggedElement);
      const targetIndex = Array.from(this.layersContainer.children).indexOf(target);

      if (targetIndex < draggedIndex) {
        // Dragging upward - add space above target
        target.classList.add('p5ml-drag-over-before');
      } else {
        // Dragging downward - add space below target
        target.classList.add('p5ml-drag-over-after');
      }

      this.lastDragTarget = target;
    }, 50); // 50ms debounce
  }

  /**
   * Handles drag leave event
   * @private
   */
  _handleDragLeave(e) {
    // Only remove if we're actually leaving the element (not entering a child)
    const target = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    if (!target.contains(relatedTarget)) {
      target.classList.remove('p5ml-drag-over-before', 'p5ml-drag-over-after');
    }
  }

  /**
   * Handles drop event
   * @private
   */
  _handleDrop(e, targetLayer) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    if (e.preventDefault) {
      e.preventDefault();
    }

    // Clean up all drag indicators
    document.querySelectorAll('.p5ml-layer-item').forEach(el => {
      el.classList.remove('p5ml-drag-over-before', 'p5ml-drag-over-after', 'p5ml-drag-placeholder');
    });

    if (this.draggedLayer && this.draggedLayer.id !== targetLayer.id) {
      // Reorder layers in the layer system
      this._reorderLayers(this.draggedLayer.id, targetLayer.id);
    }

    return false;
  }

  /**
   * Reorders layers in the layer system
   * @private
   */
  _reorderLayers(draggedLayerId, targetLayerId) {
    const layers = this.layerSystem.getLayers();
    const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetLayerId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged layer from its position
    const [draggedLayer] = layers.splice(draggedIndex, 1);

    // Insert at new position
    layers.splice(targetIndex, 0, draggedLayer);

    // Update the layer system's internal order
    // Note: This assumes the layer system has a method to set layer order
    // If not available, we may need to adjust this approach
    if (typeof this.layerSystem.reorderLayers === 'function') {
      this.layerSystem.reorderLayers(layers);
    }

    // Refresh the UI to reflect new order
    this.update();
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
        transition:
          background 0.15s ease,
          opacity 0.2s ease,
          transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
          margin 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: grab;
        transform-origin: center;
      }

      .p5ml-layer-item:hover {
        background: rgba(100, 150, 255, 0.15);
      }

      .p5ml-layer-item:active {
        cursor: grabbing;
      }

      /* Dragging state - shrink and fade */
      .p5ml-layer-item.p5ml-dragging {
        opacity: 0.5;
        transform: scale(0.95);
        cursor: grabbing;
        background: rgba(100, 150, 255, 0.08);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      /* Placeholder for dragged item - creates space */
      .p5ml-layer-item.p5ml-drag-placeholder {
        opacity: 0.3;
        transform: scale(0.98);
        background: rgba(74, 144, 226, 0.05);
      }

      /* Drag over indicator - shows where item will drop */
      .p5ml-layer-item.p5ml-drag-over-before {
        transform: translateY(2px);
        margin-top: 40px;
        border-top: 2px solid #4a90e2;
      }

      .p5ml-layer-item.p5ml-drag-over-after {
        transform: translateY(-2px);
        margin-bottom: 40px;
        border-bottom: 2px solid #4a90e2;
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
