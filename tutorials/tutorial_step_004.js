// Tutorial Step 4: Layer Properties
// Add visibility and opacity controls to the Layer class

class Layer {
  constructor(name, width, height) {
    this.name = name;
    this.framebuffer = createFramebuffer({ width: width, height: height });
    this.visible = true;  // New: visibility property
    this.opacity = 1.0;   // New: opacity property (0-1)
  }
  
  begin() {
    this.framebuffer.begin();
  }
  
  end() {
    this.framebuffer.end();
  }
  
  // New: Set visibility
  setVisible(visible) {
    this.visible = visible;
  }
  
  // New: Set opacity (0 = transparent, 1 = opaque)
  setOpacity(opacity) {
    this.opacity = constrain(opacity, 0, 1);
  }
  
  // Updated: show() now respects visibility and opacity
  show() {
    // Don't draw if invisible or fully transparent
    if (!this.visible || this.opacity <= 0) {
      return;
    }
    
    push();
    imageMode(CENTER);
    
    // Apply opacity using tint
    tint(255, this.opacity * 255);
    image(this.framebuffer, 0, 0);
    noTint();
    
    pop();
  }
  
  dispose() {
    this.framebuffer.remove();
  }
}

// Layer instances
let bgLayer;
let midLayer;
let fgLayer;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  bgLayer = new Layer('Background', width, height);
  midLayer = new Layer('Middle', width, height);
  fgLayer = new Layer('Foreground', width, height);
  
  // Set initial opacity for middle layer
  midLayer.setOpacity(0.7);
}

function draw() {
  background(220);
  
  // Draw background layer
  bgLayer.begin();
  background(20, 40, 80);
  push();
  stroke(100, 150, 255, 100);
  strokeWeight(2);
  for (let i = 0; i < 20; i++) {
    let y = map(i, 0, 20, -height/2, height/2);
    line(-width/2, y, width/2, y);
  }
  pop();
  bgLayer.end();
  
  // Draw middle layer
  midLayer.begin();
  clear();
  push();
  fill(255, 150, 200);
  noStroke();
  translate(0, 0, -50);
  rotateY(frameCount * 0.01);
  box(150, 150, 150);
  pop();
  midLayer.end();
  
  // Draw foreground layer
  fgLayer.begin();
  clear();
  push();
  fill(100, 255, 150);
  noStroke();
  translate(0, 0, 50);
  rotateX(frameCount * 0.015);
  sphere(80);
  pop();
  fgLayer.end();
  
  // Animate opacity based on mouse position
  let fgOpacity = map(mouseX, 0, width, 0, 1);
  fgLayer.setOpacity(fgOpacity);
  
  // Toggle middle layer visibility with mouse press
  if (mouseIsPressed) {
    midLayer.setVisible(false);
  } else {
    midLayer.setVisible(true);
  }
  
  // Composite layers
  bgLayer.show();
  midLayer.show();
  fgLayer.show();
  
  // UI
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('Layer Properties Demo', 0, 0);
  text(`Background: Always visible`, 0, 25);
  text(`Middle: ${midLayer.visible ? 'Visible' : 'Hidden'} (click to hide)`, 0, 50);
  text(`Foreground: ${(fgOpacity * 100).toFixed(0)}% opacity (move mouse)`, 0, 75);
  pop();
}
