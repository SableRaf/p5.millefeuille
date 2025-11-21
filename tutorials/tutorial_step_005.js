// Tutorial Step 5: Blend Modes
// Add blend mode support for different compositing effects

// Blend mode constants
const BlendModes = {
  NORMAL: 'NORMAL',
  MULTIPLY: 'MULTIPLY',
  SCREEN: 'SCREEN',
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT'
};

// Helper function to convert our blend modes to p5 constants
function getP5BlendMode(mode) {
  switch (mode) {
    case BlendModes.MULTIPLY: return MULTIPLY;
    case BlendModes.SCREEN: return LIGHTEST; // Approximation in WebGL
    case BlendModes.ADD: return ADD;
    case BlendModes.SUBTRACT: return SUBTRACT;
    case BlendModes.NORMAL:
    default: return BLEND;
  }
}

class Layer {
  constructor(name, width, height) {
    this.name = name;
    this.framebuffer = createFramebuffer({ width: width, height: height });
    this.visible = true;
    this.opacity = 1.0;
    this.blendMode = BlendModes.NORMAL; // New: blend mode property
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
  
  // New: Set blend mode
  setBlendMode(mode) {
    this.blendMode = mode;
  }
  
  // Updated: show() now applies blend mode
  show() {
    if (!this.visible || this.opacity <= 0) {
      return;
    }
    
    push();
    imageMode(CENTER);
    
    // Apply blend mode
    blendMode(getP5BlendMode(this.blendMode));
    
    // Apply opacity
    tint(255, this.opacity * 255);
    image(this.framebuffer, 0, 0);
    noTint();
    
    // Reset blend mode
    blendMode(BLEND);
    
    pop();
  }
  
  dispose() {
    this.framebuffer.remove();
  }
}

// Layers
let bgLayer;
let layer1;
let layer2;
let layer3;

// Current blend mode index
let currentModeIndex = 0;
const modeNames = Object.keys(BlendModes);

function setup() {
  createCanvas(800, 600, WEBGL);
  
  bgLayer = new Layer('Background', width, height);
  layer1 = new Layer('Layer 1', width, height);
  layer2 = new Layer('Layer 2', width, height);
  layer3 = new Layer('Layer 3', width, height);
  
  // Start with different blend modes
  layer1.setBlendMode(BlendModes.NORMAL);
  layer2.setBlendMode(BlendModes.ADD);
  layer3.setBlendMode(BlendModes.MULTIPLY);
}

function draw() {
  background(0);
  
  // Background layer - dark blue
  bgLayer.begin();
  background(20, 30, 50);
  bgLayer.end();
  
  // Layer 1 - Red circles
  layer1.begin();
  clear();
  push();
  fill(255, 100, 100);
  noStroke();
  translate(-100, 0);
  circle(0, 0, 200);
  pop();
  layer1.end();
  
  // Layer 2 - Green circles
  layer2.begin();
  clear();
  push();
  fill(100, 255, 100);
  noStroke();
  translate(0, -50);
  circle(0, 0, 200);
  pop();
  layer2.end();
  
  // Layer 3 - Blue circles
  layer3.begin();
  clear();
  push();
  fill(100, 100, 255);
  noStroke();
  translate(100, 0);
  circle(0, 0, 200);
  pop();
  layer3.end();
  
  // Composite all layers
  bgLayer.show();
  layer1.show();
  layer2.show();
  layer3.show();
  
  // UI
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('Blend Modes Demo', 0, 0);
  text(`Layer 1 (Red): ${layer1.blendMode}`, 0, 25);
  text(`Layer 2 (Green): ${layer2.blendMode}`, 0, 50);
  text(`Layer 3 (Blue): ${layer3.blendMode}`, 0, 75);
  text('Click to cycle blend modes on all layers', 0, 110);
  pop();
}

function mousePressed() {
  // Cycle through blend modes
  currentModeIndex = (currentModeIndex + 1) % modeNames.length;
  let newMode = BlendModes[modeNames[currentModeIndex]];
  
  layer1.setBlendMode(newMode);
  layer2.setBlendMode(newMode);
  layer3.setBlendMode(newMode);
}
