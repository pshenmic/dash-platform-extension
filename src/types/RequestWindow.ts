// A website's request the user settles in the extension: a connection, or a
// payment. Shown on its own page of the UI, in the toolbar popup where the
// browser allows it.
export type RequestWindowKind = 'connect' | 'payment'

export interface RequestWindow {
  kind: RequestWindowKind
  id: string
}

// A content script asks the service worker to open the toolbar popup on a
// request's page. Kept on its own message `type`, like the storage proxy, so it
// never collides with the wallet RPC.
export const OPEN_POPUP_MESSAGE = 'open-popup'

export interface OpenPopupRequest {
  context: 'dash-platform-extension'
  type: typeof OPEN_POPUP_MESSAGE
  path: string
}

export interface OpenPopupResponse {
  ok: boolean
  error?: string
}

// The page of a request holds a port of this name open for as long as it is
// shown, so the service worker learns when it closes.
export const REQUEST_WINDOW_PORT = 'request-window'

export const requestWindowPath = (window: RequestWindow): string => `index.html#/${window.kind}/${window.id}`

const REQUEST_WINDOW_PATH = /^index\.html#\/(connect|payment)\/[0-9a-f]+$/

export const isRequestWindowPath = (path: unknown): path is string =>
  typeof path === 'string' && REQUEST_WINDOW_PATH.test(path)

export const isRequestWindow = (value: any): value is RequestWindow =>
  (value?.kind === 'connect' || value?.kind === 'payment') && typeof value.id === 'string' && /^[0-9a-f]+$/.test(value.id)
