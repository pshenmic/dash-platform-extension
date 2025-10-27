module.exports = {
  setupFiles: [
    './test/bootstrap.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(?:.pnpm/))(?!dash-platform-sdk|pshenmic-dpp|@protobuf-ts/grpcweb-transport|@scure*|@noble*|cbor-x|micro-packed)'
  ]
}
