import {base64} from "@scure/base";
import hash from "hash.js";
import {EventData} from "../../../types/EventData";
import {EVENTS, ZUSTAND_IDENTITIES_STORE_KEY} from "../../../constants";

export default async function (data: EventData) {
    const buffer = base64.decode(data.payload.base64)
    const state_transition_hash = hash.sha256().update(buffer).digest('hex')

    const fullStoredState = await chrome.storage.local.get()

    const originalState = JSON.parse(fullStoredState[ZUSTAND_IDENTITIES_STORE_KEY])

    const {unsignedStateTransitions} = originalState.state

    const newState = {
        version: originalState.version,
        state: {
            ...originalState.state,
            unsignedStateTransitions: [...unsignedStateTransitions, {
                hash: state_transition_hash,
                base64: data.payload.base64
            }]
        }
    }

    await chrome.storage.local.set({[ZUSTAND_IDENTITIES_STORE_KEY]: JSON.stringify(newState)});

    window.postMessage({
        target: 'webpage',
        method: EVENTS.OPEN_POPUP_WINDOW,
        payload: {
            url: chrome.runtime.getURL(`/index.html#approve/${state_transition_hash}`)
        }
    })
}
