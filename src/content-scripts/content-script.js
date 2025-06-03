import { base64 } from '@scure/base';
import hash from 'hash.js'
import { ZUSTAND_IDENTITIES_STORE_KEY } from '../ui/constants.js'

window.addEventListener("message",
  async function (event) {
    const {data} = event

    if (data.method === 'signStateTransition') {
      console.log('request for sign state transition', data.payload)
//     {"platform-extension-identities":{"state":{"currentIdentity":"7cBLvT9A6nkU5jPoLak8o97rU4WrARr3xHv7ttFh9n64","unsignedStateTransitions":[{"hash":"9389abf19d2e7a762bd6cf3cb8c96bb48b31977179f01ee51ed9a3dfc81882b6","base64":"AgBxmfH2hATIbs9g2cuTrvMY+g8rCOWf/Rdr3vQxVP/eawEAAAA/ftjfpPUqeqA47rNLOxgIfEnTdB6lzA0Z1gafaPZeAQkEbm90ZYHK4mdrH+Kh0VhHzVN0PJ3rS0f47zaXSi60momVcTWG/ZgtIBfcu6rLkbC300fR38FTSV9T8XUTwZ7JhsBV+6IBB21lc3NhZ2USBHRlc3QAAAAA"}],"identities":[{"identifier":"7cBLvT9A6nkU5jPoLak8o97rU4WrARr3xHv7ttFh9n64","raw":"006229253119f52070bd8d4e559b85b24cde3aa575350d09416a33697ade17d139040000000000000000210238bc207fde72e03df06592be21081afb42e2c9fbc29ef0490dff88da66eba69d0001000100020000002102167d780aae51bd1e51cf54821717158fa6bb285c673e804a09793077452d737100020002000100000021034c8f0b73b00a14fa8f58dba2045ef2b734a2e0aa1853873f574ea503243749bd00030003030100000021026742d602610cdc1b65a2ff8c6e653a91715ae8a4a52bba630d58c3d643b6e6da00fc0dccfbde00","privateKeys":["67ad1669d882da256b6fa05e1b0ae384a6ac8aed146ea53602b8ff0e1e9c18e9"],"balance":"231537630"}]},"version":0}}
      const buffer = base64.decode(data.payload.base64)
      const state_transition_hash = hash.sha256().update(buffer).digest('hex')

      const fullStoredState = await chrome.storage.local.get()

      const originalState = JSON.parse(fullStoredState[ZUSTAND_IDENTITIES_STORE_KEY])

      const {unsignedStateTransitions} = originalState.state

      const newState =  {version: originalState.version, state: {...originalState.state, unsignedStateTransitions: [...unsignedStateTransitions, {hash: state_transition_hash, base64: data.payload.base64}]}}

      await chrome.storage.local.set({ [ZUSTAND_IDENTITIES_STORE_KEY]: JSON.stringify(newState)});

      window.postMessage({target: 'window', method: 'openUrl', payload: {url: chrome.runtime.getURL(`/index.html#approve/${state_transition_hash}`) }})
    }
  }
);

function injectScript (src) {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL(src);
  (document.head || document.documentElement).append(s);
}

injectScript('injected.js')

console.log('content script loaded')
