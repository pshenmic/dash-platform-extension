const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const mode = process.env.NODE_ENV

module.exports = {
  entry: {
    'ui': './src/ui/index.js',
    ...(mode === 'production' && {
      'content-script': './src/content-script.js',
      'injected': './src/injected.js',
    })
  },
  output: {
    publicPath: '',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.(?:js|mjs|cjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }], '@babel/preset-react'
            ]
          }
        }
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/ui/assets',
          to: 'assets',
          toType: 'dir'
        }
      ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json' }
      ]
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/ui/index.html'
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ],
  optimization: {
    minimize: false
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'src/ui'),
    }
  }
}
