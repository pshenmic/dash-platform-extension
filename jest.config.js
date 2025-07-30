const config = {
  setupFiles: [
    './test/bootstrap.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!pshenmic-dpp|wasm-drive-verify)'
  ]
}

module.exports = config
