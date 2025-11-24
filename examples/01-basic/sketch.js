let ls;
let flowerArt;
let fruitArt;
let gamepadArt;

async function setup() {
  createCanvas(800, 600, WEBGL).parent('canvas-container');
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
    translate(-width * 0.2, height * 0.08,);
    scale(0.36);
    image(fruitArt, 0, 0);
    pop();
  }

  ls.end();
}

function drawCatLayer() {
  ls.begin('Gamepad');
  clear();

  if (gamepadArt) {
    push();
    translate(width * 0.2, -height * 0.2);
    scale(0.3);
    image(gamepadArt, 0, 0);
    pop();
  }

  ls.end();
}
