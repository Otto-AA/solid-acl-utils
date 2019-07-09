const path = require('path')

// Configurations shared between all builds
const common = {
  mode: 'production',
  entry: ['core-js/stable', 'regenerator-runtime/runtime', './src/index.ts'],  output: {
    filename: 'solid-acl-utils.bundle.js',
    library: 'SolidAclUtils',
    libraryExport: 'default'
  },
  module: {
    rules: [{
      test: /\.(js|jsx|tsx|ts)$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.tsx', '.ts']
  },
  devtool: 'source-map'
}

// Configurations specific to the browser build
const browser = {
  ...common,
  name: 'browser',
  output: {
    ...common.output,
    path: path.resolve(__dirname, 'dist', 'browser'),
    libraryTarget: 'umd'
  }
}

// Configurations specific to the node build
const node = {
  ...common,
  name: 'node',
  output: {
    ...common.output,
    path: path.resolve(__dirname, 'dist', 'node'),
    libraryTarget: 'commonjs2'
  }
}

module.exports = [
  browser,
  node
]
