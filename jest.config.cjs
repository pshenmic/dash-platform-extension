module.exports = {
  setupFiles: [
    './test/bootstrap.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(?:.pnpm/))(?!dash-core-sdk|dash-platform-sdk|pshenmic-dpp|@protobuf-ts/grpcweb-transport|@scure*|@noble*|cbor-x|micro-packed)'
  ],
  moduleNameMapper: {
    // dash-core-sdk only exports an ESM entry ("import" condition).
    // Jest uses require() so it cannot resolve via the exports map;
    // point it directly at the dist entry so Babel can transform it.
    '^dash-core-sdk$': '<rootDir>/node_modules/dash-core-sdk/index.js'
  }
}
