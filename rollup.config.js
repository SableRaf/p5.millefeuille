import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import glslify from 'rollup-plugin-glslify';
import { readFileSync } from 'fs';

// Plugin to inline shader files as strings (now with glslify processing)
function shaderPlugin() {
  return {
    name: 'shader-loader',
    transform(code, id) {
      if (id.endsWith('.vert') || id.endsWith('.frag')) {
        // Shader files are already processed by glslify plugin
        // This plugin is now just for compatibility
        return null;
      }
    }
  };
}

const banner = `/**
 * p5.millefeuille v${JSON.parse(readFileSync('./package.json')).version}
 * A Photoshop-like layer system for p5.js WebGL
 * https://github.com/yourusername/p5.millefeuille
 *
 * Licensed under LGPL-2.1
 */`;

export default [
  // UMD build for browsers
  {
    input: 'src/index.js',
    output: {
      file: 'dist/p5.millefeuille.js',
      format: 'umd',
      name: 'p5Millefeuille',
      banner,
      globals: {
        p5: 'p5'
      }
    },
    external: ['p5'],
    plugins: [
      glslify({
        include: ['**/*.frag', '**/*.vert'],
        compress: false
      }),
      shaderPlugin(),
      nodeResolve()
    ]
  },
  // Minified UMD build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/p5.millefeuille.min.js',
      format: 'umd',
      name: 'p5Millefeuille',
      banner,
      globals: {
        p5: 'p5'
      }
    },
    external: ['p5'],
    plugins: [
      glslify({
        include: ['**/*.frag', '**/*.vert'],
        compress: false
      }),
      shaderPlugin(),
      nodeResolve(),
      terser({
        format: {
          comments: /^!/
        }
      })
    ]
  },
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/p5.millefeuille.esm.js',
      format: 'es',
      banner
    },
    external: ['p5'],
    plugins: [
      glslify({
        include: ['**/*.frag', '**/*.vert'],
        compress: false
      }),
      shaderPlugin(),
      nodeResolve()
    ]
  }
];
