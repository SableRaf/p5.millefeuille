export function createP5Stub() {
  const controller = new AbortController();

  const stub = {
    width: 800,
    height: 600,
    _pixelDensity: 1,
    _renderer: { drawingContext: new global.WebGLRenderingContext() },
    _removeSignal: controller.signal,
    pixelDensity() {
      return this._pixelDensity;
    },
    setPixelDensity(value) {
      this._pixelDensity = value;
    },
    createShader: jest.fn(() => ({})),
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
    image: jest.fn(),
    BLEND: 'BLEND'
  };

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
      get: () => ({ canvas })
    };
  });

  return stub;
}
