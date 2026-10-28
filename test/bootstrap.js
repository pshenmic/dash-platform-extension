const EventEmitter = require('node:events')

const eventBus = new EventEmitter()
const runtimeListeners = new Set()
global.chrome = {
  runtime: {
    getURL: () => {
      return 'fake_url'
    },
    onMessage: {
      removeListener (listener) {
        runtimeListeners.delete(listener)
        eventBus.removeListener('message', listener)
      },
      addListener (listener) {
        runtimeListeners.add(listener)
        eventBus.on('message', listener)
      },
      dispatch (message) {
        eventBus.emit('message', message)
      },
      // Test-only. The bus is shared by the whole file, so a suite that wires a
      // fresh backend per case leaves the previous ones listening on it: they
      // answer requests meant for the current backend, out of their own storage,
      // and node warns about the pile of listeners. The real runtime has one
      // backend for the life of the page and needs none of this.
      removeAllListeners () {
        for (const listener of runtimeListeners) {
          eventBus.removeListener('message', listener)
        }

        runtimeListeners.clear()
      }
    },
    // Mirrors chrome.runtime.sendMessage: delivers to every registered
    // listener in the extension and resolves like the real promise-based API.
    async sendMessage (message) {
      eventBus.emit('message', message)
    }
  }
}

global.window = {
  addEventListener (type, listener, options) {
    eventBus.on(type, listener)
  },
  removeEventListener (type, listener, options) {
    eventBus.removeListener(type, listener)
  },
  postMessage (message, targetOrigin, transfer) {
    const messageEvent = {
      data: message
    }
    eventBus.emit('message', messageEvent)
  },
  crypto: globalThis.crypto
}
