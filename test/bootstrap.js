const EventEmitter = require('node:events')

const eventBus = new EventEmitter()
global.chrome = {
  runtime:{
    getURL : () => {
      return 'fake_id'
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
  }
}
