// Tutorial Step 6: Layer Management
// Create a LayerSystem class to manage multiple layers

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
    this.zIndex = id; // Default z-index is the layer ID
  }
  
  begin() {
    this.framebuffer.begin();
  }
  
  end() {
    this.framebuffer.end();
  }
  
  setVisible(visible) {
    this.visible = visible;
  }
  
  setOpacity(opacity) {
    this.opacity = constrain(opacity, 0, 1);
  }
  
  setBlendMode(mode) {
    this.blendMode = mode;
  }
  
  setZIndex(zIndex) {
    this.zIndex = zIndex;
  }
  
  show() {
    if (!this.visible || this.opacity <= 0) {
      return;
    }
    
    push();
    imageMode(CENTER);
    blendMode(getP5BlendMode(this.blendMode));
    tint(255, this.opacity * 255);
    image(this.framebuffer, 0, 0);
    noTint();
    blendMode(BLEND);
    pop();
  }
  
  dispose() {
    this.framebuffer.remove();
  }
}

// New: LayerSystem class to manage all layers
class LayerSystem {
  constructor() {
    this.layers = new Map();  // Store layers by ID
    this.layerIdCounter = 0;  // Auto-increment ID
    this.activeLayerId = null; // Track which layer is being drawn to
  }
  
  // Create a new layer and return its ID
  createLayer(name, options = {}) {
    const id = this.layerIdCounter++;
    const layer = new Layer(
      id,
      name || `Layer ${id}`,
      options.width || width,
      options.height || height
    );
    
    // Apply optional settings
    if (options.visible !== undefined) layer.setVisible(options.visible);
    if (options.opacity !== undefined) layer.setOpacity(options.opacity);
    if (options.blendMode !== undefined) layer.setBlendMode(options.blendMode);
    if (options.zIndex !== undefined) layer.setZIndex(options.zIndex);
    
    this.layers.set(id, layer);
    return id;
  }
  
  // Remove a layer
  removeLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.dispose();
      this.layers.delete(layerId);
    }
  }
  
  // Get a layer by ID
  getLayer(layerId) {
    return this.layers.get(layerId);
  }
  
  // Begin drawing to a layer
  beginLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.error(`Layer ${layerId} not found`);
      return;
    }
    layer.begin();
    this.activeLayerId = layerId;
  }
  
  // End drawing to current layer
  endLayer() {
    if (this.activeLayerId === null) {
      console.warn('No active layer to end');
      return;
    }
    const layer = this.layers.get(this.activeLayerId);
    if (layer) {
      layer.end();
    }
    this.activeLayerId = null;
  }
  
  // Render all layers sorted by z-index
  render() {
    // Get all layers and sort by zIndex
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.zIndex - b.zIndex);
    
    // Draw each layer
    for (const layer of sortedLayers) {
      layer.show();
    }
  }
  
  // Helper methods for layer properties
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
  
  // Clean up all layers
  dispose() {
    for (const layer of this.layers.values()) {
      layer.dispose();
    }
    this.layers.clear();
  }
}

// Use the LayerSystem
let layerSystem;
let bgLayerId, starsLayerId, planetLayerId, glowLayerId;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  // Create the layer system
  layerSystem = new LayerSystem();
  
  // Create layers
  bgLayerId = layerSystem.createLayer('Background');
  starsLayerId = layerSystem.createLayer('Stars', { blendMode: BlendModes.ADD });
  planetLayerId = layerSystem.createLayer('Planet');
  glowLayerId = layerSystem.createLayer('Glow', { 
    blendMode: BlendModes.ADD,
    opacity: 0.5
  });
}

function draw() {
  background(0);
  
  // Draw background
  layerSystem.beginLayer(bgLayerId);
  background(10, 10, 30);
  layerSystem.endLayer();
  
  // Draw stars
  layerSystem.beginLayer(starsLayerId);
  clear();
  randomSeed(42);
  noStroke();
  fill(255, 255, 200);
  for (let i = 0; i < 200; i++) {
    let x = random(-width/2, width/2);
    let y = random(-height/2, height/2);
    let size = random(1, 3);
    circle(x, y, size);
  }
  layerSystem.endLayer();
  
  // Draw planet
  layerSystem.beginLayer(planetLayerId);
  clear();
  push();
  noStroke();
  fill(200, 150, 100);
  rotateY(frameCount * 0.005);
  sphere(120);
  pop();
  layerSystem.endLayer();
  
  // Draw glow
  layerSystem.beginLayer(glowLayerId);
  clear();
  push();
  noStroke();
  fill(255, 200, 100, 100);
  sphere(150);
  pop();
  layerSystem.endLayer();
  
  // Composite all layers
  layerSystem.render();
  
  // UI
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('LayerSystem Demo - Managing Multiple Layers', 0, 0);
  text(`Total layers: ${layerSystem.layers.size}`, 0, 25);
  pop();
}
