// Tutorial Step 9: Complete Layer System
// Full production-ready layer system with all features

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

// Compositor shader
const compositorVertShader = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}`;

const compositorFragShader = `
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D layerTexture;
uniform sampler2D maskTexture;
uniform bool hasMask;
uniform float layerOpacity;
void main() {
  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
  vec4 layerColor = texture2D(layerTexture, uv);
  float finalOpacity = layerOpacity;
  if (hasMask) {
    vec4 maskColor = texture2D(maskTexture, uv);
    finalOpacity *= maskColor.r;
  }
  layerColor.rgb *= finalOpacity;
  layerColor.a *= finalOpacity;
  gl_FragColor = layerColor;
}`;

class Layer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.framebuffer = createFramebuffer({ width, height });
    this.visible = true;
    this.opacity = 1.0;
    this.blendMode = BlendModes.NORMAL;
    this.zIndex = id;
    this.mask = null;
  }
  
  begin() { this.framebuffer.begin(); }
  end() { this.framebuffer.end(); }
  setVisible(visible) { this.visible = visible; }
  setOpacity(opacity) { this.opacity = constrain(opacity, 0, 1); }
  setBlendMode(mode) { this.blendMode = mode; }
  setZIndex(zIndex) { this.zIndex = zIndex; }
  setMask(maskSource) { this.mask = maskSource; }
  clearMask() { this.mask = null; }
  
  show(maskShader) {
    if (!this.visible || this.opacity <= 0) return;
    push();
    imageMode(CENTER);
    blendMode(getP5BlendMode(this.blendMode));
    
    if (this.mask && maskShader) {
      shader(maskShader);
      maskShader.setUniform('layerTexture', this.framebuffer);
      maskShader.setUniform('maskTexture', this.mask);
      maskShader.setUniform('hasMask', true);
      maskShader.setUniform('layerOpacity', this.opacity);
      rectMode(CENTER);
      noStroke();
      rect(0, 0, width, height);
      resetShader();
    } else {
      tint(255, this.opacity * 255);
      image(this.framebuffer, 0, 0);
      noTint();
    }
    
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
    this.maskShader = null;
    this.autoResize = true;
    this._lastWidth = width;
    this._lastHeight = height;
  }
  
  initShader() {
    if (!this.maskShader) {
      this.maskShader = createShader(compositorVertShader, compositorFragShader);
    }
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
  
  getLayer(layerId) { return this.layers.get(layerId); }
  getSortedLayers() {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
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
  
  // Auto-resize check
  checkResize() {
    if (this.autoResize && (width !== this._lastWidth || height !== this._lastHeight)) {
      this._lastWidth = width;
      this._lastHeight = height;
      // In production, you'd resize layers here
      console.log('Canvas resized - layers should be updated');
    }
  }
  
  render(clearCallback) {
    this.checkResize();
    this.initShader();
    
    if (clearCallback) {
      clearCallback();
    } else {
      // Default clear
      push();
      background(0);
      pop();
    }
    
    const sortedLayers = this.getSortedLayers();
    for (const layer of sortedLayers) {
      layer.show(this.maskShader);
    }
  }
  
  setMask(layerId, maskSource) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setMask(maskSource);
  }
  
  clearMask(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) layer.clearMask();
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
  
  moveLayerUp(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setZIndex(layer.zIndex + 1);
  }
  
  moveLayerDown(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setZIndex(layer.zIndex - 1);
  }
  
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

// Demo: Complex multi-layer composition
let layerSystem;
let bgLayerId, starsLayerId, planetLayerId, ringsLayerId, glowLayerId, maskBuffer;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  layerSystem = new LayerSystem();
  
  // Create layers with different properties
  bgLayerId = layerSystem.createLayer('Background', { zIndex: 0 });
  starsLayerId = layerSystem.createLayer('Stars', { 
    zIndex: 1, 
    blendMode: BlendModes.ADD,
    opacity: 0.8
  });
  
  planetLayerId = layerSystem.createLayer('Planet', { zIndex: 3 });
  ringsLayerId = layerSystem.createLayer('Rings', { 
    zIndex: 2,
    opacity: 0.6
  });
  
  glowLayerId = layerSystem.createLayer('Glow', { 
    zIndex: 4,
    blendMode: BlendModes.ADD,
    opacity: 0.4
  });
  
  // Create mask for planet
  maskBuffer = createFramebuffer({ width, height });
}

function draw() {
  // Background gradient
  layerSystem.beginLayer(bgLayerId);
  spaceBackground();
  layerSystem.endLayer();
  
  // Starfield
  layerSystem.beginLayer(starsLayerId);
  starfield();
  layerSystem.endLayer();
  
  // Planet rings (behind planet)
  layerSystem.beginLayer(ringsLayerId);
  rings();
  layerSystem.endLayer();
  
  // Planet
  layerSystem.beginLayer(planetLayerId);
  planet();
  layerSystem.endLayer();
  
  // Glow effect
  layerSystem.beginLayer(glowLayerId);
  halo();
  layerSystem.endLayer();
  
  // Update mask (optional - creates reveal effect)
  if (mouseIsPressed) {
    maskBuffer.begin();
    clear();
    push();
    fill(255);
    noStroke();
    translate(mouseX - width/2, mouseY - height/2);
    circle(0, 0, 150);
    pop();
    maskBuffer.end();
    layerSystem.setMask(planetLayerId, maskBuffer);
  } else {
    layerSystem.clearMask(planetLayerId);
  }
  
  // Render all layers
  layerSystem.render();
  
  // UI
  drawUI();
}

function drawUI() {
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(14);
  textAlign(LEFT);
  
  text('Complete Layer System Demo', 0, 0);
  text('Features:', 0, 20);
  text('• Multiple layers with z-index', 0, 35);
  text('• Blend modes (ADD for stars/glow)', 0, 50);
  text('• Opacity control', 0, 65);
  text('• Masking (click and drag)', 0, 80);
  
  const layers = layerSystem.getSortedLayers();
  text(`Active layers: ${layers.length}`, 0, 105);
  
  pop();
}

function spaceBackground() {
  push();
  for (let y = -height/2; y < height/2; y += 5) {
    let c = lerpColor(color(10, 10, 40), color(60, 20, 80), map(y, -height/2, height/2, 0, 1));
    stroke(c);
    line(-width/2, y, width/2, y);
  }
  pop();
}

function starfield() {
  clear();
  randomSeed(42);
  noStroke();
  fill(255);
  for (let i = 0; i < 300; i++) {
    let x = random(-width/2, width/2);
    let y = random(-height/2, height/2);
    let size = random(1, 3);
    let twinkle = noise(i, frameCount * 0.01) * 150 + 105;
    fill(255, twinkle);
    circle(x, y, size);
  }
}

function rings() {
  clear();
  push();
  noFill();
  strokeWeight(20);
  stroke(180, 150, 120, 150);
  rotateX(PI/3);
  ellipse(0, 0, 280, 280);
  strokeWeight(15);
  stroke(200, 170, 140, 100);
  ellipse(0, 0, 320, 320);
  pop();
}

function planet() {
  clear();
  push();
  noStroke();
  fill(200, 180, 150);
  rotateY(frameCount * 0.005);
  sphere(120);
  pop();
}

function halo() {
  clear();
  push();
  noStroke();
  fill(255, 220, 180, 80);
  sphere(140);
  fill(255, 240, 200, 40);
  sphere(160);
  pop();
}

function keyPressed() {
  // Toggle layer visibility
  if (key === '1') {
    const layer = layerSystem.getLayer(starsLayerId);
    layerSystem.setVisible(starsLayerId, !layer.visible);
  }
  if (key === '2') {
    const layer = layerSystem.getLayer(ringsLayerId);
    layerSystem.setVisible(ringsLayerId, !layer.visible);
  }
  if (key === '3') {
    const layer = layerSystem.getLayer(glowLayerId);
    layerSystem.setVisible(glowLayerId, !layer.visible);
  }
}
