const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const fs = require('fs');

module.exports = {
  mode: 'production',
  // Dummy entry point - we're just processing HTML and copying files
  entry: './.webpack-dummy.js',
  output: {
    path: path.resolve(__dirname, '.gh-pages'),
    filename: '.dummy.js', // Will be ignored
    clean: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      __BUILD_TIMESTAMP__: Date.now(),
    }),
    // Main examples index page
    new HtmlWebpackPlugin({
      template: './examples/index.html',
      filename: 'index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        const template = fs.readFileSync('./examples/index.html', 'utf-8');
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

        // Generate version options from publishedVersions array
        const versions = pkg.publishedVersions || [pkg.version];
        const versionOptions = versions.map(v =>
          `<option value="${v}">${v}</option>`
        ).join('\n              ');

        // Replace placeholder with actual version options
        return template.replace(
          '<!-- VERSIONS_PLACEHOLDER -->',
          versionOptions
        );
      },
    }),
    // Individual example pages
    new HtmlWebpackPlugin({
      template: './examples/01-basic/index.html',
      filename: '01-basic/index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        const template = fs.readFileSync('./examples/01-basic/index.html', 'utf-8');
        const timestampScript = fs.readFileSync('./src/utils/buildTimestamp.js', 'utf-8');
        let html = template.replace(/\.\.\/(\.\.\/)??(dist|lib)\//g, '../lib/');
        html = html.replace('</head>', `  <script>${timestampScript}</script>\n</head>`);
        return html;
      },
    }),
    new HtmlWebpackPlugin({
      template: './examples/02-blend-modes/index.html',
      filename: '02-blend-modes/index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        const template = fs.readFileSync('./examples/02-blend-modes/index.html', 'utf-8');
        const timestampScript = fs.readFileSync('./src/utils/buildTimestamp.js', 'utf-8');
        let html = template.replace(/\.\.\/(\.\.\/)??(dist|lib)\//g, '../lib/');
        html = html.replace('</head>', `  <script>${timestampScript}</script>\n</head>`);
        return html;
      },
    }),
    new HtmlWebpackPlugin({
      template: './examples/03-thumbnail-cropping/index.html',
      filename: '03-thumbnail-cropping/index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        const template = fs.readFileSync('./examples/03-thumbnail-cropping/index.html', 'utf-8');
        const timestampScript = fs.readFileSync('./src/utils/buildTimestamp.js', 'utf-8');
        let html = template.replace(/\.\.\/(\.\.\/)??(dist|lib)\//g, '../lib/');
        html = html.replace('</head>', `  <script>${timestampScript}</script>\n</head>`);
        return html;
      },
    }),
    new HtmlWebpackPlugin({
      template: './examples/04-full-window/index.html',
      filename: '04-full-window/index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        const template = fs.readFileSync('./examples/04-full-window/index.html', 'utf-8');
        const timestampScript = fs.readFileSync('./src/utils/buildTimestamp.js', 'utf-8');
        let html = template.replace(/\.\.\/(\.\.\/)??(dist|lib)\//g, '../lib/');
        html = html.replace('</head>', `  <script>${timestampScript}</script>\n</head>`);
        return html;
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'lib',
          to: 'lib',
        },
        {
          from: 'dist',
          to: 'lib',
        },
        {
          from: 'examples/index-styles.css',
          to: 'index-styles.css',
        },
        {
          from: 'examples/01-basic',
          to: '01-basic',
          globOptions: {
            ignore: ['**/index.html', '**/sketch.js'],
          },
        },
        {
          from: 'examples/02-blend-modes',
          to: '02-blend-modes',
          globOptions: {
            ignore: ['**/index.html', '**/sketch.js'],
          },
        },
        {
          from: 'examples/03-thumbnail-cropping',
          to: '03-thumbnail-cropping',
          globOptions: {
            ignore: ['**/index.html', '**/sketch.js'],
          },
        },
        {
          from: 'examples/04-full-window',
          to: '04-full-window',
          globOptions: {
            ignore: ['**/index.html', '**/sketch.js'],
          },
        },
        {
          from: 'examples/01-basic/sketch.js',
          to: '01-basic/sketch.js',
          transform(content) {
            return content.toString().replace(/\.\.\/\.\.\/dist\//g, '../lib/');
          },
        },
        {
          from: 'examples/02-blend-modes/sketch.js',
          to: '02-blend-modes/sketch.js',
          transform(content) {
            return content.toString().replace(/\.\.\/\.\.\/dist\//g, '../lib/');
          },
        },
        {
          from: 'examples/03-thumbnail-cropping/sketch.js',
          to: '03-thumbnail-cropping/sketch.js',
          transform(content) {
            return content.toString().replace(/\.\.\/\.\.\/dist\//g, '../lib/');
          },
        },
        {
          from: 'examples/04-full-window/sketch.js',
          to: '04-full-window/sketch.js',
          transform(content) {
            return content.toString().replace(/\.\.\/\.\.\/dist\//g, '../lib/');
          },
        },
      ],
    }),
  ],
};
