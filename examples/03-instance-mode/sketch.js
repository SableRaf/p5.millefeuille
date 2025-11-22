// Instance mode example for p5.millefeuille

new p5(function(sketch) {
  let layers;
  let uiFont;
  
  sketch.setup = async function() {
    let canvas = sketch.createCanvas(800, 600, sketch.WEBGL);
    canvas.parent('sketch-container');

    uiFont = await sketch.loadFont('../assets/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf?v=1');

    // Create layer system using instance method
    layers = sketch.createLayerSystem();
    
    // Create layers
    layers.createLayer('Background');
    layers.createLayer('Shapes').setOpacity(0.8);
    layers.createLayer('Text');
    
    // Create UI
    layers.createUI();

    if (uiFont) {
      sketch.textFont(uiFont);
    }
  };
  
  sketch.draw = function() {
    // Background layer
    layers.begin('Background');
    sketch.clear();
    sketch.background(20, 25, 40);
    
    // Gradient effect
    sketch.noStroke();
    for (let i = 0; i < 15; i++) {
      sketch.fill(20 + i * 8, 25 + i * 5, 40 + i * 12, 30);
      sketch.circle(0, 0, 500 - i * 30);
    }
    layers.end();
    
    // Shapes layer
    layers.begin('Shapes');
    sketch.clear();
    
    // Rotating hexagons
    sketch.push();
    sketch.rotateZ(sketch.frameCount * 0.008);
    sketch.stroke(100, 200, 255);
    sketch.strokeWeight(2);
    sketch.noFill();
    for (let i = 0; i < 6; i++) {
      sketch.rotateZ(sketch.PI / 3);
      sketch.line(0, -80 - i * 20, 0, -120 - i * 20);
    }
    sketch.pop();
    
    // Pulsing circles
    sketch.push();
    let pulse = sketch.sin(sketch.frameCount * 0.05) * 50;
    sketch.fill(255, 150, 100, 100);
    sketch.noStroke();
    sketch.circle(sketch.sin(sketch.frameCount * 0.02) * 150, 0, 80 + pulse);
    sketch.circle(sketch.cos(sketch.frameCount * 0.02) * 150, 0, 80 - pulse);
    sketch.pop();
    
    layers.end();
    
    // Text layer
    layers.begin('Text');
    sketch.clear();
    
    if (uiFont) {
      sketch.push();
      sketch.textFont(uiFont);
      sketch.fill(255, 255, 200);
      sketch.textSize(32);
      sketch.textAlign(sketch.CENTER, sketch.CENTER);
      sketch.text('Instance Mode', 0, -250);
      sketch.textSize(16);
      sketch.text('Each sketch has its own layer system', 0, -210);
      sketch.pop();
    }
    
    layers.end();
    
    // Render all layers
    layers.render();
  };
});
