// No imports needed - library auto-registered via script tag

let ls; // Layer system 

window.setup = function() {
  createCanvas(800, 600, WEBGL);

  // Create the layer system using the addon API
  ls = createLayerSystem();

  // Create three layers 
  ls.createLayer('Background');
  ls.createLayer('Shapes').setOpacity(0.8);
  ls.createLayer('Ornaments');

  // Create the UI panel to control layers
  ls.createUI();
};

window.draw = function() {
  // Draw background layer - using string-based access
  ls.begin('Background');
  clear();
  background(30, 30, 60);

  // Draw a gradient-like effect
  noStroke();
  for (let i = 0; i < 20; i++) {
    fill(30 + i * 5, 30 + i * 3, 60 + i * 8, 20);
    circle(0, 0, 600 - i * 30);
  }
  ls.end();

  // Draw shapes layer
  ls.begin('Shapes');
  // clear();

  // Rotating squares
  push();
  rotateZ(frameCount * 0.01);
  stroke(255, 200, 100, 10);
  strokeWeight(3);
  noFill();
  for (let i = 0; i < 5; i++) {
    rotateZ(0.2);
    rect(0, 0, 100 + i * 40, 100 + i * 40);
  }
  pop();

  // Moving circles
  push();
  let x = cos(frameCount * 0.02) * 150;
  let y = sin(frameCount * 0.03) * 100;
  fill(100, 200, 255, 200);
  noStroke();
  circle(x, y, 80);
  pop();

  ls.end();

  // Draw ornament layer
  ls.begin('Ornaments');
  clear();

  // Draw some decorative elements at the top
  push();
  translate(0, -200);

  // Title decoration - small circles
  fill(255, 200);
  noStroke();
  for (let i = 0; i < 12; i++) {
    let angle = (i / 12) * TWO_PI;
    let x = cos(angle + frameCount * 0.02) * 80;
    let y = sin(angle + frameCount * 0.02) * 80;
    circle(x, y, 10);
  }

  // Center ornament
  fill(200, 200, 255);
  circle(0, 0, 30);
  fill(255);
  circle(0, 0, 15);
  pop();

  ls.end();

  // Composite all layers to the main canvas
  ls.render();
};
