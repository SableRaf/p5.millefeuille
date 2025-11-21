// Tutorial Step 1: Basic Framebuffer
// Learn how to create and use a single p5.Framebuffer to draw offscreen

let myFramebuffer;

function setup() {
  createCanvas(800, 600, WEBGL);
  
  // Create a framebuffer - an offscreen drawing surface
  myFramebuffer = createFramebuffer({ width: 400, height: 300 });
}

function draw() {
  // Clear the main canvas
  background(200);
  
  // Step 1: Draw to the framebuffer
  myFramebuffer.begin();
  
  // Clear the framebuffer
  background(100, 150, 200);
  
  // Draw some content
  push();
  fill(255, 200, 100);
  noStroke();
  rotateY(frameCount * 0.02);
  box(100);
  pop();
  
  // Stop drawing to framebuffer
  myFramebuffer.end();
  
  // Step 2: Display the framebuffer on the main canvas
  push();
  translate(-200, -150);
  imageMode(CENTER);
  image(myFramebuffer, 200, 150);
  pop();
  
  // Add some text on the main canvas
  push();
  fill(0);
  translate(-width/2 + 20, height/2 - 30);
  textSize(16);
  textAlign(LEFT);
  text('Framebuffer rendered above', 0, 0);
  pop();
}
