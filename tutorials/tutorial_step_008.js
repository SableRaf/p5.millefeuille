// Tutorial Step 8: Masking
// Add layer masking with custom shaders

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

// Compositor shader for masking
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
}
`;

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
    float maskValue = maskColor.r;  // Use red channel as mask
    finalOpacity *= maskValue;
  }
  
  layerColor.rgb *= finalOpacity;
  layerColor.a *= finalOpacity;
  
  gl_FragColor = layerColor;
}
`;

class Layer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.framebuffer = createFramebuffer({ width: width, height: height });
    this.visible = true;
    this.opacity = 1.0;
    this.blendMode = BlendModes.NORMAL;
    this.zIndex = id;
    this.mask = null;  // Mask framebuffer or image
  }
  
  begin() { this.framebuffer.begin(); }
  end() { this.framebuffer.end(); }
  setVisible(visible) { this.visible = visible; }
  setOpacity(opacity) { this.opacity = constrain(opacity, 0, 1); }
  setBlendMode(mode) { this.blendMode = mode; }
  setZIndex(zIndex) { this.zIndex = zIndex; }
  
  // New: Set mask
  setMask(maskSource) {
    this.mask = maskSource;
  }
  
  // New: Clear mask
  clearMask() {
    this.mask = null;
  }
  
  show(maskShader) {
    if (!this.visible || this.opacity <= 0) return;
    
    push();
    imageMode(CENTER);
    blendMode(getP5BlendMode(this.blendMode));
    
    // Use shader if masked
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
      // No mask - standard rendering
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
  }
  
  // Initialize shader
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
  
  render() {
    this.initShader();
    const sortedLayers = this.getSortedLayers();
    for (const layer of sortedLayers) {
      layer.show(this.maskShader);
    }
  }
  
  // New: Set layer mask
  setMask(layerId, maskSource) {
    const layer = this.layers.get(layerId);
    if (layer) layer.setMask(maskSource);
  }
  
  // New: Clear layer mask
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
  
  dispose() {
    for (const layer of this.layers.values()) {
      layer.dispose();
    }
    this.layers.clear();
  }
}

let layerSystem;
let photoLayerId;
let maskBuffer;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  layerSystem = new LayerSystem();
  
  // Create layer for photo
  photoLayerId = layerSystem.createLayer('Photo');
  
  // Create mask buffer
  maskBuffer = createFramebuffer({ width: width, height: height });
}

function draw() {
  background(40, 40, 60);
  
  // Draw the photo layer
  layerSystem.beginLayer(photoLayerId);
  background(200, 150, 100);
  
  // Draw a colorful pattern
  push();
  noStroke();
  for (let x = -width/2; x < width/2; x += 40) {
    for (let y = -height/2; y < height/2; y += 40) {
      let c = color(
        map(x, -width/2, width/2, 100, 255),
        map(y, -height/2, height/2, 100, 255),
        200
      );
      fill(c);
      circle(x, y, 30);
    }
  }
  pop();
  layerSystem.endLayer();
  
  // Update mask based on mouse position
  maskBuffer.begin();
  clear();
  
  // Draw white circle at mouse position (white = visible)
  push();
  fill(255);  // White = fully visible
  noStroke();
  translate(mouseX - width/2, mouseY - height/2);
  circle(0, 0, 150);
  pop();
  
  // Add some additional masked areas
  push();
  fill(128);  // Gray = semi-transparent
  noStroke();
  translate(-200, 0);
  circle(0, 0, 100);
  pop();
  
  maskBuffer.end();
  
  // Apply mask to the photo layer
  layerSystem.setMask(photoLayerId, maskBuffer);
  
  // Render all layers
  layerSystem.render();
  
  // UI
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('Layer Masking Demo', 0, 0);
  text('Move mouse to reveal the pattern', 0, 25);
  text('White in mask = visible', 0, 50);
  text('Black in mask = hidden', 0, 75);
  text('Gray in mask = semi-transparent', 0, 100);
  pop();
}
