const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const mode = process.env.NODE_ENV

module.exports = {
  entry: {
    'ui': './src/ui/index.tsx',
    ...(mode === 'production' && {
      'content-script': './src/content-scripts/content-script.js',
      'injected': './src/content-scripts/injected.js',
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
        test: /\.module\.p?css$/i,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { modules: true } },
          'postcss-loader'
        ],
      },
      {
        test: /\.p?css$/i,
        exclude: /\.module\.p?css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.(?:js|mjs|cjs|jsx)$/,
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json']
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
