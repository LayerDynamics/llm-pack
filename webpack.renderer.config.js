const path = require('path');

module.exports = {
  mode: 'development', // Change to 'production' for production builds
  entry: './src/gui/renderer.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  target: 'electron-renderer',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/gui'),
    },
    extensions: ['.js', '.jsx'],
  },
};