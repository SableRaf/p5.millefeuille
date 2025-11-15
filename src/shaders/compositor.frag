precision highp float;

varying vec2 vTexCoord;

uniform sampler2D layerTexture;
uniform sampler2D maskTexture;
uniform bool hasMask;
uniform float layerOpacity;

void main() {
  // Flip y-coordinate for p5.js texture coordinate system
  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);

  // Sample the layer texture
  vec4 layerColor = texture2D(layerTexture, uv);

  // Calculate final opacity
  float finalOpacity = layerOpacity;

  // Apply mask if present
  if (hasMask) {
    vec4 maskColor = texture2D(maskTexture, uv);
    // Use the red channel of the mask as alpha (grayscale mask)
    // Could also use maskColor.a for alpha channel masks
    float maskValue = maskColor.r;
    finalOpacity *= maskValue;
  }

  // Apply opacity to the layer color (including RGB channels for proper alpha blending)
  // This ensures proper pre-multiplied alpha behavior
  layerColor.rgb *= finalOpacity;
  layerColor.a *= finalOpacity;

  gl_FragColor = layerColor;
}
