import { useEffect } from 'react'
import { ext } from '../../platform'
import { REQUEST_WINDOW_PORT, RequestWindowKind } from '../../types/RequestWindow'

const watched = new Set<string>()

const watch = (kind: RequestWindowKind, id: string): void => {
  const port = ext.runtime.connect({ name: REQUEST_WINDOW_PORT })

  port.postMessage({ kind, id })

  // The service worker was stopped, not this page closed: a closing page runs
  // nothing more. Tell the next worker this page is still here.
  port.onDisconnect.addListener(() => {
    setTimeout(() => watch(kind, id), 1000)
  })
}

// Tells the extension this page shows a website's request for as long as it
// is open, so that closing it undecided declines the request and the website
// learns so. Bound to the page rather than to the component: moving to another
// screen of the same popup does not count as closing it.
export const useRequestWindow = (kind: RequestWindowKind, id: string | undefined): void => {
  useEffect(() => {
    if (id == null || watched.has(`${kind}:${id}`)) {
      return
    }

    watched.add(`${kind}:${id}`)
    watch(kind, id)
  }, [kind, id])
}
