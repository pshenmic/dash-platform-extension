import DashPlatformSDK from 'dash-platform-sdk'
import { base64 } from '@scure/base'

function popupWindow (url, windowName, win, w, h) {
  const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2)
  const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2)
  //return win.open(url, windowName, `popup, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);
  return win.open(url, windowName, `popup, width=${w}, height=${h}, top=${y}, left=${x}`)
}

window.addEventListener('message', function (event) {
  if (event.data.target === 'window') {
    if (event.data.method === 'openUrl') {
      const { payload } = event.data
      const { url } = payload
      console.log('Received request for opening new window with url' + url)

      popupWindow(url, 'Approve transaction', window, 250, 500)
    }
  }
}, true)

const promises = []

const signer = { signStateTransition: () => {} }
window.dashPlatformSDK = new DashPlatformSDK({ network: 'testnet', signer })
window.dashPlatformSDK.signer = {
  reject: () => {

  },
  signStateTransition: async (stateTransition, timeout = 60000) => {
    return new Promise((resolve, reject) => {
      const rejectSigning = (message) => {
        window.removeEventListener('message', handleMessage)

        reject(message)
      }

      const handleMessage = (event) => {
        if (event.data.target === 'window' && event.data.method === 'signStateTransitionResponse') {
          const { base64 } = event.data.payload

          resolve(base64)
        }
        if (event.data.target === 'window' && event.data.method === 'rejectSigning') {
          reject('Signing request was rejected by the user')
        }
      }

      window.addEventListener('message', handleMessage)

      setTimeout(() => {
        rejectSigning(`Timed out waiting for signStateTransition()`)
      }, timeout)

      window.postMessage({
        method: 'signStateTransition',
        payload: { base64: base64.encode(stateTransition.toBytes()) }
      })
      console.log('Sent signStateTransition() method from webpage')
    })
  }
}
console.log('injected')
