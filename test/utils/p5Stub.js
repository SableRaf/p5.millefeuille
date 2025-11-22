export function createP5Stub() {
  const controller = new AbortController();

  const stub = {
    width: 800,
    height: 600,
    _renderer: { drawingContext: new global.WebGLRenderingContext() },
    _removeSignal: controller.signal,
    pixelDensity: () => 1,
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

  stub.createFramebuffer = jest.fn(() => {
    const canvas = document.createElement('canvas');
    canvas.width = stub.width;
    canvas.height = stub.height;

    return {
      width: canvas.width,
      height: canvas.height,
      canvas,
      begin: jest.fn(),
      end: jest.fn(),
      remove: jest.fn(),
      get: () => ({ canvas })
    };
  });

  return stub;
}
