/**
 * p5.millefeuille v0.2.1-alpha
 * A Photoshop-like layer system for p5.js WebGL
 * https://github.com/SableRaf/p5.millefeuille
 *
 * Licensed under LGPL-2.1
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.p5Millefeuille = {}));
})(this, (function (exports) { 'use strict';

  /**
   * Blend mode constants for layer compositing
   * These map to glsl-blend functions in the compositor shader
   */
  const BlendModes = {
    NORMAL: 'NORMAL',
    MULTIPLY: 'MULTIPLY',
    SCREEN: 'SCREEN',
    ADD: 'ADD',
    SUBTRACT: 'SUBTRACT',
    OVERLAY: 'OVERLAY',
    SOFT_LIGHT: 'SOFT_LIGHT',
    HARD_LIGHT: 'HARD_LIGHT',
    COLOR_DODGE: 'COLOR_DODGE',
    COLOR_BURN: 'COLOR_BURN',
    DARKEN: 'DARKEN',
    LIGHTEN: 'LIGHTEN',
    DIFFERENCE: 'DIFFERENCE',
    EXCLUSION: 'EXCLUSION'
  };

  /**
   * Maps our blend modes to shader uniform integers
   * These correspond to the blend mode indices in compositor.frag
   */
  function getBlendModeIndex(mode) {
    switch (mode) {
      case BlendModes.NORMAL:
        return 0;
      case BlendModes.MULTIPLY:
        return 1;
      case BlendModes.SCREEN:
        return 2;
      case BlendModes.ADD:
        return 3;
      case BlendModes.SUBTRACT:
        return 4;
      case BlendModes.OVERLAY:
        return 5;
      case BlendModes.SOFT_LIGHT:
        return 6;
      case BlendModes.HARD_LIGHT:
        return 7;
      case BlendModes.COLOR_DODGE:
        return 8;
      case BlendModes.COLOR_BURN:
        return 9;
      case BlendModes.DARKEN:
        return 10;
      case BlendModes.LIGHTEN:
        return 11;
      case BlendModes.DIFFERENCE:
        return 12;
      case BlendModes.EXCLUSION:
        return 13;
      default:
        console.warn(`Unknown blend mode: ${mode}, falling back to NORMAL`);
        return 0;
    }
  }

  /**
   * Default layer options
   */
  const DEFAULT_LAYER_OPTIONS = {
    visible: true,
    opacity: 1.0,
    blendMode: BlendModes.NORMAL,
    width: null,  // null means use canvas width
    height: null, // null means use canvas height
    density: null, // null means use canvas density
    depth: false,
    antialias: false
  };

  /**
   * Represents a single layer backed by a p5.Framebuffer
   */
  class Layer {
    /**
     * @param {p5} p5Instance - The p5.js instance
     * @param {string|number} id - Unique identifier for this layer
     * @param {string} name - Human-readable name for this layer
     * @param {Object} options - Layer configuration options
     */
    constructor(p5Instance, id, name = '', options = {}) {
      this.p = p5Instance;
      this.id = id;
      this.name = name || `Layer ${id}`;

      // Merge with defaults
      const opts = { ...DEFAULT_LAYER_OPTIONS, ...options };

      this.visible = opts.visible;
      this.opacity = this._clampOpacity(opts.opacity);
      this.blendMode = opts.blendMode;
      this.zIndex = opts.zIndex !== undefined ? opts.zIndex : id;

      // Framebuffer options
      this.width = opts.width ?? this.p.width;
      this.height = opts.height ?? this.p.height;
      this.density = opts.density ?? this.p.pixelDensity();
      this.depth = opts.depth;
      this.antialias = opts.antialias;

      // Flag layers that opted into custom sizing to protect them from auto-resize
      this.customSize = opts.width != null ||
        opts.height != null ||
        opts.density != null;

      // Mask reference (can be p5.Framebuffer or p5.Image)
      this.mask = null;

      // Track if layer has been drawn to at least once
      this.hasBeenDrawnTo = false;

      // Create the framebuffer
      this.framebuffer = this._createFramebuffer();

      if (!this.framebuffer) {
        throw new Error(`Failed to create framebuffer for layer ${this.name}`);
      }
    }

    /**
     * Creates the underlying p5.Framebuffer
     * @private
     */
    _createFramebuffer() {
      try {
        const options = {
          width: this.width,
          height: this.height,
          density: this.density
        };

        // Only add depth and antialias if explicitly set
        if (this.depth !== undefined) {
          options.depth = this.depth;
        }
        if (this.antialias !== undefined) {
          options.antialias = this.antialias;
        }

        return this.p.createFramebuffer(options);
      } catch (e) {
        console.error(`Error creating framebuffer for layer ${this.name}:`, e);
        return null;
      }
    }

    /**
     * Clamps opacity value to valid range [0, 1]
     * @private
     */
    _clampOpacity(value) {
      return Math.max(0, Math.min(1, value));
    }

    /**
     * Shows this layer (makes it visible)
     * @returns {Layer} This layer for chaining
     */
    show() {
      this.visible = true;
      return this;
    }

    /**
     * Hides this layer (makes it invisible)
     * @returns {Layer} This layer for chaining
     */
    hide() {
      this.visible = false;
      return this;
    }

    /**
     * Sets the opacity of this layer
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {Layer} This layer for chaining
     */
    setOpacity(opacity) {
      this.opacity = this._clampOpacity(opacity);
      return this;
    }

    /**
     * Sets the blend mode for this layer
     * @param {string} mode - One of the BlendModes constants
     * @returns {Layer} This layer for chaining
     */
    setBlendMode(mode) {
      if (!Object.values(BlendModes).includes(mode)) {
        console.warn(`Invalid blend mode: ${mode}, using NORMAL`);
        this.blendMode = BlendModes.NORMAL;
      } else {
        this.blendMode = mode;
      }
      return this;
    }

    /**
     * Sets the z-index (layer order) for this layer
     * @param {number} zIndex - The z-index value (higher = on top)
     * @returns {Layer} This layer for chaining
     */
    setZIndex(zIndex) {
      this.zIndex = zIndex;
      return this;
    }

    /**
     * Attaches a mask to this layer
     * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
     * @returns {Layer} This layer for chaining
     */
    setMask(maskSource) {
      if (!maskSource) {
        console.warn('Invalid mask source provided');
        return this;
      }
      this.mask = maskSource;
      return this;
    }

    /**
     * Removes the mask from this layer
     * @returns {Layer} This layer for chaining
     */
    clearMask() {
      this.mask = null;
      return this;
    }

    /**
     * Resizes the layer's framebuffer
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height, density = this.density) {
      this.width = width;
      this.height = height;
      this.density = density;

      // Keep track of whether the layer is canvas-synced or intentionally customized
      const matchesCanvas = width === this.p.width &&
        height === this.p.height &&
        density === this.p.pixelDensity();
      this.customSize = !matchesCanvas;

      // Dispose old framebuffer
      if (this.framebuffer) {
        this.framebuffer.remove();
      }

      // Create new framebuffer with updated size
      this.framebuffer = this._createFramebuffer();
    }

    /**
     * Begins drawing to this layer's framebuffer
     */
    begin() {
      if (!this.framebuffer) {
        console.error(`Cannot begin drawing: framebuffer not initialized for layer ${this.name}`);
        return;
      }
      this.framebuffer.begin();
    }

    /**
     * Ends drawing to this layer's framebuffer
     */
    end() {
      if (!this.framebuffer) {
        console.error(`Cannot end drawing: framebuffer not initialized for layer ${this.name}`);
        return;
      }
      this.framebuffer.end();
      
      // Mark that this layer has been drawn to
      this.hasBeenDrawnTo = true;
    }

    /**
     * Disposes of this layer's resources
     */
    dispose() {
      if (this.framebuffer) {
        this.framebuffer.remove();
        this.framebuffer = null;
      }
    }

    /**
     * Returns a plain object representation of this layer's properties
     */
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        visible: this.visible,
        opacity: this.opacity,
        blendMode: this.blendMode,
        zIndex: this.zIndex,
        hasMask: !!this.mask,
        hasBeenDrawnTo: this.hasBeenDrawnTo,
        width: this.width,
        height: this.height,
        density: this.density,
        customSize: this.customSize
      };
    }
  }

  var compositorVertSource = "precision highp float;\n#define GLSLIFY 1\n\nattribute vec3 aPosition;\nattribute vec2 aTexCoord;\n\nvarying vec2 vTexCoord;\n\nvoid main() {\n  // Pass through texture coordinates\n  vTexCoord = aTexCoord;\n\n  // Standard vertex transformation\n  vec4 positionVec4 = vec4(aPosition, 1.0);\n  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;\n  gl_Position = positionVec4;\n}\n"; // eslint-disable-line

  var compositorFragSource = "precision highp float;\n#define GLSLIFY 1\n\nvarying vec2 vTexCoord;\n\nuniform sampler2D layerTexture;\nuniform sampler2D backgroundTexture;\nuniform sampler2D maskTexture;\nuniform bool hasMask;\nuniform float layerOpacity;\nuniform int blendMode;\n\n// Import glsl-blend functions\nvec3 blendNormal(vec3 base, vec3 blend) {\n\treturn blend;\n}\n\nvec3 blendNormal(vec3 base, vec3 blend, float opacity) {\n\treturn (blendNormal(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nvec3 blendMultiply(vec3 base, vec3 blend) {\n\treturn base*blend;\n}\n\nvec3 blendMultiply(vec3 base, vec3 blend, float opacity) {\n\treturn (blendMultiply(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendScreen(float base, float blend) {\n\treturn 1.0-((1.0-base)*(1.0-blend));\n}\n\nvec3 blendScreen(vec3 base, vec3 blend) {\n\treturn vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));\n}\n\nvec3 blendScreen(vec3 base, vec3 blend, float opacity) {\n\treturn (blendScreen(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendAdd(float base, float blend) {\n\treturn min(base+blend,1.0);\n}\n\nvec3 blendAdd(vec3 base, vec3 blend) {\n\treturn min(base+blend,vec3(1.0));\n}\n\nvec3 blendAdd(vec3 base, vec3 blend, float opacity) {\n\treturn (blendAdd(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendSubtract(float base, float blend) {\n\treturn max(base+blend-1.0,0.0);\n}\n\nvec3 blendSubtract(vec3 base, vec3 blend) {\n\treturn max(base+blend-vec3(1.0),vec3(0.0));\n}\n\nvec3 blendSubtract(vec3 base, vec3 blend, float opacity) {\n\treturn (blendSubtract(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendOverlay_0(float base, float blend) {\n\treturn base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));\n}\n\nvec3 blendOverlay_0(vec3 base, vec3 blend) {\n\treturn vec3(blendOverlay_0(base.r,blend.r),blendOverlay_0(base.g,blend.g),blendOverlay_0(base.b,blend.b));\n}\n\nvec3 blendOverlay_0(vec3 base, vec3 blend, float opacity) {\n\treturn (blendOverlay_0(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendSoftLight(float base, float blend) {\n\treturn (blend<0.5)?(2.0*base*blend+base*base*(1.0-2.0*blend)):(sqrt(base)*(2.0*blend-1.0)+2.0*base*(1.0-blend));\n}\n\nvec3 blendSoftLight(vec3 base, vec3 blend) {\n\treturn vec3(blendSoftLight(base.r,blend.r),blendSoftLight(base.g,blend.g),blendSoftLight(base.b,blend.b));\n}\n\nvec3 blendSoftLight(vec3 base, vec3 blend, float opacity) {\n\treturn (blendSoftLight(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendOverlay_1(float base, float blend) {\n\treturn base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));\n}\n\nvec3 blendOverlay_1(vec3 base, vec3 blend) {\n\treturn vec3(blendOverlay_1(base.r,blend.r),blendOverlay_1(base.g,blend.g),blendOverlay_1(base.b,blend.b));\n}\n\nvec3 blendOverlay_1(vec3 base, vec3 blend, float opacity) {\n\treturn (blendOverlay_1(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nvec3 blendHardLight(vec3 base, vec3 blend) {\n\treturn blendOverlay_1(blend,base);\n}\n\nvec3 blendHardLight(vec3 base, vec3 blend, float opacity) {\n\treturn (blendHardLight(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendColorDodge(float base, float blend) {\n\treturn (blend==1.0)?blend:min(base/(1.0-blend),1.0);\n}\n\nvec3 blendColorDodge(vec3 base, vec3 blend) {\n\treturn vec3(blendColorDodge(base.r,blend.r),blendColorDodge(base.g,blend.g),blendColorDodge(base.b,blend.b));\n}\n\nvec3 blendColorDodge(vec3 base, vec3 blend, float opacity) {\n\treturn (blendColorDodge(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendColorBurn(float base, float blend) {\n\treturn (blend==0.0)?blend:max((1.0-((1.0-base)/blend)),0.0);\n}\n\nvec3 blendColorBurn(vec3 base, vec3 blend) {\n\treturn vec3(blendColorBurn(base.r,blend.r),blendColorBurn(base.g,blend.g),blendColorBurn(base.b,blend.b));\n}\n\nvec3 blendColorBurn(vec3 base, vec3 blend, float opacity) {\n\treturn (blendColorBurn(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendDarken(float base, float blend) {\n\treturn min(blend,base);\n}\n\nvec3 blendDarken(vec3 base, vec3 blend) {\n\treturn vec3(blendDarken(base.r,blend.r),blendDarken(base.g,blend.g),blendDarken(base.b,blend.b));\n}\n\nvec3 blendDarken(vec3 base, vec3 blend, float opacity) {\n\treturn (blendDarken(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nfloat blendLighten(float base, float blend) {\n\treturn max(blend,base);\n}\n\nvec3 blendLighten(vec3 base, vec3 blend) {\n\treturn vec3(blendLighten(base.r,blend.r),blendLighten(base.g,blend.g),blendLighten(base.b,blend.b));\n}\n\nvec3 blendLighten(vec3 base, vec3 blend, float opacity) {\n\treturn (blendLighten(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nvec3 blendDifference(vec3 base, vec3 blend) {\n\treturn abs(base-blend);\n}\n\nvec3 blendDifference(vec3 base, vec3 blend, float opacity) {\n\treturn (blendDifference(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nvec3 blendExclusion(vec3 base, vec3 blend) {\n\treturn base+blend-2.0*base*blend;\n}\n\nvec3 blendExclusion(vec3 base, vec3 blend, float opacity) {\n\treturn (blendExclusion(base, blend) * opacity + base * (1.0 - opacity));\n}\n\nvec3 applyBlendMode(int mode, vec3 base, vec3 blend, float opacity) {\n  if (mode == 0) return blendNormal(base, blend, opacity);      // NORMAL\n  if (mode == 1) return blendMultiply(base, blend, opacity);    // MULTIPLY\n  if (mode == 2) return blendScreen(base, blend, opacity);      // SCREEN\n  if (mode == 3) return blendAdd(base, blend, opacity);         // ADD\n  if (mode == 4) return blendSubtract(base, blend, opacity);    // SUBTRACT\n  if (mode == 5) return blendOverlay_0(base, blend, opacity);     // OVERLAY\n  if (mode == 6) return blendSoftLight(base, blend, opacity);   // SOFT_LIGHT\n  if (mode == 7) return blendHardLight(base, blend, opacity);   // HARD_LIGHT\n  if (mode == 8) return blendColorDodge(base, blend, opacity);  // COLOR_DODGE\n  if (mode == 9) return blendColorBurn(base, blend, opacity);   // COLOR_BURN\n  if (mode == 10) return blendDarken(base, blend, opacity);     // DARKEN\n  if (mode == 11) return blendLighten(base, blend, opacity);    // LIGHTEN\n  if (mode == 12) return blendDifference(base, blend, opacity); // DIFFERENCE\n  if (mode == 13) return blendExclusion(base, blend, opacity);  // EXCLUSION\n  return blendNormal(base, blend, opacity); // Fallback\n}\n\nvoid main() {\n  // Use texture coordinates directly\n  vec2 uv = vTexCoord;\n\n  // Sample textures\n  vec4 layerColor = texture2D(layerTexture, uv);\n  vec4 bgColor = texture2D(backgroundTexture, uv);\n\n  // Calculate final opacity from layer alpha and opacity uniform\n  float finalOpacity = layerColor.a * layerOpacity;\n\n  // Apply mask if present\n  if (hasMask) {\n    vec4 maskColor = texture2D(maskTexture, uv);\n    float maskValue = maskColor.r;\n    finalOpacity *= maskValue;\n  }\n\n  // If layer is completely transparent, just output background\n  if (finalOpacity <= 0.0) {\n    gl_FragColor = bgColor;\n    return;\n  }\n\n  // Apply blend mode only where layer has content\n  vec3 blendedColor = applyBlendMode(blendMode, bgColor.rgb, layerColor.rgb, finalOpacity);\n\n  // Output with proper alpha compositing\n  gl_FragColor = vec4(blendedColor, 1.0);\n}\n"; // eslint-disable-line

  /**
   * Handles the compositing of layers to the main canvas
   */
  class Compositor {
    /**
     * @param {p5} p5Instance - The p5.js instance
     */
    constructor(p5Instance) {
      this.p = p5Instance;
      this.shader = null;
      this.shaderLoaded = false;
      this.bufferA = null;
      this.bufferB = null;
      this._bufferDensity = null;
    }

    /**
     * Lazily creates the compositor shader
     * @private
     */
    _ensureShader() {
      if (!this.shaderLoaded) {
        try {
          this.shader = this.p.createShader(compositorVertSource, compositorFragSource);
          this.shaderLoaded = true;
        } catch (e) {
          console.error('Failed to create compositor shader:', e);
          this.shaderLoaded = false;
        }
      }
      return this.shader;
    }

    /**
     * Ensures the ping-pong buffers exist and match canvas size
     * @private
     */
    _ensureBuffers() {
      const p = this.p;
      
      const currentDensity = p.pixelDensity();
      const needsResize = !this.bufferA || 
                this.bufferA.width !== p.width || 
                this.bufferA.height !== p.height ||
                this._bufferDensity !== currentDensity;
      
      if (needsResize) {
        if (this.bufferA) {
          this.bufferA.remove();
          this.bufferB.remove();
        }
        
        const bufferOptions = {
          width: p.width,
          height: p.height,
          density: currentDensity,
          antialias: false,
          depth: false
        };
        
        this.bufferA = p.createFramebuffer(bufferOptions);
        this.bufferB = p.createFramebuffer(bufferOptions);
        this._bufferDensity = currentDensity;
      }
      
      return { a: this.bufferA, b: this.bufferB };
    }

    /**
     * Renders a single layer to the current framebuffer
     * @param {Layer} layer - The layer to render
     * @param {p5.Framebuffer} backgroundBuffer - The background to composite onto
     * @private
     */
    _renderLayer(layer, backgroundBuffer) {
      if (!layer.visible || layer.opacity <= 0) {
        return;
      }

      if (!layer.framebuffer) {
        console.warn(`Layer ${layer.name} has no framebuffer, skipping`);
        return;
      }

      const shader = this._ensureShader();
      if (!shader) {
        console.warn('Compositor shader not available, skipping layer');
        return;
      }

      const p = this.p;

      // Save current state
      p.push();

      // Use normal blending since we're doing the blend in the shader
      p.blendMode(p.BLEND);

      // Use the compositor shader
      p.shader(shader);

      // Set uniforms
      shader.setUniform('layerTexture', layer.framebuffer);
      shader.setUniform('backgroundTexture', backgroundBuffer);
      shader.setUniform('maskTexture', layer.mask || layer.framebuffer);
      shader.setUniform('hasMask', layer.mask ? true : false);
      shader.setUniform('layerOpacity', layer.opacity);
      shader.setUniform('blendMode', getBlendModeIndex(layer.blendMode));

      // Draw a full-screen quad
      p.imageMode(p.CENTER);
      p.rectMode(p.CENTER);
      p.noStroke();
      p.fill(255);
      p.rect(0, 0, p.width, p.height);

      // Reset shader
      p.resetShader();

      // Restore state
      p.pop();
    }

    /**
     * Composites all layers to the main canvas using ping-pong buffering
     * @param {Layer[]} layers - Array of layers to composite (should be pre-sorted by zIndex)
     * @param {Function} clearCallback - Optional callback to clear the canvas before compositing
     */
    render(layers, clearCallback = null) {
      const p = this.p;

      // Ensure we have ping-pong buffers
      const buffers = this._ensureBuffers();
      let currentBuffer = buffers.a;
      let nextBuffer = buffers.b;

      // Sort layers by zIndex (ascending)
      const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

      // Clear the first buffer
      currentBuffer.begin();
      p.clear();
      currentBuffer.end();

      // Render each layer progressively, ping-ponging between buffers
      for (let i = 0; i < sortedLayers.length; i++) {
        const layer = sortedLayers[i];
        
        if (!layer.visible || layer.opacity <= 0) {
          continue;
        }

        // Render this layer on top of currentBuffer into nextBuffer
        nextBuffer.begin();
        p.clear();
        this._renderLayer(layer, currentBuffer);
        nextBuffer.end();

        // Swap buffers
        const temp = currentBuffer;
        currentBuffer = nextBuffer;
        nextBuffer = temp;
      }

      // Now render the final result to the main canvas
      p.push();

      // Clear the canvas if callback provided
      if (clearCallback) {
        clearCallback();
      } else {
        p.clear();
      }

      // Reset to default state
      p.resetShader();
      p.blendMode(p.BLEND);

      // Draw the accumulated result to the main canvas
      p.imageMode(p.CENTER);
      p.image(currentBuffer, 0, 0);

      p.pop();
    }

    /**
     * Disposes of compositor resources
     */
    dispose() {
      // Clean up ping-pong buffers
      if (this.bufferA) {
        this.bufferA.remove();
        this.bufferA = null;
      }
      if (this.bufferB) {
        this.bufferB.remove();
        this.bufferB = null;
      }
      this._bufferDensity = null;
      
      // p5.js doesn't have explicit shader disposal, but we can clear the reference
      this.shader = null;
      this.shaderLoaded = false;
    }
  }

  /**
   * Computes the tightest bounds that contain all pixels whose alpha exceeds the given threshold.
   * @param {Uint8ClampedArray} pixels - RGBA pixel data.
   * @param {number} width - Image width in pixels.
   * @param {number} height - Image height in pixels.
   * @param {Object} [options]
   * @param {number} [options.alphaThreshold=8] - Minimum alpha required to treat a pixel as visible.
   * @param {number} [options.stride=1] - Number of pixels to skip per step when scanning.
   * @returns {{x:number,y:number,width:number,height:number}|null}
   */
  function computeAlphaBounds(pixels, width, height, options = {}) {
    const threshold = Number.isFinite(options.alphaThreshold) ? options.alphaThreshold : 8;
    const stride = Number.isFinite(options.stride) && options.stride > 0 ? Math.floor(options.stride) : 1;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += stride) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x += stride) {
        const idx = rowOffset + x * 4;
        if (pixels[idx + 3] > threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX === -1 || maxY === -1) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }

  /**
   * Merges multiple bounds objects into their combined extents.
   * @param {Array<{x:number,y:number,width:number,height:number}|null>} boundsList
   * @returns {{x:number,y:number,width:number,height:number}|null}
   */
  function mergeBounds(boundsList) {
    if (!Array.isArray(boundsList) || boundsList.length === 0) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let found = false;

    for (const bounds of boundsList) {
      if (!bounds) {
        continue;
      }
      found = true;
      if (bounds.x < minX) minX = bounds.x;
      if (bounds.y < minY) minY = bounds.y;
      if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
      if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
    }

    if (!found) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY)
    };
  }

  /**
   * Ensures bounds stay inside the provided limits.
   * @param {{x:number,y:number,width:number,height:number}|null} bounds
   * @param {number} maxWidth
   * @param {number} maxHeight
   * @returns {{x:number,y:number,width:number,height:number}|null}
   */
  function clampBounds(bounds, maxWidth, maxHeight) {
    if (!bounds) {
      return null;
    }

    const x = Math.max(0, Math.min(bounds.x, maxWidth));
    const y = Math.max(0, Math.min(bounds.y, maxHeight));
    const width = Math.max(0, Math.min(bounds.width, maxWidth - x));
    const height = Math.max(0, Math.min(bounds.height, maxHeight - y));

    return { x, y, width, height };
  }

  /**
   * Expands bounds by padding while clamping to limits.
   * @param {{x:number,y:number,width:number,height:number}|null} bounds
   * @param {number} padding
   * @param {number} maxWidth
   * @param {number} maxHeight
   * @returns {{x:number,y:number,width:number,height:number}|null}
   */
  function padBounds(bounds, padding, maxWidth, maxHeight) {
    if (!bounds) {
      return null;
    }
    const padded = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2
    };
    return clampBounds(padded, maxWidth, maxHeight);
  }

  /**
   * LayerUI - A visual panel for displaying and controlling layers
   */
  class LayerUI {
    /**
     * @param {LayerSystem} layerSystem - The layer system to display
     * @param {Object} options - UI configuration options
     */
    constructor(layerSystem, options = {}) {
      this.layerSystem = layerSystem;
      this.options = {
        ...options,
        position: options.position || 'top-right',
        width: options.width || 280,
        collapsible: options.collapsible !== false,
        draggable: options.draggable !== false,
        thumbnailPadding: options.thumbnailPadding ?? 4,
        thumbnailSampleMaxSize: options.thumbnailSampleMaxSize ?? 196,
        thumbnailAlphaThreshold: options.thumbnailAlphaThreshold ?? 12,
        thumbnailAnimationWindow: options.thumbnailAnimationWindow ?? 6,
        thumbnailEmptyFrameReset: options.thumbnailEmptyFrameReset ?? 6,
        thumbnailSampleStride: options.thumbnailSampleStride ?? 1,
        thumbnailAutoUpdate: options.thumbnailAutoUpdate === true,
        thumbnailUpdateEvery: options.thumbnailUpdateEvery ?? 0
      };

      // Warn if thumbnailUpdateEvery is set but thumbnailAutoUpdate is false
      if (options.thumbnailUpdateEvery !== undefined && options.thumbnailUpdateEvery > 0 && !this.options.thumbnailAutoUpdate) {
        console.warn('p5.millefeuille: thumbnailUpdateEvery is set but thumbnailAutoUpdate is false. thumbnailUpdateEvery will be ignored. Set thumbnailAutoUpdate: true to enable automatic thumbnail updates.');
      }

      this.isCollapsed = false;
      this.container = null;
      this.layerElements = new Map(); // layerId -> DOM element
      this.selectedLayerId = null; // Currently selected layer
      this._dirtyThumbnailLayerIds = new Set();
      this._captureNeeded = new Set();
      this._thumbnailCache = new Map(); // layerId -> { image }
      this._thumbnailFlushHandle = null;
      this._cancelThumbnailFlush = null;
      this._thumbnailBatchSize = 1;
      this._thumbnailIdleBudgetMs = 8;
      this._thumbnailScratchCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      this._thumbnailScratchCtx = this._thumbnailScratchCanvas ? this._thumbnailScratchCanvas.getContext('2d') : null;
      if (this._thumbnailScratchCtx) {
        this._thumbnailScratchCtx.imageSmoothingEnabled = false;
      }
      // Lazy-initialized WEBGL buffer for GPU-to-GPU downsampling
      this._downsampleBuffer = null;

      this._checkerPatternCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      this._checkerPatternCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
      if (this._checkerPatternCanvas) {
        const size = 8;
        this._checkerPatternCanvas.width = size;
        this._checkerPatternCanvas.height = size;
        const checkerCtx = this._checkerPatternCanvas.getContext('2d');
        if (checkerCtx) {
          checkerCtx.fillStyle = '#333';
          checkerCtx.fillRect(0, 0, size, size);
          checkerCtx.fillStyle = '#444';
          checkerCtx.fillRect(0, 0, size / 2, size / 2);
          checkerCtx.fillRect(size / 2, size / 2, size / 2, size / 2);
        }
      }

      this._createUI();
      this._attachStyles();
    }

    /**
     * Creates the DOM structure for the UI panel
     * @private
     */
    _createUI() {
      // Create main container
      this.container = document.createElement('div');
      this.container.className = 'p5ml-layer-panel';
      this.container.style.width = `${this.options.width}px`;

      // Create header
      const header = document.createElement('div');
      header.className = 'p5ml-panel-header';
      header.innerHTML = `
      <span class="p5ml-panel-title">Layers</span>
      <div class="p5ml-header-controls">
        <button class="p5ml-arrow-btn p5ml-arrow-up" title="Move layer up">↑</button>
        <button class="p5ml-arrow-btn p5ml-arrow-down" title="Move layer down">↓</button>
        ${this.options.collapsible ? '<button class="p5ml-collapse-btn">−</button>' : ''}
      </div>
    `;
      this.container.appendChild(header);

      // Create layers container
      this.layersContainer = document.createElement('div');
      this.layersContainer.className = 'p5ml-layers-container';
      this.container.appendChild(this.layersContainer);

      // Add to document
      document.body.appendChild(this.container);

      // Position the panel
      this._positionPanel();

      // Get cleanup signal for event listeners
      const signal = this.layerSystem.p._removeSignal;

      // Add event listeners
      if (this.options.collapsible) {
        const collapseBtn = header.querySelector('.p5ml-collapse-btn');
        collapseBtn.addEventListener('click', () => this.toggle(), { signal });
        // Prevent collapse button from triggering drag
        collapseBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
      }

      // Arrow button handlers
      const upBtn = header.querySelector('.p5ml-arrow-up');
      const downBtn = header.querySelector('.p5ml-arrow-down');
      upBtn.addEventListener('click', () => this._moveSelectedLayer(-1), { signal });
      downBtn.addEventListener('click', () => this._moveSelectedLayer(1), { signal });
      // Prevent arrow buttons from triggering drag
      upBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
      downBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });

      // Make draggable if enabled
      if (this.options.draggable) {
        this._makeDraggable(header);
      }

      // Close dropdowns and deselect when clicking outside
      document.addEventListener('click', (e) => {
        // Check if click is outside the layer panel
        if (!this.container.contains(e.target)) {
          this._closeAllDropdowns();
          this._deselectLayer();
        }
      }, { signal });

      // Keyboard navigation for arrow keys
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
          return;
        }

        if (e.repeat || this.selectedLayerId === null) {
          return;
        }

        if (!this._isPanelVisible()) {
          return;
        }

        // Don't interfere if user is typing in an input field
        if (e.target.matches('input, select, textarea')) {
          return;
        }

        e.preventDefault();

        this._moveSelectedLayer(e.key === 'ArrowUp' ? -1 : 1);
      }, { signal });
    }

    /**
     * Closes all open layer dropdowns
     * @private
     */
    _closeAllDropdowns() {
      document.querySelectorAll('.p5ml-layer-dropdown').forEach(d => {
        d.style.display = 'none';
      });
    }

    /**
     * Positions the panel based on options
     * @private
     */
    _positionPanel() {
      const positions = {
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' }
      };

      const pos = positions[this.options.position] || positions['top-right'];
      Object.assign(this.container.style, pos);
    }

    /**
     * Determines if the panel is currently visible on screen
     * @private
     */
    _isPanelVisible() {
      if (!this.container || this.container.style.display === 'none') {
        return false;
      }
      return this.container.getClientRects().length > 0;
    }

    /**
     * Makes the panel draggable
     * @private
     */
    _makeDraggable(header) {
      let isDragging = false;
      let offsetX;
      let offsetY;

      header.style.cursor = 'move';

      const signal = this.layerSystem.p._removeSignal;

      header.addEventListener('mousedown', (e) => {
        // Get current position using getBoundingClientRect for accuracy
        const rect = this.container.getBoundingClientRect();
        
        // Calculate offset from mouse to panel's top-left corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        isDragging = true;

        // Clear all positioning properties and switch to left/top only
        this.container.style.right = '';
        this.container.style.bottom = '';
        this.container.style.left = rect.left + 'px';
        this.container.style.top = rect.top + 'px';
      });

      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          e.preventDefault();
          
          // Calculate new position
          let newX = e.clientX - offsetX;
          let newY = e.clientY - offsetY;

          // Get panel dimensions
          const panelWidth = this.container.offsetWidth;
          
          // Get viewport dimensions
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Constrain position to keep panel visible (with minimum 50px visible)
          const minVisible = 50;
          newX = Math.max(-panelWidth + minVisible, Math.min(newX, viewportWidth - minVisible));
          newY = Math.max(0, Math.min(newY, viewportHeight - minVisible));

          this.container.style.left = newX + 'px';
          this.container.style.top = newY + 'px';
        }
      }, { signal });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      }, { signal });
    }

    /**
     * Updates the UI to reflect current layer state
     */
    update() {
      const layers = this.layerSystem.getLayers();

      this._pruneThumbnailState(layers);

      // Clear existing layer elements
      this.layersContainer.innerHTML = '';
      this.layerElements.clear();

      // Create elements for each layer (reverse order so top layers appear first)
      const reversedLayers = [...layers].reverse();

      reversedLayers.forEach(layer => {
        const layerEl = this._createLayerElement(layer);
        this.layersContainer.appendChild(layerEl);
        this.layerElements.set(layer.id, layerEl);
      });

      // Initial thumbnail render is scheduled lazily to avoid blocking
      this._markThumbnailsDirty(reversedLayers.map(layer => layer.id), { needsCapture: true });
    }

    /**
     * Public helper so the LayerSystem can schedule updates when layer content changes
     * @param {number|string} layerId
     * @param {{needsCapture?: boolean}} options
     */
    scheduleThumbnailUpdate(layerId, options = {}) {
      this._markThumbnailsDirty([layerId], options);
    }

    /**
     * Synchronizes UI controls with current layer state without recreating elements
     */
    syncState() {
      const layers = this.layerSystem.getLayers();

      layers.forEach(layer => {
        const layerEl = this.layerElements.get(layer.id);
        if (!layerEl) return;

        // Update checkbox
        const checkbox = layerEl.querySelector('.p5ml-visibility-checkbox');
        if (checkbox) {
          checkbox.checked = layer.visible;
        }

        // Update opacity slider and value
        const opacitySlider = layerEl.querySelector('.p5ml-opacity-slider');
        const opacityValue = layerEl.querySelector('.p5ml-opacity-value');
        if (opacitySlider && opacityValue) {
          const opacityPercent = Math.round(layer.opacity * 100);
          opacitySlider.value = opacityPercent;
          opacityValue.textContent = opacityPercent + '%';
        }

        // Update blend mode select and indicator
        const blendSelect = layerEl.querySelector('.p5ml-blend-select');
        const blendIndicator = layerEl.querySelector('.p5ml-blend-indicator');
        if (blendSelect) {
          blendSelect.value = layer.blendMode;
        }
        if (blendIndicator) {
          blendIndicator.textContent = this._getBlendModeLetter(layer.blendMode);
          blendIndicator.title = `Blend Mode: ${layer.blendMode}`;
        }
      });

      // Thumbnails are only updated when clicked (not automatically)
    }

    /**
     * Updates all thumbnails
     * @private
     */
    _markThumbnailsDirty(layerIds = [], options = {}) {
      const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
      const needsCapture = !!options.needsCapture;
      let shouldSchedule = false;

      // Determine if this frame should trigger an update based on settings
      // If thumbnailAutoUpdate is false, no automatic updates (thumbnailUpdateEvery is ignored)
      // If thumbnailAutoUpdate is true and thumbnailUpdateEvery is not set (0), update every frame
      // If thumbnailAutoUpdate is true and thumbnailUpdateEvery > 0, update every N frames
      let isUpdateFrame = false;
      if (this.options.thumbnailAutoUpdate && needsCapture) {
        const updateEvery = this.options.thumbnailUpdateEvery;
        if (updateEvery <= 0) {
          // Default to every frame when thumbnailAutoUpdate is true but thumbnailUpdateEvery not set
          isUpdateFrame = true;
        } else {
          // Use p5's frameCount to determine update frames consistently across all layers
          const frameCount = this.layerSystem.p.frameCount || 0;
          isUpdateFrame = frameCount % updateEvery === 0;
        }
      }

      ids.forEach(id => {
        if (id === null || id === undefined) {
          return;
        }

        const cacheEntry = this._thumbnailCache.get(id);
        const hasThumbnail = !!(cacheEntry && cacheEntry.image);

        // Without auto updates, skip automatic updates for existing thumbnails.
        // Thumbnails will only update when user clicks the layer row.
        if (!isUpdateFrame && hasThumbnail && needsCapture) {
          return;
        }

        this._dirtyThumbnailLayerIds.add(id);
        if (needsCapture) {
          this._captureNeeded.add(id);
        }

        // Schedule flush if auto updates enabled, or if first capture needed
        if (isUpdateFrame || (!hasThumbnail && needsCapture)) {
          shouldSchedule = true;
        }
      });

      if (!shouldSchedule) {
        return;
      }
      this._scheduleThumbnailFlush();
    }

    /**
     * Removes cached thumbnail data for layers that no longer exist
     * @private
     */
    _pruneThumbnailState(activeLayers) {
      const liveIds = new Set(activeLayers.map(layer => layer.id));

      for (const id of Array.from(this._thumbnailCache.keys())) {
        if (!liveIds.has(id)) {
          this._thumbnailCache.delete(id);
        }
      }

      for (const id of Array.from(this._captureNeeded)) {
        if (!liveIds.has(id)) {
          this._captureNeeded.delete(id);
        }
      }

      for (const id of Array.from(this._dirtyThumbnailLayerIds)) {
        if (!liveIds.has(id)) {
          this._dirtyThumbnailLayerIds.delete(id);
        }
      }
    }

    /**
     * Processes a small batch of dirty thumbnails on each animation frame
     * @private
     */
    _flushDirtyThumbnails(deadline) {
      if (this._dirtyThumbnailLayerIds.size === 0) {
        return;
      }

      const hasPerformanceNow = typeof performance !== 'undefined' && typeof performance.now === 'function';
      const start = hasPerformanceNow ? performance.now() : null;

      const timeRemaining = (deadline && typeof deadline.timeRemaining === 'function')
        ? () => deadline.timeRemaining()
        : () => {
          if (!hasPerformanceNow || start === null) {
            return Number.POSITIVE_INFINITY;
          }
          const elapsed = performance.now() - start;
          return Math.max(0, this._thumbnailIdleBudgetMs - elapsed);
        };

      const shouldYield = () => timeRemaining() <= 1;

      let processed = 0;
      while (this._dirtyThumbnailLayerIds.size > 0) {
        if (processed >= this._thumbnailBatchSize) {
          break;
        }

        const iterator = this._dirtyThumbnailLayerIds.values().next();
        if (iterator.done) {
          break;
        }
        const layerId = iterator.value;
        this._dirtyThumbnailLayerIds.delete(layerId);
        this._updateLayerThumbnail(layerId);
        processed++;

        if (shouldYield()) {
          break;
        }
      }
    }

    /**
     * Schedules a flush using requestIdleCallback/requestAnimationFrame fallback
     * @private
     */
    _scheduleThumbnailFlush() {
      if (this._thumbnailFlushHandle !== null || this._dirtyThumbnailLayerIds.size === 0) {
        return;
      }

      const flushCallback = (deadline) => {
        this._thumbnailFlushHandle = null;
        this._cancelThumbnailFlush = null;
        this._flushDirtyThumbnails(deadline);
        if (this._dirtyThumbnailLayerIds.size > 0) {
          this._scheduleThumbnailFlush();
        }
      };

      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        this._thumbnailFlushHandle = window.requestIdleCallback(flushCallback);
        this._cancelThumbnailFlush = (handle) => window.cancelIdleCallback(handle);
      } else if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        this._thumbnailFlushHandle = window.requestAnimationFrame(() => flushCallback());
        this._cancelThumbnailFlush = (handle) => window.cancelAnimationFrame(handle);
      } else {
        this._thumbnailFlushHandle = setTimeout(() => flushCallback(), 16);
        this._cancelThumbnailFlush = (handle) => clearTimeout(handle);
      }
    }

    /**
     * Updates thumbnails for a specific layer
     * @private
     */
    _updateLayerThumbnail(layerId) {
      this._dirtyThumbnailLayerIds.delete(layerId);
      const layer = this.layerSystem.getLayers().find(l => l.id === layerId);
      if (!layer) return;

      const layerEl = this.layerElements.get(layerId);
      if (!layerEl) return;

      const canvas = layerEl.querySelector('.p5ml-thumbnail-canvas');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const cacheEntry = this._getOrCreateThumbnailCacheEntry(layerId);
      let sourceCanvas = cacheEntry.image && cacheEntry.image.canvas ? cacheEntry.image.canvas : null;
      const needsCapture = this._captureNeeded.has(layerId) || !sourceCanvas;

      if (needsCapture) {
        const captured = this._captureLayerImage(layer);
        if (captured && captured.canvas) {
          cacheEntry.image = captured;
          sourceCanvas = captured.canvas;
          cacheEntry.boundsDirty = true;
          this._captureNeeded.delete(layerId);
        }
      }

      if (!sourceCanvas) {
        return;
      }

      const previousSize = cacheEntry.lastSourceSize;
      if (!previousSize || previousSize.width !== sourceCanvas.width || previousSize.height !== sourceCanvas.height) {
        cacheEntry.window = [];
      }
      cacheEntry.lastSourceSize = { width: sourceCanvas.width, height: sourceCanvas.height };

      if (this._thumbnailScratchCtx && (cacheEntry.boundsDirty || !cacheEntry.drawBounds)) {
        const rawBounds = this._calculateBoundsFromCanvas(sourceCanvas);
        // If first capture is empty, don't cache it - allow future updates
        if (!rawBounds && !cacheEntry.drawBounds) {
          cacheEntry.image = null;
          return;
        }
        this._applyBoundsToCache(cacheEntry, rawBounds, sourceCanvas);
        cacheEntry.boundsDirty = false;
      } else if (!cacheEntry.drawBounds) {
        cacheEntry.drawBounds = this._createFullBounds(sourceCanvas);
        cacheEntry.boundsDirty = false;
      }

      const drawBounds = cacheEntry.drawBounds || this._createFullBounds(sourceCanvas);

      const cropAmount = this._getCropAmount(sourceCanvas, drawBounds);
      this._drawCheckerboard(ctx, canvas.width, canvas.height, cropAmount);
      this._drawThumbnailImage(ctx, canvas, sourceCanvas, drawBounds);
    }

    _getOrCreateThumbnailCacheEntry(layerId) {
      if (!this._thumbnailCache.has(layerId)) {
        this._thumbnailCache.set(layerId, {
          image: null,
          boundsDirty: false,
          window: [],
          emptyFrames: 0,
          drawBounds: null,
          lastSourceSize: null
        });
      }
      return this._thumbnailCache.get(layerId);
    }

    /**
     * Lazily initializes a framebuffer for GPU-to-GPU downsampling.
     * Uses p5.Framebuffer to stay in the same WebGL context as source framebuffers.
     * @private
     */
    _getDownsampleBuffer(width, height) {
      const p = this.layerSystem.p;
      if (!p || typeof p.createFramebuffer !== 'function') {
        return null;
      }

      // Create or resize the buffer as needed
      if (!this._downsampleBuffer) {
        try {
          this._downsampleBuffer = p.createFramebuffer({
            width,
            height,
            density: 1,
            depthFormat: p.UNSIGNED_INT,
            textureFiltering: p.LINEAR
          });
        } catch (e) {
          console.debug('Could not create downsample framebuffer:', e);
          return null;
        }
      } else if (this._downsampleBuffer.width !== width || this._downsampleBuffer.height !== height) {
        this._downsampleBuffer.resize(width, height);
      }

      return this._downsampleBuffer;
    }

    /**
     * Captures a downsampled image from a framebuffer using GPU-to-GPU copy.
     * This avoids reading the full framebuffer, reducing readback from ~8MB to ~150KB.
     * @private
     */
    _captureLayerImage(layer) {
      const source = layer.framebuffer;
      if (!source) {
        return null;
      }

      const p = this.layerSystem.p;
      if (!p) {
        return null;
      }

      // Calculate downsampled dimensions
      const maxSize = Math.max(1, this.options.thumbnailSampleMaxSize);
      const sourceWidth = source.width || p.width;
      const sourceHeight = source.height || p.height;
      const largestSide = Math.max(sourceWidth, sourceHeight);
      const scale = largestSide > maxSize ? maxSize / largestSide : 1;
      const sampleWidth = Math.max(1, Math.round(sourceWidth * scale));
      const sampleHeight = Math.max(1, Math.round(sourceHeight * scale));

      try {
        const buffer = this._getDownsampleBuffer(sampleWidth, sampleHeight);
        if (!buffer) {
          // Fallback to direct get() if buffer creation failed
          if (typeof source.get === 'function') {
            return source.get();
          }
          return null;
        }

        // GPU-to-GPU copy: render source framebuffer to small buffer
        buffer.begin();
        p.clear();
        p.push();
        p.imageMode(p.CORNER);
        // Translate to top-left corner (WEBGL origin is center)
        p.translate(-sampleWidth / 2, -sampleHeight / 2);
        p.image(source, 0, 0, sampleWidth, sampleHeight);
        p.pop();
        buffer.end();

        // Small readback: only ~150KB instead of ~8MB
        const result = buffer.get();

        // Store original dimensions for bounds scaling
        result._originalWidth = sourceWidth;
        result._originalHeight = sourceHeight;

        return result;
      } catch (e) {
        console.debug('Could not capture downsampled thumbnail:', e);
        // Fallback to direct get()
        if (typeof source.get === 'function') {
          return source.get();
        }
        return null;
      }
    }

    _calculateBoundsFromCanvas(sourceCanvas) {
      if (!this._thumbnailScratchCtx || !sourceCanvas.width || !sourceCanvas.height) {
        return null;
      }

      const maxSize = Math.max(1, this.options.thumbnailSampleMaxSize);
      const largestSide = Math.max(sourceCanvas.width, sourceCanvas.height);
      const scale = largestSide > maxSize ? maxSize / largestSide : 1;
      const sampleWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
      const sampleHeight = Math.max(1, Math.round(sourceCanvas.height * scale));

      this._thumbnailScratchCanvas.width = sampleWidth;
      this._thumbnailScratchCanvas.height = sampleHeight;

      const ctx = this._thumbnailScratchCtx;
      ctx.clearRect(0, 0, sampleWidth, sampleHeight);
      ctx.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);

      let imageData;
      try {
        imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      } catch (e) {
        console.debug('Could not read thumbnail buffer:', e);
        return null;
      }

      const bounds = computeAlphaBounds(imageData.data, sampleWidth, sampleHeight, {
        alphaThreshold: this.options.thumbnailAlphaThreshold,
        stride: this.options.thumbnailSampleStride
      });

      if (!bounds) {
        return null;
      }

      const scaleX = sourceCanvas.width / sampleWidth;
      const scaleY = sourceCanvas.height / sampleHeight;
      return {
        x: bounds.x * scaleX,
        y: bounds.y * scaleY,
        width: bounds.width * scaleX,
        height: bounds.height * scaleY
      };
    }

    _applyBoundsToCache(cacheEntry, bounds, sourceSize) {
      if (!cacheEntry) {
        return;
      }

      // Only use sliding window smoothing when thumbnailAutoUpdate is true (every frame).
      // With irregular updates (thumbnailUpdateEvery or click-only), use bounds directly.
      const useSmoothing = this.options.thumbnailAutoUpdate;

      if (!useSmoothing) {
        // Direct mode: just use the current bounds with padding
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          cacheEntry.drawBounds = padBounds(
            bounds,
            this.options.thumbnailPadding,
            sourceSize.width,
            sourceSize.height
          );
        } else if (!cacheEntry.drawBounds) {
          cacheEntry.drawBounds = this._createFullBounds(sourceSize);
        }
        return;
      }

      // Smoothing mode: use sliding window for every-frame updates
      if (!cacheEntry.window) {
        cacheEntry.window = [];
      }

      if (bounds) {
        cacheEntry.window.push(bounds);
        const maxWindow = Math.max(1, this.options.thumbnailAnimationWindow || 0);
        while (cacheEntry.window.length > maxWindow) {
          cacheEntry.window.shift();
        }
        cacheEntry.emptyFrames = 0;
      } else {
        const resetLimit = Math.max(1, this.options.thumbnailEmptyFrameReset || 0);
        cacheEntry.emptyFrames = (cacheEntry.emptyFrames || 0) + 1;
        if (cacheEntry.emptyFrames >= resetLimit) {
          cacheEntry.window = [];
          cacheEntry.emptyFrames = resetLimit;
        }
      }

      const merged = mergeBounds(cacheEntry.window);
      const padded = merged
        ? padBounds(merged, this.options.thumbnailPadding, sourceSize.width, sourceSize.height)
        : null;

      if (padded && padded.width > 0 && padded.height > 0) {
        cacheEntry.drawBounds = padded;
      } else if (!cacheEntry.drawBounds) {
        cacheEntry.drawBounds = this._createFullBounds(sourceSize);
      }

      if (!cacheEntry.window.length) {
        cacheEntry.drawBounds = this._createFullBounds(sourceSize);
      }
    }

    _createFullBounds(sourceSize) {
      const width = sourceSize.width || 0;
      const height = sourceSize.height || 0;
      return { x: 0, y: 0, width, height };
    }

    /**
     * Returns a scalar in [0, 1] representing how tight the crop is.
     * 0 = no crop (full layer), 1 = extremely tight crop (tiny region)
     * @private
     */
    _getCropAmount(sourceCanvas, bounds) {
      if (!sourceCanvas || !bounds || bounds.width <= 0 || bounds.height <= 0) {
        return 0;
      }

      const layerWidth = sourceCanvas.width || 1;
      const layerHeight = sourceCanvas.height || 1;
      const areaLayer = layerWidth * layerHeight;
      const areaCrop = bounds.width * bounds.height;

      if (!Number.isFinite(areaLayer) || areaLayer <= 0) {
        return 0;
      }

      const visibleFraction = Math.max(0, Math.min(1, areaCrop / areaLayer));
      return 1 - visibleFraction;
    }

    _drawThumbnailImage(ctx, targetCanvas, sourceCanvas, bounds) {
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      // Always fit the cropped region into the thumbnail while preserving aspect
      const scale = Math.min(
        targetCanvas.width / bounds.width,
        targetCanvas.height / bounds.height
      );

      const destWidth = Math.max(1, bounds.width * scale);
      const destHeight = Math.max(1, bounds.height * scale);
      const destX = (targetCanvas.width - destWidth) / 2;
      const destY = (targetCanvas.height - destHeight) / 2;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sourceCanvas,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        destX,
        destY,
        destWidth,
        destHeight
      );
      ctx.restore();
    }

    /**
     * Creates a DOM element for a single layer
     * @private
     */
    _createLayerElement(layer) {
      const layerEl = document.createElement('div');
      layerEl.className = 'p5ml-layer-item';
      layerEl.dataset.layerId = layer.id;

      // Add click handler to select layer and update thumbnail
      const signal = this.layerSystem.p._removeSignal;
      layerEl.addEventListener('click', (e) => {
        // Close all dropdowns when clicking on the layer row itself
        if (e.target.classList.contains('p5ml-layer-row') ||
            e.target.classList.contains('p5ml-layer-name') ||
            e.target.classList.contains('p5ml-layer-thumbnail') ||
            e.target.classList.contains('p5ml-thumbnail-canvas')) {
          this._closeAllDropdowns();
          this._selectLayer(layer.id);
          // Force capture on click so thumbnail updates with current layer content
          this._captureNeeded.add(layer.id);
          this._updateLayerThumbnail(layer.id);
        }
      }, { signal });

      // Main layer row (Procreate style: thumbnail | name | blend letter | checkbox)
      const layerRow = document.createElement('div');
      layerRow.className = 'p5ml-layer-row';

      // Left: Thumbnail
      const thumbnail = this._createThumbnail();
      thumbnail.className = 'p5ml-layer-thumbnail';
      layerRow.appendChild(thumbnail);

      // Center: Layer name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'p5ml-layer-name';
      nameSpan.textContent = layer.name;
      layerRow.appendChild(nameSpan);

      // Right side controls container
      const rightControls = document.createElement('div');
      rightControls.className = 'p5ml-right-controls';

      // Blend mode letter indicator (clickable)
      const blendIndicator = document.createElement('button');
      blendIndicator.className = 'p5ml-blend-indicator';
      blendIndicator.textContent = this._getBlendModeLetter(layer.blendMode);
      blendIndicator.title = `Blend Mode: ${layer.blendMode}`;
      blendIndicator.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = layerEl.querySelector('.p5ml-layer-dropdown');
        const isExpanded = dropdown.style.display === 'block';

        // Close all other dropdowns first
        this._closeAllDropdowns();

        // Toggle this dropdown (if it wasn't already open)
        dropdown.style.display = isExpanded ? 'none' : 'block';
      }, { signal });

      // Visibility checkbox
      const visibilityCheckbox = document.createElement('input');
      visibilityCheckbox.type = 'checkbox';
      visibilityCheckbox.className = 'p5ml-visibility-checkbox';
      visibilityCheckbox.checked = layer.visible;
      visibilityCheckbox.title = 'Toggle visibility';
      visibilityCheckbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          this.layerSystem.show(layer.id);
        } else {
          this.layerSystem.hide(layer.id);
        }
      }, { signal });

      rightControls.appendChild(blendIndicator);
      rightControls.appendChild(visibilityCheckbox);
      layerRow.appendChild(rightControls);

      // Dropdown panel (hidden by default, shown when blend indicator is clicked)
      const dropdown = document.createElement('div');
      dropdown.className = 'p5ml-layer-dropdown';
      dropdown.style.display = 'none';

      // Opacity control
      const opacityGroup = document.createElement('div');
      opacityGroup.className = 'p5ml-control-group';

      const opacityLabel = document.createElement('label');
      opacityLabel.textContent = 'OPACITY';

      const opacityValue = document.createElement('span');
      opacityValue.className = 'p5ml-opacity-value';
      opacityValue.textContent = Math.round(layer.opacity * 100) + '%';

      const opacitySlider = document.createElement('input');
      opacitySlider.type = 'range';
      opacitySlider.min = '0';
      opacitySlider.max = '100';
      opacitySlider.value = Math.round(layer.opacity * 100);
      opacitySlider.className = 'p5ml-opacity-slider';
      opacitySlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const value = parseFloat(e.target.value) / 100;
        this.layerSystem.setOpacity(layer.id, value);
        opacityValue.textContent = e.target.value + '%';
      }, { signal });

      opacityGroup.appendChild(opacityLabel);
      opacityGroup.appendChild(opacityValue);
      opacityGroup.appendChild(opacitySlider);

      // Blend mode control
      const blendGroup = document.createElement('div');
      blendGroup.className = 'p5ml-control-group';

      const blendLabel = document.createElement('label');
      blendLabel.textContent = 'BLEND MODE';

      const blendSelect = document.createElement('select');
      blendSelect.className = 'p5ml-blend-select';

      Object.values(BlendModes).forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        option.textContent = this._formatBlendModeName(mode);
        option.selected = layer.blendMode === mode;
        blendSelect.appendChild(option);
      });

      blendSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        this.layerSystem.setBlendMode(layer.id, e.target.value);
        blendIndicator.textContent = this._getBlendModeLetter(e.target.value);
        blendIndicator.title = `Blend Mode: ${e.target.value}`;
      }, { signal });

      blendGroup.appendChild(blendLabel);
      blendGroup.appendChild(blendSelect);

      dropdown.appendChild(opacityGroup);
      dropdown.appendChild(blendGroup);

      // Assemble layer element
      layerEl.appendChild(layerRow);
      layerEl.appendChild(dropdown);

      return layerEl;
    }

    /**
     * Gets a single letter representing the blend mode
     * @private
     */
    _getBlendModeLetter(blendMode) {
      const letters = {
        [BlendModes.NORMAL]: 'N',
        [BlendModes.MULTIPLY]: 'M',
        [BlendModes.SCREEN]: 'S',
        [BlendModes.OVERLAY]: 'O',
        [BlendModes.DARKEN]: 'D',
        [BlendModes.LIGHTEN]: 'Li',
        [BlendModes.COLOR_DODGE]: 'Cd',
        [BlendModes.COLOR_BURN]: 'B',
        [BlendModes.HARD_LIGHT]: 'HL',
        [BlendModes.SOFT_LIGHT]: 'SL',
        [BlendModes.DIFFERENCE]: 'Di',
        [BlendModes.EXCLUSION]: 'E',
        [BlendModes.ADD]: 'A',
        [BlendModes.SUBTRACT]: 'Su',
      };
      return letters[blendMode] || '-';
    }

    /**
     * Formats blend mode name for display
     * @private
     */
    _formatBlendModeName(mode) {
      // Convert BLEND_MODE to "Blend Mode"
      return mode.split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }

    /**
     * Creates a thumbnail canvas for a framebuffer or image
     * @private
     */
    _createThumbnail() {
      const container = document.createElement('div');
      container.className = 'p5ml-thumbnail';

      const canvas = document.createElement('canvas');
      canvas.className = 'p5ml-thumbnail-canvas';
      canvas.width = 60;
      canvas.height = 60;

      const ctx = canvas.getContext('2d');

      // Draw a checkerboard background for transparency
      this._drawCheckerboard(ctx, canvas.width, canvas.height);

      container.appendChild(canvas);
      return container;
    }


    /**
     * Draws a checkerboard pattern for transparency background
     * @private
     */
    _drawCheckerboard(ctx, width, height, cropAmount = 0) {
      if (!ctx) {
        return;
      }

      const pattern = this._getCheckerPattern(ctx);
      const scale = this._getCheckerboardScale(cropAmount);

      if (pattern && typeof ctx.save === 'function') {
        ctx.save();
        ctx.fillStyle = pattern;
        const cx = width / 2;
        const cy = height / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        return;
      }

      // Fallback: discrete checkerboard (used in tests/mocks without pattern support)
      const baseSize = 8;
      const squareSize = Math.max(2, Math.round(baseSize * scale));
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#444';

      for (let y = 0; y < height; y += squareSize) {
        for (let x = 0; x < width; x += squareSize) {
          if ((x / squareSize + y / squareSize) % 2 === 0) {
            ctx.fillRect(x, y, squareSize, squareSize);
          }
        }
      }
    }

    _getCheckerboardScale(cropAmount = 0) {
      const t = Math.max(0, Math.min(1, Number.isFinite(cropAmount) ? cropAmount : 0));
      return 1 + t * 1.2; // Scale from 1.0 to 2.2 based on crop
    }

    _getCheckerPattern(ctx) {
      if (!ctx || !this._checkerPatternCanvas || typeof ctx.createPattern !== 'function') {
        return null;
      }

      if (this._checkerPatternCache && this._checkerPatternCache.has(ctx)) {
        return this._checkerPatternCache.get(ctx);
      }

      const pattern = ctx.createPattern(this._checkerPatternCanvas, 'repeat');
      if (pattern && this._checkerPatternCache) {
        this._checkerPatternCache.set(ctx, pattern);
      }
      return pattern;
    }

    /**
     * Selects a layer
     * @private
     */
    _selectLayer(layerId) {
      this.selectedLayerId = layerId;

      // Update visual selection state
      const elements = document.querySelectorAll('.p5ml-layer-item');

      elements.forEach(el => {
        // Convert both to strings for comparison (dataset values are always strings)
        if (el.dataset.layerId == layerId) {
          el.classList.add('p5ml-selected');
          // Force bright blue background with inline style
          el.style.background = '#3a7bc8';
          el.style.borderLeft = '3px solid #5dade2';
        } else {
          el.classList.remove('p5ml-selected');
          // Remove inline styles
          el.style.background = '';
          el.style.borderLeft = '';
        }
      });
    }

    /**
     * Deselects the currently selected layer
     * @private
     */
    _deselectLayer() {
      this.selectedLayerId = null;

      // Remove visual selection state from all layers
      document.querySelectorAll('.p5ml-layer-item').forEach(el => {
        el.classList.remove('p5ml-selected');
        // Remove inline styles
        el.style.background = '';
        el.style.borderLeft = '';
      });
    }

    /**
     * Moves the selected layer up or down in the stack
     * @private
     * @param {number} direction - -1 for up (higher in stack), 1 for down (lower in stack)
     */
    _moveSelectedLayer(direction) {
      if (this.selectedLayerId === null) return;

      const layers = this.layerSystem.getLayers();
      const currentIndex = layers.findIndex(l => l.id === this.selectedLayerId);

      if (currentIndex === -1) return;

      // Calculate new index (remember layers are in bottom-to-top order)
      // direction -1 means "up" which is higher index
      // direction 1 means "down" which is lower index
      const newIndex = currentIndex - direction;

      // Check bounds
      if (newIndex < 0 || newIndex >= layers.length) return;

      // Swap layers
      const targetLayer = layers[newIndex];

      // Swap entries inside the layer array
      [layers[currentIndex], layers[newIndex]] = [layers[newIndex], layers[currentIndex]];

      // Move only the affected DOM nodes instead of rebuilding the entire list
      const selectedElement = this.layerElements.get(this.selectedLayerId);
      const targetElement = this.layerElements.get(targetLayer.id);
      if (selectedElement && targetElement && this.layersContainer) {
        if (direction === -1) {
          this.layersContainer.insertBefore(selectedElement, targetElement);
        } else {
          const nextNode = targetElement.nextSibling;
          this.layersContainer.insertBefore(selectedElement, nextNode);
        }
      }

      // Only the swapped layers need their thumbnails refreshed
      this._markThumbnailsDirty([this.selectedLayerId, targetLayer.id]);

      // Update the layer system's internal order
      if (typeof this.layerSystem.reorderLayers === 'function') {
        this.layerSystem.reorderLayers(layers);
      }

      // Re-select the layer to keep the highlight consistent
      this._selectLayer(this.selectedLayerId);
    }

    /**
     * Attaches CSS styles to the document
     * @private
     */
    _attachStyles() {
      // Check if styles already exist
      if (document.getElementById('p5ml-layer-ui-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'p5ml-layer-ui-styles';
      style.textContent = `
      .p5ml-layer-panel {
        position: fixed;
        background: rgba(26, 26, 26, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #e0e0e0;
        z-index: 10000;
        backdrop-filter: blur(10px);
        overflow: hidden;
      }

      .p5ml-layer-panel.collapsed .p5ml-layers-container {
        display: none;
      }

      .p5ml-panel-header {
        background: rgba(60, 60, 60, 0.9);
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      }

      .p5ml-panel-title {
        font-weight: 600;
        font-size: 16px;
        letter-spacing: 0.5px;
        color: #ccc;
      }

      .p5ml-header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .p5ml-arrow-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #e8e8e8;
        font-size: 16px;
        cursor: pointer;
        padding: 4px 8px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }

      .p5ml-arrow-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .p5ml-arrow-btn:active {
        background: rgba(255, 255, 255, 0.2);
      }

      .p5ml-collapse-btn {
        background: none;
        border: none;
        color: #aaa;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .p5ml-collapse-btn:hover {
        color: #fff;
      }

      .p5ml-layers-container {
        max-height: 500px;
        overflow-y: auto;
        padding: 0;
        background: #2a2a2a;
      }

      .p5ml-layers-container::-webkit-scrollbar {
        width: 8px;
      }

      .p5ml-layers-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }

      .p5ml-layers-container::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .p5ml-layers-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Procreate-style layer item */
      .p5ml-layer-item {
        background: transparent;
        border-bottom: 1px solid #3a3a3a;
        transition: background 0.15s ease;
        cursor: pointer;
      }

      .p5ml-layer-item:hover {
        background: rgba(100, 150, 255, 0.15);
      }

      /* Selected state */
      .p5ml-layer-item.p5ml-selected {
        background: #3a7bc8 !important;
        border-left: 3px solid #5dade2;
      }

      .p5ml-layer-item.p5ml-selected:hover {
        background: #4a8dd8 !important;
      }

      .p5ml-layer-item.p5ml-selected .p5ml-layer-row {
        background: transparent;
      }

      /* Main layer row (horizontal layout) */
      .p5ml-layer-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
      }

      /* Thumbnail on the left */
      .p5ml-layer-thumbnail {
        flex-shrink: 0;
      }

      .p5ml-layer-thumbnail canvas {
        display: block;
        width: 60px;
        height: 60px;
        border: 1px solid #555;
        border-radius: 4px;
        image-rendering: pixelated;
      }

      /* Layer name in center */
      .p5ml-layer-name {
        flex: 1;
        font-weight: 500;
        font-size: 15px;
        color: #e8e8e8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Right side controls */
      .p5ml-right-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      /* Blend mode letter indicator */
      .p5ml-blend-indicator {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e8e8e8;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s;
        pointer-events: auto;
      }

      .p5ml-blend-indicator:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }

      /* Visibility checkbox */
      .p5ml-visibility-checkbox {
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: #4a90e2;
        pointer-events: auto;
      }

      /* Dropdown panel for opacity and blend mode */
      .p5ml-layer-dropdown {
        background: rgba(40, 40, 40, 0.95);
        border-top: 1px solid #555;
        padding: 16px;
        display: none;
      }

      .p5ml-control-group {
        margin-bottom: 16px;
      }

      .p5ml-control-group:last-child {
        margin-bottom: 0;
      }

      .p5ml-control-group label {
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .p5ml-opacity-value {
        color: #e0e0e0;
        font-weight: 600;
      }

      .p5ml-opacity-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        background: rgba(255, 255, 255, 0.15);
        margin-top: 4px;
      }

      .p5ml-opacity-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      }

      .p5ml-opacity-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
      }

      .p5ml-blend-select {
        width: 100%;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #555;
        border-radius: 6px;
        color: #e8e8e8;
        padding: 10px 12px;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        margin-top: 4px;
      }

      .p5ml-blend-select:hover {
        border-color: #777;
        background: rgba(0, 0, 0, 0.5);
      }

      .p5ml-blend-select option {
        background: #2a2a2a;
        color: #e8e8e8;
        padding: 8px;
      }

      /* Hide old thumbnail styles - no longer used */
      .p5ml-thumbnail-label {
        display: none;
      }
    `;

      document.head.appendChild(style);
    }

    /**
     * Toggles the collapsed state of the panel
     */
    toggle() {
      this.isCollapsed = !this.isCollapsed;
      this.container.classList.toggle('collapsed', this.isCollapsed);

      const btn = this.container.querySelector('.p5ml-collapse-btn');
      if (btn) {
        btn.innerHTML = this.isCollapsed ? '+' : '−';
      }
    }

    /**
     * Shows the panel
     */
    show() {
      this.container.style.display = 'block';
    }

    /**
     * Hides the panel
     */
    hide() {
      this.container.style.display = 'none';
    }

    /**
     * Removes the panel from the DOM
     */
    dispose() {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }

      if (this._cancelThumbnailFlush && this._thumbnailFlushHandle !== null) {
        this._cancelThumbnailFlush(this._thumbnailFlushHandle);
      }
      this._dirtyThumbnailLayerIds.clear();
      this._captureNeeded.clear();
      this._thumbnailCache.clear();
      this._thumbnailFlushHandle = null;
      this._cancelThumbnailFlush = null;
      this._thumbnailScratchCanvas = null;
      this._thumbnailScratchCtx = null;
    }
  }

  /**
   * Main layer system manager
   */
  class LayerSystem {
    /**
     * @param {p5} p5Instance - The p5.js instance
     */
    constructor(p5Instance) {
      this.p = p5Instance;

      // Validate WebGL mode
      if (!this.p._renderer || !this.p._renderer.drawingContext) {
        throw new Error('Canvas not initialized. Make sure createCanvas() is called before createLayerSystem()');
      }

      if (this.p._renderer.drawingContext instanceof WebGLRenderingContext ||
          this.p._renderer.drawingContext instanceof WebGL2RenderingContext) ; else {
        throw new Error('LayerSystem requires WebGL mode. Use createCanvas(w, h, WEBGL)');
      }

      this.layers = new Map(); // id -> Layer
      this.layerNames = new Map(); // name -> id (for string-based lookups)
      this.layerIdCounter = 0;
      this.activeLayerId = null;
      this.compositor = new Compositor(p5Instance);
      this.ui = null; // LayerUI instance

      // Track if we're auto-resizing
      this.autoResize = true;
      this._lastCanvasWidth = this.p.width;
      this._lastCanvasHeight = this.p.height;
      this._lastPixelDensity = this.p.pixelDensity();
    }

    /**
     * Generates a unique layer ID
     * @private
     */
    _generateId() {
      return this.layerIdCounter++;
    }

    /**
     * Gets a layer by ID or name
     * @private
     * @param {number|string} layerIdOrName - The layer ID (number) or name (string)
     * @returns {Layer|null} The layer, or null if not found
     */
    _getLayerById(layerIdOrName) {
      // If it's a number, look up directly by ID
      if (typeof layerIdOrName === 'number') {
        return this.layers.get(layerIdOrName) || null;
      }
      
      // If it's a string, look up by name first
      if (typeof layerIdOrName === 'string') {
        const id = this.layerNames.get(layerIdOrName);
        if (id !== undefined) {
          return this.layers.get(id) || null;
        }
      }
      
      return null;
    }

    /**
     * Creates a new layer
     * @param {string} name - Optional name for the layer
     * @param {Object} options - Layer configuration options
     * @returns {Layer} The created layer instance
     */
    createLayer(name = '', options = {}) {
      const id = this._generateId();
      const layerName = name || `Layer ${id}`;
      const layer = new Layer(this.p, id, layerName, {
        ...options,
        zIndex: options.zIndex !== undefined ? options.zIndex : id
      });

      this.layers.set(id, layer);
      
      // Register the name for string-based lookups
      if (layerName) {
        this.layerNames.set(layerName, id);
      }
      
      return layer;
    }

    /**
     * Removes a layer and disposes of its resources
     * @param {number|string} layerIdOrName - The ID or name of the layer to remove
     */
    removeLayer(layerIdOrName) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return;
      }

      // If this layer is currently active, end it
      if (this.activeLayerId === layer.id) {
        this.end();
      }

      // Remove from name map if it has a name
      if (layer.name) {
        this.layerNames.delete(layer.name);
      }

      layer.dispose();
      this.layers.delete(layer.id);
    }

    /**
     * Gets a layer by ID or name
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer, or null if not found
     */
    getLayer(layerIdOrName) {
      return this._getLayerById(layerIdOrName);
    }

    /**
     * Gets all layers as an array, sorted by zIndex
     * @returns {Layer[]} Array of layers
     */
    getLayers() {
      return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
    }

    /**
     * Gets layer information as plain objects
     * @returns {Object[]} Array of layer info objects
     */
    getLayerInfo() {
      return this.getLayers().map(layer => layer.toJSON());
    }

    /**
     * Begins drawing to a specific layer
     * @param {number|string} layerIdOrName - The ID or name of the layer to draw to
     */
    begin(layerIdOrName) {
      // Check if another layer is already active
      if (this.activeLayerId !== null) {
        console.warn(`Layer ${this.activeLayerId} is already active. Ending it first.`);
        this.end();
      }

      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.error(`Layer ${layerIdOrName} not found`);
        return;
      }

      layer.begin();
      this.activeLayerId = layer.id;
    }

    /**
     * Ends drawing to the current layer
     */
    end() {
      if (this.activeLayerId === null) {
        console.warn('No active layer to end');
        return;
      }

      const layer = this.layers.get(this.activeLayerId);
      if (layer) {
        layer.end();

        if (this.ui && typeof this.ui.scheduleThumbnailUpdate === 'function') {
          this.ui.scheduleThumbnailUpdate(layer.id, { needsCapture: true });
        }
      }

      this.activeLayerId = null;
    }

    /**
     * Shows a layer (makes it visible)
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    show(layerIdOrName) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.show();
    }

    /**
     * Hides a layer (makes it invisible)
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    hide(layerIdOrName) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.hide();
    }

    /**
     * Sets the opacity of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} opacity - Opacity value between 0 and 1
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setOpacity(layerIdOrName, opacity) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.setOpacity(opacity);
    }

    /**
     * Sets the blend mode of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {string} blendMode - One of the BlendModes constants
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setBlendMode(layerIdOrName, blendMode) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.setBlendMode(blendMode);
    }

    /**
     * Sets the z-index of a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} zIndex - The new z-index (higher = on top)
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setLayerIndex(layerIdOrName, zIndex) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.setZIndex(zIndex);
    }

    /**
     * Moves a layer by a relative amount in the stack
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {number} delta - The amount to move (positive = forward, negative = backward)
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    moveLayer(layerIdOrName, delta) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.setZIndex(layer.zIndex + delta);
    }

    /**
     * Reorders layers to match a new array order
     * @param {Layer[]} orderedLayers - Array of layers in the desired order
     */
    reorderLayers(orderedLayers) {
      // Update zIndex for each layer based on its position in the array
      orderedLayers.forEach((layer, index) => {
        layer.setZIndex(index);
      });
    }

    /**
     * Attaches a mask to a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @param {p5.Framebuffer|p5.Image} maskSource - The mask to apply
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    setMask(layerIdOrName, maskSource) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.setMask(maskSource);
    }

    /**
     * Removes the mask from a layer
     * @param {number|string} layerIdOrName - The layer ID or name
     * @returns {Layer|null} The layer for chaining, or null if not found
     */
    clearMask(layerIdOrName) {
      const layer = this._getLayerById(layerIdOrName);
      if (!layer) {
        console.warn(`Layer ${layerIdOrName} not found`);
        return null;
      }
      return layer.clearMask();
    }

    /**
     * Renders all layers to the main canvas
     * @param {Function} clearCallback - Optional callback to clear the canvas before rendering
     */
    render(clearCallback = null) {
      // Check for canvas resize
      if (this.autoResize) {
        this._checkResize();
      }

      const layers = this.getLayers();
      this.compositor.render(layers, clearCallback);

      // Sync UI state if UI exists
      if (this.ui) {
        this.ui.syncState();
      }
    }

    /**
     * Checks if canvas was resized and updates layers accordingly
     * @private
     */
    _checkResize() {
      const currentWidth = this.p.width;
      const currentHeight = this.p.height;
      const currentDensity = this.p.pixelDensity();

      const sizeChanged = currentWidth !== this._lastCanvasWidth ||
        currentHeight !== this._lastCanvasHeight;
      const densityChanged = currentDensity !== this._lastPixelDensity;

      if (!sizeChanged && !densityChanged) {
        return;
      }

      this._lastCanvasWidth = currentWidth;
      this._lastCanvasHeight = currentHeight;
      this._lastPixelDensity = currentDensity;

      // Resize all canvas-synced layers
      for (const layer of this.layers.values()) {
        if (!layer.customSize) {
          layer.resize(currentWidth, currentHeight, currentDensity);
        }
      }
    }

    /**
     * Enables or disables automatic layer resizing when canvas size changes
     * @param {boolean} enabled - Whether to enable auto-resize
     */
    setAutoResize(enabled) {
      this.autoResize = !!enabled;
    }

    /**
     * Creates and shows a UI panel for controlling layers
     * @param {Object} options - UI configuration options
     * @returns {LayerUI} The created UI instance
     */
    createUI(options = {}) {
      // Dispose existing UI if any
      if (this.ui) {
        this.ui.dispose();
      }

      this.ui = new LayerUI(this, options);
      this.ui.update();
      return this.ui;
    }

    /**
     * Updates the UI if it exists
     */
    updateUI() {
      if (this.ui) {
        this.ui.update();
      }
    }

    /**
     * Disposes of all layers and resources
     */
    dispose() {
      // End active layer if any
      if (this.activeLayerId !== null) {
        this.end();
      }

      // Dispose UI if exists
      if (this.ui) {
        this.ui.dispose();
        this.ui = null;
      }

      // Dispose all layers
      for (const layer of this.layers.values()) {
        layer.dispose();
      }

      this.layers.clear();
      this.compositor.dispose();
    }
  }

  /**
   * p5.millefeuille - A Photoshop-like layer system for p5.js WebGL
   *
   * @module p5.millefeuille
   */


  // Version
  const VERSION = '0.2.1';

  /**
   * p5.js addon registration function
   * @param {object} p5 - The p5 constructor
   * @param {object} fn - The p5 prototype
   * @param {object} lifecycles - Lifecycle hooks
   */
  function millefeuilleAddon(p5, fn, lifecycles) {
    // Attach createLayerSystem to p5 prototype
    fn.createLayerSystem = function(options = {}) {
      // 'this' is the p5 instance
      return new LayerSystem(this, options);
    };

    // Cleanup lifecycle - dispose layer system when sketch is removed
    if (lifecycles) {
      lifecycles.remove = function() {
        if (this._layerSystem) {
          this._layerSystem.dispose();
          this._layerSystem = null;
        }
      };
    }
  }

  // Auto-register for script tag usage
  if (typeof window !== 'undefined' && typeof window.p5 !== 'undefined') {
    window.p5.registerAddon(millefeuilleAddon);
    
    // Also expose common utilities globally for convenience
    window.BlendModes = BlendModes;
  }

  exports.BlendModes = BlendModes;
  exports.Compositor = Compositor;
  exports.DEFAULT_LAYER_OPTIONS = DEFAULT_LAYER_OPTIONS;
  exports.Layer = Layer;
  exports.LayerSystem = LayerSystem;
  exports.LayerUI = LayerUI;
  exports.VERSION = VERSION;
  exports.default = millefeuilleAddon;
  exports.getBlendModeIndex = getBlendModeIndex;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=p5.millefeuille.js.map
