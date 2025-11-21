// Tutorial Step 3: Layer Abstraction
// Create a simple Layer class to encapsulate framebuffer logic

class Layer {
  constructor(name, width, height) {
    this.name = name;
    this.framebuffer = createFramebuffer({ width: width, height: height });
  }
  
  // Begin drawing to this layer
  begin() {
    this.framebuffer.begin();
  }
  
  // End drawing to this layer
  end() {
    this.framebuffer.end();
  }
  
  // Display this layer
  show() {
    push();
    imageMode(CENTER);
    image(this.framebuffer, 0, 0);
    pop();
  }
  
  // Clean up resources
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
  
  // Create layers using our new Layer class
  bgLayer = new Layer('Background', width, height);
  midLayer = new Layer('Middle', width, height);
  fgLayer = new Layer('Foreground', width, height);
}

function draw() {
  background(220);
  
  // Draw to background layer
  bgLayer.begin();
  background(30, 60, 90);
  // Starfield effect
  push();
  fill(255);
  noStroke();
  for (let i = 0; i < 100; i++) {
    let x = (noise(i, frameCount * 0.001) - 0.5) * width;
    let y = (noise(i + 100, frameCount * 0.001) - 0.5) * height;
    let size = noise(i + 200) * 3 + 1;
    circle(x, y, size);
  }
  pop();
  bgLayer.end();
  
  // Draw to middle layer
  midLayer.begin();
  clear();
  push();
  fill(150, 100, 200, 150);
  noStroke();
  translate(sin(frameCount * 0.02) * 100, 0);
  rotateY(frameCount * 0.01);
  torus(80, 30);
  pop();
  midLayer.end();
  
  // Draw to foreground layer
  fgLayer.begin();
  clear();
  push();
  fill(255, 200, 100);
  noStroke();
  translate(0, sin(frameCount * 0.03) * 50);
  rotateX(frameCount * 0.015);
  sphere(100);
  pop();
  fgLayer.end();
  
  // Composite all layers in order
  bgLayer.show();
  midLayer.show();
  fgLayer.show();
  
  // Add label
  push();
  fill(255);
  translate(-width/2 + 20, -height/2 + 30);
  textSize(16);
  textAlign(LEFT);
  text('Three layers managed with Layer class', 0, 0);
  text(`Background: ${bgLayer.name}`, 0, 25);
  text(`Middle: ${midLayer.name}`, 0, 50);
  text(`Foreground: ${fgLayer.name}`, 0, 75);
  pop();
}
