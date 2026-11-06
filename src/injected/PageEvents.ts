import { PageEventName } from '../types/PageState'

export type PageEventListener = (payload: any) => void

/**
 * Lets a page follow the wallet instead of polling it: the extension posts an
 * event whenever what this website may see changes.
 *
 * Only events for this website arrive here, already filtered by what the user
 * granted it, so `identitiesChanged` with an empty list means the website lost
 * access rather than that the wallet is empty.
 */
export class PageEvents {
  listeners: Map<string, Set<PageEventListener>> = new Map()

  constructor () {
    window.addEventListener('message', (message: MessageEvent) => {
      const data = message.data

      if (data?.context !== 'dash-platform-extension' || data?.type !== 'event') {
        return
      }

      if (!Object.values(PageEventName).includes(data.method)) {
        return
      }

      for (const listener of this.listeners.get(data.method) ?? []) {
        try {
          listener(data.payload)
        } catch (e) {
          console.error(`Dash Platform Extension: a ${data.method as string} listener threw`, e)
        }
      }
    })
  }

  on (event: `${PageEventName}`, listener: PageEventListener): void {
    const listeners = this.listeners.get(event) ?? new Set()

    listeners.add(listener)
    this.listeners.set(event, listeners)
  }

  off (event: `${PageEventName}`, listener: PageEventListener): void {
    this.listeners.get(event)?.delete(listener)
  }
}
