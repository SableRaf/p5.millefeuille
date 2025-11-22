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
