let layers;

// Small -> large -> medium -> tall cycle with matching rotation targets
const rectangleKeyframes = [
  { width: 110, height: 90, rotation: -0.35 }, // small
  { width: 340, height: 240, rotation: 0.45 }, // large
  { width: 220, height: 150, rotation: 0.05 }, // medium
  { width: 150, height: 320, rotation: -0.15 } // tall
];
const RECT_TRANSITION_FRAMES = 24;
const RECT_HOLD_FRAMES = 120;
let rectangleState;

const orbConfigs = [
  { radiusX: 260, radiusY: 120, size: 110, speed: 0.013, wobble: 0.008, color: [120, 220, 255] },
  { radiusX: 180, radiusY: 160, size: 80, speed: -0.018, wobble: 0.011, color: [255, 160, 200] }
];

function setup() {
  createCanvas(720, 480, WEBGL);
  rectMode(CENTER);
  angleMode(RADIANS);

  layers = createLayerSystem();
  layers.createLayer('Backdrop');
  layers.createLayer('Wandering Orbs').setOpacity(0.92);
  layers.createLayer('Spinny Triangle');
  layers.createLayer('Breathing Rectangle').setOpacity(0.85);

  rectangleState = createRectangleState();

  layers.createUI({ position: 'top-right', width: 320, autoUpdate: true, thumbnailUpdateEvery: 120 });
}

function draw() {
  renderLayer('Backdrop', drawBackdropLayer);
  renderLayer('Wandering Orbs', drawOrbsLayer);
  renderLayer('Spinny Triangle', drawTriangleLayer);
  renderLayer('Breathing Rectangle', drawRectangleLayer);

  layers.render(() => {
    background(6, 8, 16);
  });
}

function renderLayer(name, fn) {
  layers.begin(name);
  clear();
  fn();
  layers.end();
}

function drawBackdropLayer() {
  noStroke();
  for (let i = 0; i < 18; i++) {
    const size = width * 1.2 - i * 40;
    const alpha = map(i, 0, 18, 15, 80);
    fill(20 + i * 3, 40 + i * 4, 80 + i * 3, alpha);
    circle(0, 0, size);
  }

  stroke(255, 255, 255, 20);
  noFill();
  for (let i = 0; i < 6; i++) {
    rotateZ(0.1);
    rect(0, 0, 420 + i * 40, 220 + i * 20);
  }
}

function drawOrbsLayer() {
  noStroke();
  orbConfigs.forEach((orb, index) => {
    const t = frameCount * orb.speed + index * 1.5;
    const x = cos(t) * orb.radiusX;
    const y = sin(t * 1.3) * orb.radiusY;
    const size = orb.size + sin(t * (1.5 + index * 0.2)) * 18;
    const alpha = 200 + sin(t * 0.5) * 30;
    fill(orb.color[0], orb.color[1], orb.color[2], alpha);
    circle(x, y, size);

    fill(255, 255, 255, 60);
    circle(x + sin(t * 2) * 12, y + cos(t * 2) * 12, size * 0.35);
  });
}

function drawTriangleLayer() {
  push();
  const angle = frameCount * 0.02;
  rotateZ(angle);
  scale(1 + sin(frameCount * 0.01) * 0.15);

  stroke(255, 130, 180, 180);
  strokeWeight(3);
  fill(255, 100, 150, 80);

  const triSize = 220;
  beginShape();
  vertex(-triSize * 0.5, triSize * 0.6);
  vertex(triSize * 0.5, triSize * 0.6);
  vertex(0, -triSize * 0.7);
  endShape(CLOSE);
  pop();
}

function drawRectangleLayer() {
  updateRectangleAnimation();
  push();
  rotateZ(rectangleState.current.rotation || 0);
  const { width: w, height: h } = rectangleState.current;
  noStroke();
  fill(255, 210, 140, 200);
  rect(0, 0, w, h, 24);

  stroke(255, 255, 255, 70);
  noFill();
  rect(0, 0, w * 0.6, h * 0.6, 14);
  pop();
}

function createRectangleState() {
  const first = rectangleKeyframes[0];
  return {
    index: 0,
    phase: 'hold',
    frame: 0,
    start: { ...first },
    target: { ...first },
    current: { ...first }
  };
}

function updateRectangleAnimation() {
  if (!rectangleState) {
    return;
  }

  if (rectangleState.phase === 'transition') {
    const progress = Math.min(1, rectangleState.frame / RECT_TRANSITION_FRAMES);
    const eased = easeInOutCubic(progress);
    rectangleState.current.width = lerp(rectangleState.start.width, rectangleState.target.width, eased);
    rectangleState.current.height = lerp(rectangleState.start.height, rectangleState.target.height, eased);
    rectangleState.current.rotation = lerp(rectangleState.start.rotation, rectangleState.target.rotation, eased);
    rectangleState.frame++;

    if (rectangleState.frame > RECT_TRANSITION_FRAMES) {
      rectangleState.phase = 'hold';
      rectangleState.frame = 0;
      rectangleState.current = { ...rectangleState.target };
    }
    return;
  }

  rectangleState.current = { ...rectangleState.target };
  rectangleState.frame++;
  if (rectangleState.frame > RECT_HOLD_FRAMES) {
    rectangleState.phase = 'transition';
    rectangleState.frame = 0;
    rectangleState.start = { ...rectangleState.target };
    rectangleState.index = (rectangleState.index + 1) % rectangleKeyframes.length;
    rectangleState.target = { ...rectangleKeyframes[rectangleState.index] };
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
