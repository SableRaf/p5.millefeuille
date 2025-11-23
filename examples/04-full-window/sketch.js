/* eslint-disable no-unused-vars */
/* global createCanvas, windowWidth, windowHeight, WEBGL, createLayerSystem, BlendModes, clear, noStroke, width, height, lerpColor, color, fill, red, green, blue, circle, line, stroke, strokeWeight, TWO_PI, resizeCanvas */

let layers;
let orbitAngle = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  layers = createLayerSystem();

  layers.createLayer('Background');
  layers.createLayer('Grid')
    .setBlendMode(BlendModes.SOFT_LIGHT)
    .setOpacity(0.75);
  layers.createLayer('Orbs')
    .setBlendMode(BlendModes.ADD)
    .setOpacity(0.9);

  layers.createUI({ position: 'bottom-right' });
}

function draw() {
  orbitAngle += 0.01;

  drawBackgroundLayer();
  drawGridLayer();
  drawOrbsLayer();

  layers.render(() => clear());
}

function drawBackgroundLayer() {
  layers.begin('Background');
  clear();
  noStroke();

  const rings = 6;
  const maxRadius = Math.max(width, height) * 0.9;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const hue = lerpColor(color('#6a5acd'), color('#0fffc1'), t);
    fill(red(hue), green(hue), blue(hue), 160);
    circle(0, 0, maxRadius * (1 - t * 0.65));
  }

  layers.end();
}

function drawGridLayer() {
  layers.begin('Grid');
  clear();
  stroke(255, 40);
  strokeWeight(1);

  const spacing = 120;
  for (let x = -width / 2; x <= width / 2; x += spacing) {
    line(x, -height / 2, x, height / 2);
  }
  for (let y = -height / 2; y <= height / 2; y += spacing) {
    line(-width / 2, y, width / 2, y);
  }

  layers.end();
}

function drawOrbsLayer() {
  layers.begin('Orbs');
  clear();
  noStroke();

  const orbCount = 5;
  const radius = Math.min(width, height) * 0.35;

  for (let i = 0; i < orbCount; i++) {
    const angle = orbitAngle + (TWO_PI / orbCount) * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle * 0.8) * radius * 0.6;
    const size = 110 + 30 * Math.sin(angle * 2.2);

    fill(60, 200, 255, 180);
    circle(x, y, size);
  }

  layers.end();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // LayerSystem.autoResize keeps every framebuffer in sync.
}
