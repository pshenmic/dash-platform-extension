const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => {
  const mode = argv.mode || 'development'
  const isProduction = mode === 'production'

  return ({
    devtool: 'inline-source-map',
    entry: {
      ui: './src/ui/index.tsx',
      ...(isProduction && {
        'content-script': './src/content-script/index.ts',
        injectExtension: './src/injected/dashPlatformExtension.ts',
        injectSdk: './src/injected/dashPlatformSdk.ts'
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
        buffer: require.resolve('buffer')
      }
    },
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks (chunk) {
          // Only split chunks for UI entry - not for content-script or injected scripts
          return chunk.name === 'ui'
        },
        cacheGroups: {
          // Critical vendors - React core (loads immediately)
          vendorsCritical: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            name: 'vendors',
            priority: 20,
            enforce: true
          },
          // UI Kit - can be lazy loaded
          vendorsUIKit: {
            test: /[\\/]node_modules[\\/]dash-ui-kit[\\/]/,
            name: 'vendor-ui-kit',
            priority: 15,
            enforce: true
          },
          // All other node_modules
          commons: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5
          }
        }
      },
      runtimeChunk: false, // Don't create separate runtime chunk for extensions
      moduleIds: 'deterministic', // Better caching
      usedExports: true, // Tree shaking
      sideEffects: true // Honor package.json sideEffects flag
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: './src/ui/assets',
            to: 'assets',
            toType: 'dir'
          },
          { from: 'manifest.json' }
        ]
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: 'src/ui/index.html',
        chunks: ['vendors', 'content-script', 'ui'], // Vendors → content-script (PrivateAPI) → UI
        chunksSortMode: 'manual', // Preserve chunk order as specified
        inject: 'body',
        scriptLoading: 'blocking' // Ensure correct load order
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'src/ui')
      }
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 3000000,
      maxAssetSize: 3000000
    }
  })
}
