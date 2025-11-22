if (typeof global.requestIdleCallback !== 'function') {
  global.requestIdleCallback = (cb) => {
    const start = Date.now();
    return setTimeout(() => cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    }), 0);
  };
}

if (typeof global.cancelIdleCallback !== 'function') {
  global.cancelIdleCallback = (id) => clearTimeout(id);
}

const CanvasCtor = global.HTMLCanvasElement || (global.window && global.window.HTMLCanvasElement);
if (CanvasCtor) {
  CanvasCtor.prototype.getContext = () => ({
    fillRect: () => {},
    drawImage: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    fillStyle: ''
  });
}

if (typeof global.WebGLRenderingContext === 'undefined') {
  global.WebGLRenderingContext = class {};
}

if (typeof global.WebGL2RenderingContext === 'undefined') {
  global.WebGL2RenderingContext = class {};
}
