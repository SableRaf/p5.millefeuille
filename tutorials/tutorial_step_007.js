// Tutorial Step 7: Z-Index and Ordering
// Dynamic layer reordering with interactive controls

const BlendModes = {
  NORMAL: 'NORMAL',
  MULTIPLY: 'MULTIPLY',
  SCREEN: 'SCREEN',
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT'
};

function getP5BlendMode(mode) {
  switch (mode) {
    case BlendModes.MULTIPLY: return MULTIPLY;
    case BlendModes.SCREEN: return LIGHTEST;
    case BlendModes.ADD: return ADD;
    case BlendModes.SUBTRACT: return SUBTRACT;
    case BlendModes.NORMAL:
    default: return BLEND;
  }
}

class Layer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.framebuffer = createFramebuffer({ width: width, height: height });
    this.visible = true;
    this.opacity = 1.0;
    this.blendMode = BlendModes.NORMAL;
    this.zIndex = id;
  }
  
  begin() { this.framebuffer.begin(); }
  end() { this.framebuffer.end(); }
  setVisible(visible) { this.visible = visible; }
  setOpacity(opacity) { this.opacity = constrain(opacity, 0, 1); }
  setBlendMode(mode) { this.blendMode = mode; }
  setZIndex(zIndex) { this.zIndex = zIndex; }
  
  show() {
    if (!this.visible || this.opacity <= 0) return;
    push();
    imageMode(CENTER);
    blendMode(getP5BlendMode(this.blendMode));
    tint(255, this.opacity * 255);
    image(this.framebuffer, 0, 0);
    noTint();
    blendMode(BLEND);
    pop();
  }
  
  dispose() { this.framebuffer.remove(); }
}

class LayerSystem {
  constructor() {
    this.layers = new Map();
    this.layerIdCounter = 0;
    this.activeLayerId = null;
  }
  
  createLayer(name, options = {}) {
    const id = this.layerIdCounter++;
    const layer = new Layer(id, name || `Layer ${id}`, 
                           options.width || width, options.height || height);
    if (options.visible !== undefined) layer.setVisible(options.visible);
    if (options.opacity !== undefined) layer.setOpacity(options.opacity);
    if (options.blendMode !== undefined) layer.setBlendMode(options.blendMode);
    if (options.zIndex !== undefined) layer.setZIndex(options.zIndex);
    this.layers.set(id, layer);
    return id;
  }
  
  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.dispose();
      this.layers.delete(layerId);
    }
  }
  
  getLayer(layerId) {
    return this.layers.get(layerId);
  }
  
  // New: Get sorted layers for display
  getSortedLayers() {
    return Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
  }
  
  beginLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    layer.begin();
    this.activeLayerId = layerId;
  }
  
  endLayer() {
    if (this.activeLayerId === null) return;
    const layer = this.layers.get(this.activeLayerId);
    if (layer) layer.end();
    this.activeLayerId = null;
  }
  
  render() {
    const sortedLayers = this.getSortedLayers();
    for (const layer of sortedLayers) {
      layer.show();
    }
  }
  
  setVisible(layerId, visible) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setVisible(visible);
  }
  
  setOpacity(layerId, opacity) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setOpacity(opacity);
  }
  
  setBlendMode(layerId, mode) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setBlendMode(mode);
  }
  
  setZIndex(layerId, zIndex) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setZIndex(zIndex);
  }
  
  // New: Move layer up/down in stack
  moveLayerUp(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setZIndex(layer.zIndex + 1);
    }
  }
  
  moveLayerDown(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setZIndex(layer.zIndex - 1);
    }
  }
  
  // New: Send layer to front or back
  sendToFront(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    const maxZ = Math.max(...Array.from(this.layers.values()).map(l => l.zIndex));
    layer.setZIndex(maxZ + 1);
  }
  
  sendToBack(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    const minZ = Math.min(...Array.from(this.layers.values()).map(l => l.zIndex));
    layer.setZIndex(minZ - 1);
  }
  
  dispose() {
    for (const layer of this.layers.values()) {
      layer.dispose();
    }
    this.layers.clear();
  }
}

let layerSystem;
let redLayerId, greenLayerId, blueLayerId;
let selectedLayerId = null;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  layerSystem = new LayerSystem();
  
  // Create three colored square layers
  redLayerId = layerSystem.createLayer('Red Layer', { zIndex: 0 });
  greenLayerId = layerSystem.createLayer('Green Layer', { zIndex: 1 });
  blueLayerId = layerSystem.createLayer('Blue Layer', { zIndex: 2 });
  
  selectedLayerId = redLayerId;
}

function draw() {
  background(50);
  
  // Draw red layer
  layerSystem.beginLayer(redLayerId);
  clear();
  push();
  fill(255, 100, 100, 200);
  noStroke();
  translate(-100, -100);
  rectMode(CENTER);
  rect(0, 0, 200, 200);
  pop();
  layerSystem.endLayer();
  
  // Draw green layer
  layerSystem.beginLayer(greenLayerId);
  clear();
  push();
  fill(100, 255, 100, 200);
  noStroke();
  translate(0, 0);
  rectMode(CENTER);
  rect(0, 0, 200, 200);
  pop();
  layerSystem.endLayer();
  
  // Draw blue layer
  layerSystem.beginLayer(blueLayerId);
  clear();
  push();
  fill(100, 100, 255, 200);
  noStroke();
  translate(100, 100);
  rectMode(CENTER);
  rect(0, 0, 200, 200);
  pop();
  layerSystem.endLayer();
  
  // Render all layers
  layerSystem.render();
  
  // Draw UI
  drawUI();
}

function drawUI() {
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  
  text('Layer Z-Index Control', 0, 0);
  text('Press 1, 2, 3 to select layer', 0, 25);
  text('Up/Down Arrow: Move layer', 0, 50);
  text('F: Send to front, B: Send to back', 0, 75);
  
  const sortedLayers = layerSystem.getSortedLayers();
  text('Layer Order (bottom to top):', 0, 110);
  
  sortedLayers.forEach((layer, index) => {
    const isSelected = layer.id === selectedLayerId;
    const prefix = isSelected ? '> ' : '  ';
    const zIndex = layer.zIndex;
    text(`${prefix}${layer.name} (z: ${zIndex})`, 0, 135 + index * 20);
  });
  
  pop();
}

function keyPressed() {
  // Select layers
  if (key === '1') selectedLayerId = redLayerId;
  if (key === '2') selectedLayerId = greenLayerId;
  if (key === '3') selectedLayerId = blueLayerId;
  
  // Move selected layer
  if (keyCode === UP_ARROW) {
    layerSystem.moveLayerUp(selectedLayerId);
  }
  if (keyCode === DOWN_ARROW) {
    layerSystem.moveLayerDown(selectedLayerId);
  }
  
  // Send to front/back
  if (key === 'f' || key === 'F') {
    layerSystem.sendToFront(selectedLayerId);
  }
  if (key === 'b' || key === 'B') {
    layerSystem.sendToBack(selectedLayerId);
  }
}
