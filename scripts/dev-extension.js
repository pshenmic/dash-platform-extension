#!/usr/bin/env node

const webpack = require('webpack')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const config = require('../webpack.extension.config.cjs')

class ExtensionDevServer {
  constructor () {
    this.compiler = null
    this.webExtProcess = null
    this.isBuilding = false
    this.watchers = []
    this.chromeStarted = false
    this.buildCount = 0
  }

  async init () {
    console.log('🚀 Starting Extension Development Server...')

    // Setup webpack compiler
    this.setupWebpack()

    // Start initial build
    await this.buildExtension()

    // Setup file watching
    this.setupFileWatcher()

    // Start web-ext
    this.startWebExt()

    console.log('✅ Extension Development Server started!')
    console.log('📁 Extension loaded from: dist/')
    console.log('🔗 Chrome Extensions: chrome://extensions/')
    console.log('🔄 Watching for changes...')
  }

  setupWebpack () {
    this.compiler = webpack(config({}, { mode: 'development' }))
  }

  buildExtension () {
    return new Promise((resolve, reject) => {
      console.log('🔨 Building extension...')
      this.isBuilding = true

      this.compiler.run((err, stats) => {
        this.isBuilding = false

        if (err) {
          console.error('❌ Build failed:', err)
          reject(err)
          return
        }

        if (stats.hasErrors()) {
          console.error('❌ Build errors:')
          stats.compilation.errors.forEach(error => {
            console.error(error.message)
          })
          reject(new Error('Build failed with errors'))
          return
        }

        if (stats.hasWarnings()) {
          console.warn('⚠️  Build warnings:')
          stats.compilation.warnings.forEach(warning => {
            console.warn(warning.message)
          })
        }

        console.log('✅ Build completed successfully!')
        this.buildCount++

        resolve()
      })
    })
  }

  setupFileWatcher () {
    let timeout = null

    const handleChange = (eventType, filename) => {
      if (this.isBuilding) return

      console.log(`📝 File changed: ${filename || 'unknown'}`)

      // Debounce rebuilds
      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        try {
          await this.buildExtension()
          this.showReloadInstructions()
        } catch (error) {
          console.error('❌ Rebuild failed:', error.message)
        }
      }, 500)
    }

    // Watch src directory
    const srcWatcher = fs.watch(
      path.resolve(__dirname, '../src'),
      { recursive: true },
      handleChange
    )

    // Watch manifest.json
    const manifestWatcher = fs.watch(
      path.resolve(__dirname, '../manifest.json'),
      handleChange
    )

    this.watchers.push(srcWatcher, manifestWatcher)
    console.log('👀 Watching files for changes...')
  }

  startWebExt () {
    if (this.chromeStarted) {
      console.log('📱 Chrome already running - skipping restart')
      return
    }

    try {
      console.log('🌏 Starting Chrome with extension...')

      // Start Chrome with extension loaded
      this.webExtProcess = spawn('open', [
        '-a', 'Google Chrome',
        '--args',
        '--disable-extensions-except=' + path.resolve(__dirname, '../dist'),
        '--load-extension=' + path.resolve(__dirname, '../dist'),
        '--user-data-dir=' + path.resolve(__dirname, '../web-ext-profile'),
        'chrome://extensions/'
      ], {
        stdio: 'pipe',
        detached: true
      })

      this.chromeStarted = true

      console.log('✅ Chrome started with extension loaded!')
      console.log('🔗 Extension should be visible at: chrome://extensions/')

      this.webExtProcess.unref() // Allow process to continue independently
    } catch (error) {
      console.warn('⚠️  Could not start Chrome automatically:', error.message)
      console.log('📝 Manually load the extension from the dist/ folder')
      console.log('  1. Open chrome://extensions/')
      console.log('  2. Enable "Developer mode"')
      console.log('  3. Click "Load unpacked" and select the dist/ folder')
    }
  }

  showReloadInstructions () {
    if (this.buildCount === 1) {
      // First build after startup
      return
    }

    console.log('\n🔄 Extension rebuilt!')
    console.log('📝 To see changes:')
    console.log('  • Go to chrome://extensions/')
    console.log('  • Click the refresh button on your extension')
    console.log('  • OR press Ctrl+R in your extension popup/tab')
    console.log('')
  }

  async cleanup () {
    console.log('\n🧹 Cleaning up...')

    if (this.webExtProcess) {
      this.webExtProcess.kill()
    }

    // Close file watchers
    this.watchers.forEach(watcher => {
      try {
        watcher.close()
      } catch (error) {
        // Ignore close errors
      }
    })

    console.log('👋 Extension development server stopped')
    process.exit(0)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (global.devServer) {
    await global.devServer.cleanup()
  } else {
    process.exit(0)
  }
})

process.on('SIGTERM', async () => {
  if (global.devServer) {
    await global.devServer.cleanup()
  } else {
    process.exit(0)
  }
})

// Start the development server
async function main () {
  try {
    const devServer = new ExtensionDevServer()
    global.devServer = devServer
    await devServer.init()
  } catch (error) {
    console.error('❌ Failed to start development server:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
