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

    // Update thumbnails with current content
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

      // Update blend mode
      const blendSelect = layerEl.querySelector('.p5ml-blend-select');
      if (blendSelect) {
        blendSelect.value = layer.blendMode;
      }
    });

    // Update thumbnails
    this._updateThumbnails();
  }

  /**
   * Creates a DOM element for a single layer
   * @private
   */
  _createLayerElement(layer) {
    const layerEl = document.createElement('div');
    layerEl.className = 'p5ml-layer-item';
    layerEl.dataset.layerId = layer.id;

    // Layer header with visibility toggle and name
    const header = document.createElement('div');
    header.className = 'p5ml-layer-header';

    // Visibility checkbox
    const visibilityCheckbox = document.createElement('input');
    visibilityCheckbox.type = 'checkbox';
    visibilityCheckbox.className = 'p5ml-visibility-checkbox';
    visibilityCheckbox.checked = layer.visible;
    visibilityCheckbox.title = 'Toggle visibility';
    visibilityCheckbox.addEventListener('change', (e) => {
      this.layerSystem.setVisible(layer.id, e.target.checked);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'p5ml-layer-name';
    nameSpan.textContent = layer.name;

    header.appendChild(visibilityCheckbox);
    header.appendChild(nameSpan);

    // Thumbnails section (framebuffer and mask)
    const thumbnails = document.createElement('div');
    thumbnails.className = 'p5ml-thumbnails';

    // Framebuffer thumbnail
    const fbThumb = this._createThumbnail(layer.framebuffer, 'Framebuffer');
    thumbnails.appendChild(fbThumb);

    // Mask thumbnail (if present)
    if (layer.mask) {
      const maskThumb = this._createThumbnail(layer.mask, 'Mask');
      thumbnails.appendChild(maskThumb);
    }

    header.appendChild(thumbnails);

    // Layer details
    const details = document.createElement('div');
    details.className = 'p5ml-layer-details';

    // Opacity control
    const opacityGroup = document.createElement('div');
    opacityGroup.className = 'p5ml-control-group';

    const opacityLabel = document.createElement('label');
    opacityLabel.textContent = 'Opacity';

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
    blendLabel.textContent = 'Blend Mode';

    const blendSelect = document.createElement('select');
    blendSelect.className = 'p5ml-blend-select';

    Object.values(BlendModes).forEach(mode => {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = mode.charAt(0) + mode.slice(1).toLowerCase();
      option.selected = layer.blendMode === mode;
      blendSelect.appendChild(option);
    });

    blendSelect.addEventListener('change', (e) => {
      this.layerSystem.setBlendMode(layer.id, e.target.value);
    });

    blendGroup.appendChild(blendLabel);
    blendGroup.appendChild(blendSelect);

    // Layer info (mask, framebuffer size)
    const info = document.createElement('div');
    info.className = 'p5ml-layer-info';

    const infoText = [];
    if (layer.mask) {
      infoText.push('<span class="p5ml-badge">🎭 Masked</span>');
    }
    infoText.push(`<span class="p5ml-size">${layer.width}×${layer.height}</span>`);

    info.innerHTML = infoText.join(' ');

    // Assemble details
    details.appendChild(opacityGroup);
    details.appendChild(blendGroup);
    details.appendChild(info);

    // Assemble layer element
    layerEl.appendChild(header);
    layerEl.appendChild(details);

    return layerEl;
  }

  /**
   * Creates a thumbnail canvas for a framebuffer or image
   * @private
   */
  _createThumbnail(source, label) {
    const container = document.createElement('div');
    container.className = 'p5ml-thumbnail';

    const labelEl = document.createElement('div');
    labelEl.className = 'p5ml-thumbnail-label';
    labelEl.textContent = label;

    const canvas = document.createElement('canvas');
    canvas.className = 'p5ml-thumbnail-canvas';
    canvas.width = 64;
    canvas.height = 48;

    const ctx = canvas.getContext('2d');

    // Draw a checkerboard background for transparency
    this._drawCheckerboard(ctx, canvas.width, canvas.height);

    // Store source reference for later rendering
    canvas.dataset.sourceType = label;

    container.appendChild(labelEl);
    container.appendChild(canvas);
    return container;
  }

  /**
   * Updates thumbnail canvases with current framebuffer/mask content
   * @private
   */
  _updateThumbnails() {
    const layers = this.layerSystem.getLayers();

    layers.forEach(layer => {
      const layerEl = this.layerElements.get(layer.id);
      if (!layerEl) return;

      const thumbnails = layerEl.querySelectorAll('.p5ml-thumbnail-canvas');

      thumbnails.forEach(canvas => {
        const sourceType = canvas.dataset.sourceType;
        const ctx = canvas.getContext('2d');
        const source = sourceType === 'Framebuffer' ? layer.framebuffer : layer.mask;

        if (!source) return;

        try {
          // Clear and redraw checkerboard
          this._drawCheckerboard(ctx, canvas.width, canvas.height);

          // Get the WebGL texture data via p5's pixels approach
          // Use the framebuffer's internal canvas/color property
          if (source.color && source.color.canvas) {
            const fbCanvas = source.color.canvas;

            // Calculate aspect-fit scaling
            const scale = Math.min(canvas.width / fbCanvas.width, canvas.height / fbCanvas.height);
            const scaledWidth = fbCanvas.width * scale;
            const scaledHeight = fbCanvas.height * scale;
            const x = (canvas.width - scaledWidth) / 2;
            const y = (canvas.height - scaledHeight) / 2;

            ctx.drawImage(fbCanvas, x, y, scaledWidth, scaledHeight);
          }
        } catch (e) {
          // Silently fail - just show checkerboard
        }
      });
    });
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
        background: rgba(40, 40, 40, 0.8);
        padding: 10px 12px;
        border-bottom: 1px solid #444;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }

      .p5ml-panel-title {
        font-weight: 600;
        font-size: 14px;
        letter-spacing: 0.5px;
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
        padding: 8px;
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

      .p5ml-layer-item {
        background: rgba(40, 40, 40, 0.6);
        border: 1px solid #555;
        border-radius: 6px;
        margin-bottom: 8px;
        padding: 8px;
        transition: background 0.2s;
      }

      .p5ml-layer-item:hover {
        background: rgba(50, 50, 50, 0.8);
        border-color: #666;
      }

      .p5ml-layer-header {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }

      .p5ml-visibility-checkbox {
        margin-top: 2px;
        width: 16px;
        height: 16px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .p5ml-thumbnails {
        display: flex;
        gap: 8px;
        margin-left: auto;
        flex-shrink: 0;
      }

      .p5ml-thumbnail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .p5ml-thumbnail-label {
        font-size: 9px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .p5ml-thumbnail-canvas {
        border: 1px solid #555;
        border-radius: 3px;
        display: block;
        image-rendering: pixelated;
      }

      .p5ml-layer-name {
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .p5ml-layer-details {
        padding-left: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .p5ml-control-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .p5ml-control-group label {
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        justify-content: space-between;
      }

      .p5ml-opacity-value {
        color: #ccc;
        font-weight: 500;
      }

      .p5ml-opacity-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        outline: none;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.1);
      }

      .p5ml-opacity-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .p5ml-opacity-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .p5ml-blend-select {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid #555;
        border-radius: 4px;
        color: #e0e0e0;
        padding: 6px 8px;
        font-size: 12px;
        cursor: pointer;
        outline: none;
      }

      .p5ml-blend-select:hover {
        border-color: #777;
      }

      .p5ml-blend-select option {
        background: #2a2a2a;
        color: #e0e0e0;
      }

      .p5ml-layer-info {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 11px;
      }

      .p5ml-badge {
        background: rgba(100, 150, 255, 0.2);
        border: 1px solid rgba(100, 150, 255, 0.4);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
      }

      .p5ml-size {
        color: #777;
        font-family: 'Courier New', monospace;
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
