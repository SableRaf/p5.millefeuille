// No imports needed - library auto-registered via script tag

let ls; // Layer system
let redGradient, greenGradient, blueGradient; // Gradient graphics
let backgroundGraphic; // Background graphic
let blendModeSelect; // Dropdown to switch blend mode for all ellipse layers

window.setup = function() {
  createCanvas(600, 600, WEBGL);

  // Create background graphic once
  backgroundGraphic = createBackgroundGradient(600, 600);

  // Create gradient ellipse graphics (2D graphics buffers)
  redGradient = createGradientEllipse([255, 0, 0], 200, 560, 'redEllipse');
  greenGradient = createGradientEllipse([0, 255, 0], 200, 560, 'greenEllipse');
  blueGradient = createGradientEllipse([0, 0, 255], 200, 560, 'blueEllipse');

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

  createBlendModeSelect(ls);
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

// Helper function to create a gradient ellipse graphic
function createGradientEllipse(fromColor, w, h, name='gradientEllipse') {

  const canvas = createElement('canvas');
  
  const g = createGraphics(w, h, canvas.elt);
  
  canvas.attribute('id', name);
  canvas.attribute('class', 'p5.Graphics');
  canvas.attribute('width', w);
  canvas.attribute('height', h);

  // Create linear gradient using native Canvas API
  const ctx = g.drawingContext;
  const gradient = ctx.createLinearGradient(0, h/2, w, h/2);
  gradient.addColorStop(0, `rgb(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]})`);
  gradient.addColorStop(1, 'rgb(255, 255, 255)');
  
  // Apply gradient and draw ellipse
  ctx.fillStyle = gradient;
  g.noStroke();
  g.ellipse(w/2, h/2, w, h);
  
  return g;
}

// Helper function to create the background gradient using a shader
function createBackgroundGradient(w, h) {
  // Create a WEBGL graphics buffer for shader rendering
  const g = createGraphics(w, h, WEBGL);

  // Define the shader inline
  const vertSrc = `
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

  const fragSrc = `
    precision mediump float;
    varying vec2 vTexCoord;

    vec3 mix3(vec3 a, vec3 b, float t) {
      return a + (b - a) * t;
    }

    void main() {
      vec2 uv = vTexCoord;

      // Vertical gradient: yellow -> magenta -> cyan
      vec3 yellow = vec3(1.0, 1.0, 0.0);
      vec3 magenta = vec3(1.0, 0.0, 1.0);
      vec3 cyan = vec3(0.0, 1.0, 1.0);

      vec3 vertColor;
      if (uv.y < 0.5) {
        // yellow to magenta
        float t = uv.y * 2.0;
        vertColor = mix3(yellow, magenta, t);
      } else {
        // magenta to cyan
        float t = (uv.y - 0.5) * 2.0;
        vertColor = mix3(magenta, cyan, t);
      }

      // Horizontal gradient overlay (black to normal to white)
      vec3 finalColor;
      if (uv.x < 0.5) {
        // Mix with black
        float t = uv.x * 2.0;
        finalColor = mix3(vec3(0.0), vertColor, t);
      } else {
        // Mix with white
        float t = (uv.x - 0.5) * 2.0;
        finalColor = mix3(vertColor, vec3(1.0), t);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Create and apply the shader
  const gradientShader = g.createShader(vertSrc, fragSrc);
  g.shader(gradientShader);
  g.noStroke();
  g.rect(-w/2, -h/2, w, h);

  return g;
}

function createBlendModeSelect(layerSystem) {
  // Create a dropdown to change blend mode for all ellipse layers
  const controlContainer = createDiv();
  controlContainer.style('margin', '16px');
  controlContainer.style('padding', '12px 16px');
  controlContainer.style('background', 'rgba(255, 255, 255, 0.08)');
  controlContainer.style('border-radius', '8px');
  controlContainer.style('display', 'inline-flex');
  controlContainer.style('align-items', 'center');
  controlContainer.style('gap', '12px');
  controlContainer.parent(select('.info'));

  const label = createSpan('Set blend mode globally');
  label.style('font-weight', '600');
  label.style('color', '#e8e8e8');
  label.style('font-size', '14px');
  label.parent(controlContainer);

  // Helper to style arrow buttons
  function styleArrowButton(btn) {
    btn.style('background', 'rgba(0, 0, 0, 0.4)');
    btn.style('border', '1px solid rgba(255, 255, 255, 0.2)');
    btn.style('border-radius', '6px');
    btn.style('color', '#e8e8e8');
    btn.style('width', '32px');
    btn.style('height', '34px');
    btn.style('font-size', '14px');
    btn.style('cursor', 'pointer');
    btn.style('transition', 'all 0.15s');
  }

  // Left arrow button
  const leftArrow = createButton('◀');
  leftArrow.parent(controlContainer);
  styleArrowButton(leftArrow);

  blendModeSelect = createSelect();
  blendModeSelect.parent(controlContainer);
  blendModeSelect.style('background', 'rgba(0, 0, 0, 0.4)');
  blendModeSelect.style('border', '1px solid rgba(255, 255, 255, 0.2)');
  blendModeSelect.style('border-radius', '6px');
  blendModeSelect.style('color', '#e8e8e8');
  blendModeSelect.style('padding', '8px 12px');
  blendModeSelect.style('font-size', '14px');
  blendModeSelect.style('cursor', 'pointer');
  blendModeSelect.style('outline', 'none');
  blendModeSelect.style('min-width', '140px');
  blendModeSelect.style('appearance', 'none');
  blendModeSelect.style('background-image', 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23e8e8e8\' width=\'24px\' height=\'24px\'%3E%3Cpath d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E")');
  blendModeSelect.style('background-repeat', 'no-repeat');
  blendModeSelect.style('background-position', 'right 8px center');
  blendModeSelect.style('background-size', '16px 16px');

  // Right arrow button
  const rightArrow = createButton('▶');
  rightArrow.parent(controlContainer);
  styleArrowButton(rightArrow);

  // Add all blend mode options
  const blendModeKeys = Object.keys(BlendModes);
  blendModeKeys.forEach(mode => {
    // Format the label: SOFT_LIGHT -> Soft Light
    const formattedName = mode.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
    blendModeSelect.option(formattedName, BlendModes[mode]);
  });

  // Function to apply blend mode to all ellipse layers
  function applyBlendMode(mode) {
    ls.setBlendMode('Red Ellipse', mode);
    ls.setBlendMode('Green Ellipse', mode);
    ls.setBlendMode('Blue Ellipse', mode);
    ls.ui.syncState();
  }

  // Handle blend mode change from dropdown
  blendModeSelect.changed(() => {
    applyBlendMode(blendModeSelect.value());
  });

  // Handle left arrow click (previous blend mode)
  leftArrow.mousePressed(() => {
    const currentIndex = blendModeKeys.findIndex(k => BlendModes[k] === blendModeSelect.value());
    const newIndex = (currentIndex - 1 + blendModeKeys.length) % blendModeKeys.length;
    blendModeSelect.selected(BlendModes[blendModeKeys[newIndex]]);
    applyBlendMode(blendModeSelect.value());
  });

  // Handle right arrow click (next blend mode)
  rightArrow.mousePressed(() => {
    const currentIndex = blendModeKeys.findIndex(k => BlendModes[k] === blendModeSelect.value());
    const newIndex = (currentIndex + 1) % blendModeKeys.length;
    blendModeSelect.selected(BlendModes[blendModeKeys[newIndex]]);
    applyBlendMode(blendModeSelect.value());
  });
}