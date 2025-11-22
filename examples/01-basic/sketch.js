let ls;
let flowerArt;
let fruitArt;
let gamepadArt;

async function setup() {
  createCanvas(800, 600, WEBGL);
  imageMode(CENTER);

  // Load images with callbacks instead of async/await
  flowerArt = await loadImage('assets/flower.png');
  fruitArt = await loadImage('assets/fruits.png');
  gamepadArt = await loadImage('assets/gamepad.png');

  ls = createLayerSystem();
  ls.createLayer('Backdrop');
  ls.createLayer('Produce');
  ls.createLayer('Gamepad');

  ls.createUI();
}

function draw() {
  drawBackdropLayer();
  drawProduceLayer();
  drawCatLayer();
  ls.render(() => background(12, 14, 26));
}

function drawBackdropLayer() {
  ls.begin('Backdrop');
  clear();
  background("#108bb4ff");

  if (flowerArt) {
    push();
    tint(255, 180);
    image(flowerArt, 0, 0, width * 0.95, height * 0.95);
    pop();
  }

  ls.end();
}

function drawProduceLayer() {
  ls.begin('Produce');
  clear();

  if (fruitArt) {
    push();
    image(fruitArt, -width * 0.08, height * 0.08, width * 0.75, height * 0.75);
    pop();
  }

  ls.end();
}

function drawCatLayer() {
  ls.begin('Gamepad');
  clear();

  if (gamepadArt) {
    push();
    scale(0.5);
    translate(width * 0.12, -height * 0.05);
    image(gamepadArt, 0, 0);
    pop();
  }

  ls.end();
}
