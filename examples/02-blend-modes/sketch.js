import { createLayerSystem, BlendModes } from '../../dist/p5.millefeuille.esm.js';

let ls; // Layer system 

window.setup = function() {
  createCanvas(800, 600, WEBGL);

  // Create the layer system
  ls = createLayerSystem();

  // Create a gradient background layer
  ls.createLayer('Background');
  
  // Create layers with different colored circles
  ls.createLayer('Red Circle')
    .setBlendMode(BlendModes.NORMAL)
    .setOpacity(0.8);
  
  ls.createLayer('Green Circle')
    .setBlendMode(BlendModes.MULTIPLY)
    .setOpacity(0.8);
  
  ls.createLayer('Blue Circle')
    .setBlendMode(BlendModes.SCREEN)
    .setOpacity(0.8);
  
  ls.createLayer('Yellow Accent')
    .setBlendMode(BlendModes.ADD)
    .setOpacity(0.6);

  // Create the UI panel to control layers
  ls.createUI();
};

window.draw = function() {
  // Background gradient
  ls.begin('Background');
  clear();
  background(20, 20, 30);
  
  // Create a radial gradient effect
  noStroke();
  for (let i = 20; i >= 0; i--) {
    let alpha = map(i, 0, 20, 0, 150);
    fill(40, 40, 60, alpha);
    circle(0, 0, i * 50);
  }
  ls.end();

  // Red circle - moves horizontally
  ls.begin('Red Circle');
  clear();
  push();
  let x1 = cos(frameCount * 0.015) * 120;
  fill(255, 80, 80);
  noStroke();
  circle(x1, -50, 200);
  pop();
  ls.end();

  // Green circle - moves vertically
  ls.begin('Green Circle');
  clear();
  push();
  let y2 = sin(frameCount * 0.02) * 100;
  fill(80, 255, 120);
  noStroke();
  circle(-80, y2, 200);
  pop();
  ls.end();

  // Blue circle - moves diagonally
  ls.begin('Blue Circle');
  clear();
  push();
  let x3 = cos(frameCount * 0.025 + PI) * 100;
  let y3 = sin(frameCount * 0.025 + PI) * 80;
  fill(80, 120, 255);
  noStroke();
  circle(x3, y3 + 30, 200);
  pop();
  ls.end();

  // Yellow accent - rotates
  ls.begin('Yellow Accent');
  clear();
  push();
  rotate(frameCount * 0.01);
  fill(255, 255, 100);
  noStroke();
  for (let i = 0; i < 6; i++) {
    push();
    rotate((TWO_PI / 6) * i);
    circle(100, 0, 40);
    pop();
  }
  pop();
  ls.end();

  // Composite all layers
  ls.render();
};
