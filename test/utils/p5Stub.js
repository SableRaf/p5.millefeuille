function create2DContext(canvas) {
  return {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setTransform: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    createPattern: jest.fn(() => ({})),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray((canvas.width || 1) * (canvas.height || 1) * 4)
    }))
  };
}

function createGraphicsStub(stub, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width ?? stub.width;
  canvas.height = height ?? stub.height;
  const drawingContext = create2DContext(canvas);
  const renderer = { drawingContext };

  return {
    width: canvas.width,
    height: canvas.height,
    canvas,
    _renderer: renderer,
    drawingContext,
    pixelDensity: jest.fn(),
    image: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(() => ({
      canvas,
      width: canvas.width,
      height: canvas.height,
      loadPixels: jest.fn()
    })),
    remove: jest.fn()
  };
}

export function createP5Stub({ webgl = true } = {}) {
  const controller = new AbortController();
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const drawingContext = webgl
    ? new global.WebGLRenderingContext()
    : create2DContext(canvas);

  const stub = {
    width: 800,
    height: 600,
    canvas,
    _pixelDensity: 1,
    _renderer: { drawingContext },
    _removeSignal: controller.signal,
    pixelDensity() {
      return this._pixelDensity;
    },
    setPixelDensity(value) {
      this._pixelDensity = value;
    },
    createShader: jest.fn(() => ({})),
    createGraphics: jest.fn((width, height) => createGraphicsStub(stub, width, height)),
    push: jest.fn(),
    pop: jest.fn(),
    blendMode: jest.fn(),
    shader: jest.fn(),
    imageMode: jest.fn(),
    rectMode: jest.fn(),
    noStroke: jest.fn(),
    fill: jest.fn(),
    rect: jest.fn(),
    resetShader: jest.fn(),
    clear: jest.fn(),
    background: jest.fn(),
    image: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    tint: jest.fn(),
    BLEND: 'BLEND',
    CENTER: 'CENTER',
    CORNER: 'CORNER'
  };

  Object.defineProperty(stub, 'drawingContext', {
    get() {
      return this._renderer.drawingContext;
    }
  });

  stub.createFramebuffer = jest.fn((options = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = options.width ?? stub.width;
    canvas.height = options.height ?? stub.height;

    return {
      width: canvas.width,
      height: canvas.height,
      density: options.density ?? stub._pixelDensity,
      canvas,
      begin: jest.fn(),
      end: jest.fn(),
      remove: jest.fn(),
      get: jest.fn(() => ({ canvas, width: canvas.width, height: canvas.height, loadPixels: jest.fn() })),
      resize: jest.fn((width, height) => {
        canvas.width = width;
        canvas.height = height;
      })
    };
  });

  return stub;
}
