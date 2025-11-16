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
    new HtmlWebpackPlugin({
      template: './examples/01-basic.html',
      filename: 'index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => {
        // Read the template file
        const template = fs.readFileSync('./examples/01-basic.html', 'utf-8');

        // Read the build timestamp script
        const timestampScript = fs.readFileSync('./src/utils/buildTimestamp.js', 'utf-8');

        // Replace the paths - both dist and lib go to ./lib/
        let html = template.replace(/\.\.\/(dist|lib)\//g, './lib/');

        // Inject the timestamp script before the closing </head> tag
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
      ],
    }),
  ],
};
