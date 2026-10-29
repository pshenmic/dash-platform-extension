import { popupWindow } from '../utils'
import { PublicAPIClient } from '../types/PublicAPIClient'
import { OpenRequestPopupPayload } from '../types/messages/payloads/OpenRequestPopupPayload'

const WINDOW_WIDTH = 430
const WINDOW_HEIGHT = 600

export interface ShownRequest {
  // In the extension's toolbar popup. The extension then reports the popup
  // closing by declining the request, so there is no window to watch.
  inPopup: boolean
  // The window it was opened in instead; null when it is in the popup, or when
  // the browser blocked the window too.
  window: Window | null
}

/**
 * Shows the user a website's request in the extension's toolbar popup, or, on a
 * browser that will not open the popup, in a window of its own.
 */
export async function showRequest (
  publicAPIClient: PublicAPIClient,
  request: OpenRequestPopupPayload,
  url: string,
  windowName: string,
  win: Window
): Promise<ShownRequest> {
  const opened = await publicAPIClient.openRequestPopup(request)
    .then(response => response.opened, () => false)

  if (opened) {
    return { inPopup: true, window: null }
  }

  return { inPopup: false, window: popupWindow(url, windowName, win, WINDOW_WIDTH, WINDOW_HEIGHT) }
}
