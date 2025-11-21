// Tutorial Step 2: Multiple Framebuffers
// Learn how to create and composite multiple framebuffers (layers)

let backgroundLayer;
let foregroundLayer;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  // Create two framebuffers - our first "layers"
  backgroundLayer = createFramebuffer({ width: width, height: height });
  foregroundLayer = createFramebuffer({ width: width, height: height });
}

function draw() {
  // Clear the main canvas
  background(220);
  
  // Draw to the background layer
  backgroundLayer.begin();
  background(50, 100, 150); // Blue background
  
  // Draw a grid pattern
  push();
  stroke(255, 100);
  strokeWeight(2);
  for (let x = -width/2; x < width/2; x += 50) {
    line(x, -height/2, x, height/2);
  }
  for (let y = -height/2; y < height/2; y += 50) {
    line(-width/2, y, width/2, y);
  }
  pop();
  backgroundLayer.end();
  
  // Draw to the foreground layer
  foregroundLayer.begin();
  clear(); // Transparent background for this layer
  
  // Draw rotating shapes
  push();
  fill(255, 150, 100, 200);
  noStroke();
  rotateY(frameCount * 0.01);
  rotateX(frameCount * 0.02);
  box(150);
  pop();
  
  push();
  translate(200, 0);
  fill(100, 255, 150, 200);
  rotateY(frameCount * 0.015);
  sphere(80);
  pop();
  foregroundLayer.end();
  
  // Step 3: Composite both layers onto the main canvas
  // Layer order matters - draw bottom to top
  
  // Draw background layer first
  push();
  imageMode(CENTER);
  image(backgroundLayer, 0, 0);
  pop();
  
  // Draw foreground layer on top
  push();
  imageMode(CENTER);
  image(foregroundLayer, 0, 0);
  pop();
  
  // Add labels
  push();
  fill(0);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('Two layers composited together', 0, 0);
  text('Background: Grid pattern', 0, 25);
  text('Foreground: Rotating shapes', 0, 50);
  pop();
}
