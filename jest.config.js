const config = {
  setupFiles: [
    './test/bootstrap.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!pshenmic-dpp|wasm-drive-verify|dash-platform-sdk)'
  ]
}

module.exports = config
