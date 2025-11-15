import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

// Plugin to inline shader files as strings
function shaderPlugin() {
  return {
    name: 'shader-loader',
    transform(code, id) {
      if (id.endsWith('.vert') || id.endsWith('.frag')) {
        // Read shader file and export as string
        const shaderCode = readFileSync(id, 'utf-8');
        return {
          code: `export default ${JSON.stringify(shaderCode)};`,
          map: { mappings: '' }
        };
      }
    }
  };
}

const banner = `/**
 * p5.millefeuille v${JSON.parse(readFileSync('./package.json')).version}
 * A Photoshop-like layer system for p5.js WebGL
 * https://github.com/yourusername/p5.millefeuille
 *
 * Licensed under MIT
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
      shaderPlugin(),
      nodeResolve()
    ]
  }
];
