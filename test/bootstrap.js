const EventEmitter = require('node:events')

const eventBus = new EventEmitter()
global.chrome = {
  runtime: {
    getURL: () => {
      return 'fake_url'
    },
    onMessage: {
      removeListener (listener) {
        eventBus.removeListener('message', listener)
      },
      addListener (listener) {
        eventBus.on('message', listener)
      },
      dispatch (message) {
        eventBus.emit('message', message)
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
