const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => {
  const mode = argv.mode || 'development'
  const isProduction = mode === 'production'

  // The popup document loads the React UI plus the in-popup content-script (fast
  // methods on the dispatch path). The service worker and offscreen bundles must
  // NOT be injected here.
  const popupChunks = isProduction ? ['ui', 'content-script'] : ['ui']

  return ({
    devtool: 'inline-source-map',
    entry: {
      ui: './src/ui/index.tsx',
      ...(isProduction && {
        'content-script': './src/content-script/index.ts',
        injectExtension: './src/injected/dashPlatformExtension.ts',
        injectSdk: './src/injected/dashPlatformSdk.ts',
        background: './src/background/index.ts',
        offscreen: './src/offscreen/index.ts'
      })
    },
    output: {
      publicPath: '',
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      // Use `self` so the service-worker bundle (no `window`) works too.
      globalObject: 'self'
    },
    module: {
      rules: [
        {
          test: /\.module\.p?css$/i,
          use: [
            'style-loader',
            { loader: 'css-loader', options: { modules: true } },
            'postcss-loader'
          ]
        },
        {
          test: /\.p?css$/i,
          exclude: /\.module\.p?css$/i,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        },
        // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
        { test: /\.tsx?$/, loader: 'ts-loader' },
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
      extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
      fallback: {
        buffer: require.resolve('buffer'),
        // pshenmic-dpp's WASM loader has a guarded `require('worker_threads')`
        // (Node-only path); stub it out for the browser bundle.
        worker_threads: false
      }
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
        template: 'src/ui/index.html',
        chunks: popupChunks
      }),
      // Offscreen document host page — only exists in the production (packaged)
      // build where the offscreen bundle is emitted.
      ...(isProduction
        ? [new HtmlWebpackPlugin({
            filename: 'offscreen.html',
            template: 'src/offscreen/offscreen.html',
            chunks: ['offscreen']
          })]
        : []),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'src/ui')
      }
    }
  })
}
