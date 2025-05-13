import {EventData} from "../../../types/EventData";
import {EVENTS, ZUSTAND_IDENTITIES_STORE_KEY} from "../../../constants";

export default async function (data: EventData) {
    const fullStoredState = await chrome.storage.local.get()

    const originalState = JSON.parse(fullStoredState[ZUSTAND_IDENTITIES_STORE_KEY])

    const {identities, currentIdentity} = originalState.state

    window.postMessage({
        target: 'webpage',
        method: EVENTS.GET_IDENTITIES,
        payload: {identities : identities.map((identity) => ({...identity, current: identity.identifier === currentIdentity}))}
    })
}
