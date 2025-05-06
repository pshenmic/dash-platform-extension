export interface MessageHandler {
    method: string
    handler: Function
}

export class Messaging {
    target: string
    handlers: MessageHandler[]

    constructor(handlers: MessageHandler[], target: string) {
        this.handlers = handlers
        this.target = target

    }

    init() {
        this.handlers.forEach(({method, handler}) => {
            window.addEventListener('message',  (event) => {
                if (event.data.target === this.target && event.data.method === method) {
                    handler(event)
                }
            }, true)
        })
    }
}
