module.exports = {
  // Public Platform nodes answer slower than the one the SDK used to hardcode,
  // and every suite probes which of them are up before it starts.
  testTimeout: 60000,
  // Several suites talk to live Platform nodes, and those nodes drop
  // connections when a whole machine's worth of workers opens them at once:
  // run them a couple at a time, which costs about half a minute and keeps the
  // run from failing on the network rather than on the code.
  maxWorkers: 2,
  setupFiles: [
    './test/bootstrap.js'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(?:.pnpm/))(?!dash-core-sdk|dash-platform-sdk|pshenmic-dpp|@protobuf-ts/grpcweb-transport|@scure*|@noble*|cbor-x|cbor2|@cto.af|micro-packed)'
  ],
  moduleNameMapper: {
    // dash-core-sdk only exports an ESM entry ("import" condition).
    // Jest uses require() so it cannot resolve via the exports map;
    // point it directly at the dist entry so Babel can transform it.
    '^dash-core-sdk$': '<rootDir>/node_modules/dash-core-sdk/index.js'
  }
}
