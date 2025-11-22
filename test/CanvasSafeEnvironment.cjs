const JsdomEnvironment = require('jest-environment-jsdom').TestEnvironment || require('jest-environment-jsdom');
const Module = require('module');

const originalLoad = Module._load;

Module._load = function patchedModuleLoad(request, parent, isMain) {
  if (request === 'canvas') {
    return {
      createCanvas: () => ({
        getContext: () => ({})
      })
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

class CanvasSafeEnvironment extends JsdomEnvironment {}

module.exports = CanvasSafeEnvironment;
