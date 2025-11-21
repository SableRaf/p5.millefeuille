precision highp float;

varying vec2 vTexCoord;

uniform sampler2D layerTexture;
uniform sampler2D backgroundTexture;
uniform sampler2D maskTexture;
uniform bool hasMask;
uniform float layerOpacity;
uniform int blendMode;

// Import glsl-blend functions
#pragma glslify: blendNormal = require(glsl-blend/normal)
#pragma glslify: blendMultiply = require(glsl-blend/multiply)
#pragma glslify: blendScreen = require(glsl-blend/screen)
#pragma glslify: blendAdd = require(glsl-blend/add)
#pragma glslify: blendSubtract = require(glsl-blend/subtract)
#pragma glslify: blendOverlay = require(glsl-blend/overlay)
#pragma glslify: blendSoftLight = require(glsl-blend/soft-light)
#pragma glslify: blendHardLight = require(glsl-blend/hard-light)
#pragma glslify: blendColorDodge = require(glsl-blend/color-dodge)
#pragma glslify: blendColorBurn = require(glsl-blend/color-burn)
#pragma glslify: blendDarken = require(glsl-blend/darken)
#pragma glslify: blendLighten = require(glsl-blend/lighten)
#pragma glslify: blendDifference = require(glsl-blend/difference)
#pragma glslify: blendExclusion = require(glsl-blend/exclusion)

vec3 applyBlendMode(int mode, vec3 base, vec3 blend, float opacity) {
  if (mode == 0) return blendNormal(base, blend, opacity);      // NORMAL
  if (mode == 1) return blendMultiply(base, blend, opacity);    // MULTIPLY
  if (mode == 2) return blendScreen(base, blend, opacity);      // SCREEN
  if (mode == 3) return blendAdd(base, blend, opacity);         // ADD
  if (mode == 4) return blendSubtract(base, blend, opacity);    // SUBTRACT
  if (mode == 5) return blendOverlay(base, blend, opacity);     // OVERLAY
  if (mode == 6) return blendSoftLight(base, blend, opacity);   // SOFT_LIGHT
  if (mode == 7) return blendHardLight(base, blend, opacity);   // HARD_LIGHT
  if (mode == 8) return blendColorDodge(base, blend, opacity);  // COLOR_DODGE
  if (mode == 9) return blendColorBurn(base, blend, opacity);   // COLOR_BURN
  if (mode == 10) return blendDarken(base, blend, opacity);     // DARKEN
  if (mode == 11) return blendLighten(base, blend, opacity);    // LIGHTEN
  if (mode == 12) return blendDifference(base, blend, opacity); // DIFFERENCE
  if (mode == 13) return blendExclusion(base, blend, opacity);  // EXCLUSION
  return blendNormal(base, blend, opacity); // Fallback
}

void main() {
  // Flip y-coordinate for p5.js texture coordinate system
  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);

  // Sample textures
  vec4 layerColor = texture2D(layerTexture, uv);
  vec4 bgColor = texture2D(backgroundTexture, uv);

  // Calculate final opacity
  float finalOpacity = layerOpacity;

  // Apply mask if present
  if (hasMask) {
    vec4 maskColor = texture2D(maskTexture, uv);
    float maskValue = maskColor.r;
    finalOpacity *= maskValue;
  }

  // Apply blend mode
  vec3 blendedColor = applyBlendMode(blendMode, bgColor.rgb, layerColor.rgb, finalOpacity);

  // Output with original alpha handling
  gl_FragColor = vec4(blendedColor, 1.0);
}
