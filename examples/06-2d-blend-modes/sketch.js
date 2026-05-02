let ls;
let redGradient;
let greenGradient;
let blueGradient;
let backgroundGraphic;
let blendModeSelect;

const supported2DModes = [
  BlendModes.NORMAL,
  BlendModes.MULTIPLY,
  BlendModes.SCREEN,
  BlendModes.OVERLAY,
  BlendModes.SOFT_LIGHT,
  BlendModes.HARD_LIGHT,
  BlendModes.COLOR_DODGE,
  BlendModes.COLOR_BURN,
  BlendModes.DARKEN,
  BlendModes.LIGHTEN,
  BlendModes.DIFFERENCE,
  BlendModes.EXCLUSION
];

window.setup = function() {
  createCanvas(600, 600).parent('canvas-container');

  backgroundGraphic = createBackgroundGradient(width, height);
  redGradient = createGradientEllipse([255, 0, 0], 200, 560);
  greenGradient = createGradientEllipse([0, 255, 0], 200, 560);
  blueGradient = createGradientEllipse([0, 0, 255], 200, 560);

  ls = createLayerSystem();
  ls.createLayer('Background');
  ls.createLayer('Red Ellipse').setBlendMode(BlendModes.NORMAL);
  ls.createLayer('Green Ellipse').setBlendMode(BlendModes.NORMAL);
  ls.createLayer('Blue Ellipse').setBlendMode(BlendModes.NORMAL);
  createBlendModeSelect();
};

window.draw = function() {
  ls.begin('Background');
  clear();
  image(backgroundGraphic, 0, 0, width, height);
  ls.end();

  ls.begin('Red Ellipse');
  clear();
  push();
  translate(width * 0.5, height * 0.5);
  rotate(radians(30));
  imageMode(CENTER);
  image(redGradient, 0, 0);
  pop();
  ls.end();

  ls.begin('Green Ellipse');
  clear();
  push();
  translate(width * 0.5, height * 0.5);
  rotate(radians(90));
  imageMode(CENTER);
  image(greenGradient, 0, 0);
  pop();
  ls.end();

  ls.begin('Blue Ellipse');
  clear();
  push();
  translate(width * 0.5, height * 0.5);
  rotate(radians(150));
  imageMode(CENTER);
  image(blueGradient, 0, 0);
  pop();
  ls.end();

  ls.render();
};

function createGradientEllipse(fromColor, w, h) {
  const g = createGraphics(w, h);
  const ctx = g.drawingContext;
  const gradient = ctx.createLinearGradient(0, h / 2, w, h / 2);
  gradient.addColorStop(0, `rgb(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]})`);
  gradient.addColorStop(1, 'rgb(255, 255, 255)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  return g;
}

function createBackgroundGradient(w, h) {
  const g = createGraphics(w, h);
  const ctx = g.drawingContext;
  const vertical = ctx.createLinearGradient(0, 0, 0, h);
  vertical.addColorStop(0, '#ffff00');
  vertical.addColorStop(0.5, '#ff00ff');
  vertical.addColorStop(1, '#00ffff');
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, w, h);

  const horizontal = ctx.createLinearGradient(0, 0, w, 0);
  horizontal.addColorStop(0, 'rgba(0, 0, 0, 1)');
  horizontal.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  horizontal.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, w, h);
  return g;
}

function createBlendModeSelect() {
  const info = select('.info');
  const controls = createDiv();
  controls.parent(info);
  controls.class('controls');

  const label = createSpan('Blend mode');
  label.parent(controls);

  blendModeSelect = createSelect();
  blendModeSelect.parent(controls);

  supported2DModes.forEach((mode) => {
    const prettyName = mode.split('_').map((word) =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
    blendModeSelect.option(prettyName, mode);
  });

  const note = createSpan('ADD and SUBTRACT are unavailable in 2D mode.');
  note.parent(controls);
  note.class('note');

  const applyBlendMode = (mode) => {
    ls.setBlendMode('Red Ellipse', mode);
    ls.setBlendMode('Green Ellipse', mode);
    ls.setBlendMode('Blue Ellipse', mode);
  };

  blendModeSelect.changed(() => applyBlendMode(blendModeSelect.value()));
}
