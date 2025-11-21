import { createLayerSystem, BlendModes } from '../../dist/p5.millefeuille.esm.js';

let ls; // Layer system 
let redGradient, greenGradient, blueGradient; // Gradient graphics
let backgroundGraphic; // Background graphic

// Helper function to create a gradient ellipse graphic
function createGradientEllipse(fromColor, width, height) {
  const g = createGraphics(width, height);
  
  // Create linear gradient using native Canvas API
  const ctx = g.drawingContext;
  const gradient = ctx.createLinearGradient(0, height/2, width, height/2);
  gradient.addColorStop(0, `rgb(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]})`);
  gradient.addColorStop(1, 'rgb(255, 255, 255)');
  
  // Apply gradient and draw ellipse
  ctx.fillStyle = gradient;
  g.noStroke();
  g.ellipse(width/2, height/2, width, height);
  
  return g;
}

// Helper function to create the background gradient
function createBackgroundGradient(w, h) {
  const g = createGraphics(w, h);
  
  // Create a multi-color gradient background
  g.noStroke();
  const steps = 100;
  for (let y = 0; y < steps; y++) {
    const yPos = map(y, 0, steps, 0, h);
    const heightStep = h / steps;
    
    // Vertical gradient: yellow -> magenta -> cyan
    let r, g_val, b;
    if (y < steps / 2) {
      // yellow to magenta
      const t = y / (steps / 2);
      r = lerp(255, 255, t);
      g_val = lerp(255, 0, t);
      b = lerp(0, 255, t);
    } else {
      // magenta to cyan
      const t = (y - steps / 2) / (steps / 2);
      r = lerp(255, 0, t);
      g_val = lerp(0, 255, t);
      b = lerp(255, 255, t);
    }
    
    // Horizontal gradient overlay (black to transparent to white)
    for (let x = 0; x < steps; x++) {
      const xPos = map(x, 0, steps, 0, w);
      const widthStep = w / steps;
      
      let mixR = r, mixG = g_val, mixB = b;
      if (x < steps / 2) {
        // Mix with black
        const t = x / (steps / 2);
        mixR = lerp(0, r, t);
        mixG = lerp(0, g_val, t);
        mixB = lerp(0, b, t);
      } else {
        // Mix with white
        const t = (x - steps / 2) / (steps / 2);
        mixR = lerp(r, 255, t);
        mixG = lerp(g_val, 255, t);
        mixB = lerp(b, 255, t);
      }
      
      g.fill(mixR, mixG, mixB);
      g.rect(xPos, yPos, widthStep, heightStep);
    }
  }
  
  return g;
}

window.setup = function() {
  createCanvas(600, 600, WEBGL);

  // Create background graphic once
  backgroundGraphic = createBackgroundGradient(600, 600);

  // Create gradient ellipse graphics (2D graphics buffers)
  redGradient = createGradientEllipse([255, 0, 0], 200, 560);
  greenGradient = createGradientEllipse([0, 255, 0], 200, 560);
  blueGradient = createGradientEllipse([0, 0, 255], 200, 560);

  // Create the layer system
  ls = createLayerSystem();

  // Create a background layer with gradient
  ls.createLayer('Background');
  
  // Create three ellipse layers matching MDN example
  // Rotated at -30°, 90°, and 210° like the CSS example
  ls.createLayer('Red Ellipse')
    .setBlendMode(BlendModes.NORMAL);
  
  ls.createLayer('Green Ellipse')
    .setBlendMode(BlendModes.NORMAL);
  
  ls.createLayer('Blue Ellipse')
    .setBlendMode(BlendModes.NORMAL);

  // Create the UI panel to control layers
  ls.createUI();
};

window.draw = function() {
  // Background - render the pre-created gradient
  ls.begin('Background');
  clear();
  push();
  imageMode(CENTER);
  image(backgroundGraphic, 0, 0);
  pop();
  ls.end();

  // Red ellipse - rotated -30 degrees
  ls.begin('Red Ellipse');
  clear();
  push();
  rotate(radians(30));
  imageMode(CENTER);
  image(redGradient, 0, 0);
  pop();
  ls.end();

  // Green ellipse - rotated 90 degrees
  ls.begin('Green Ellipse');
  clear();
  push();
  rotate(radians(90));
  imageMode(CENTER);
  image(greenGradient, 0, 0);
  pop();
  ls.end();

  // Blue ellipse - rotated 210 degrees
  ls.begin('Blue Ellipse');
  clear();
  push();
  rotate(radians(150));
  imageMode(CENTER);
  image(blueGradient, 0, 0);
  pop();
  ls.end();

  // Composite all layers
  ls.render();
};
