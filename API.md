# Dash Extension API reference

The reference for what a web page can call. Most dApps should follow the [integration guide](docs/INTEGRATION.md) and use `window.dashPlatformExtension.signer`, which wraps everything below.

## Page globals

| Global | Available | Type |
|---|---|---|
| `window.dashPlatformExtension` | Shortly after page load | `{ signer: ExtensionSigner }` |

The signer is the only thing the extension puts on the page. Build your transitions with your own copy of [dash-platform-sdk](https://github.com/pshenmic/dash-platform-sdk) — see the [integration guide](docs/INTEGRATION.md).

> The extension no longer injects an SDK. It used to add `window.dashPlatformSDK` on approved sites; that global is gone. Its WASM needed `crossOriginIsolated`, which a third-party page does not have.

## `signer.connect()`

```ts
connect (): Promise<WalletInfo>

interface WalletInfo {
  identities: IdentityInfo[]
  currentIdentity: string | null
}

interface IdentityInfo {
  identifier: string
  type: 'regular' | 'masternode' | 'voting'
  proTxHash: string | null
}
```

Asks to connect the current origin. Opens an approval popup if the origin has no decision yet, and polls every 500 ms until the user decides.

`currentIdentity` is the wallet's current identity if the site was granted it, otherwise the first granted identity.

**Rejects** with `App connection was rejected` if the user rejects or closes the popup, or with a timeout error after 3 minutes.

## `signer.signAndBroadcast()`

```ts
signAndBroadcast (stateTransition: string): Promise<SignedStateTransitionData>

interface SignedStateTransitionData {
  signature: string // hex
  signaturePublicKeyId: number
  unsignedBase64: string // the transition as you sent it
}
```

Asks the user to sign a state transition, then broadcasts it and waits for the result.

| Input | Notes |
|---|---|
| `string` | Hex or base64. Serialize your own transition first — a `StateTransitionWASM` object is not accepted, because the signer no longer bundles one. |

**Resolves** with the signature and the key ID it was made with. The transition is already broadcast and confirmed; you do not need to send it again.

To get the signed hash, apply the signature to your own transition:

```js
const signed = await signer.signAndBroadcast(transition.hex())

transition.signature = hexToBytes(signed.signature)
transition.signaturePublicKeyId = signed.signaturePublicKeyId

transition.hash(false) // signed transaction hash
```

**Rejects** with:

- `Transaction signing was rejected` if the user cancels.
- `Internal error during singing the transaction` if signing or broadcasting fails.
- `Signature is missing` if the extension returns no signature.
- `Failed to receive state transition signing approval due timeout` after 3 minutes without a decision.

## Message protocol

The signer talks to the extension's content script through `window.postMessage`. You only need this level if you aren't using the signer.

```ts
interface EventData {
  id: string // matches a response to its request
  context: 'dash-platform-extension'
  type: 'request' | 'response' | 'event'
  method: string
  payload?: any
  error?: string | null
}
```

The extension uses the origin reported by the browser, never one named in a message, to decide what a page may do. A page that isn't approved can only call `CONNECT_APP`.

### `CONNECT_APP`

The payload's `url` must exactly equal the calling page's origin.

```ts
// Request payload
{ url: string }

// Response payload
{
  redirectUrl: string // the approval page to open
  status: 'pending' | 'approved' | 'rejected' | 'error'
  identities: IdentityInfo[] // empty until approved
  currentIdentity: string | null
  network: string | null // null until approved
}
```

Calling it again after a rejection starts a new `pending` request.

### `REQUEST_STATE_TRANSITION_APPROVAL`

The transition's owner must be an identity granted to the calling origin.

```ts
// Request payload
{ base64: string } // serialized state transition

// Response payload
{
  redirectUrl: string // the approval page to open
  stateTransition: {
    unsignedHash: string
    signedHash: string | null
    unsigned: string
    signature: string | null // hex
    signaturePublicKeyId: number | null
    status: 'pending' | 'approved' | 'rejected' | 'error'
    error: string | null
    origin: string | null // the calling origin, shown on the approval screen
  }
}
```

Repeating a request with the same transition returns its current status, which is how the signer polls for a decision.

A transition is accepted only when it deserializes, its owner is granted to the calling origin, it is not already signed, and it fits `MAX_STATE_TRANSITION_SIZE_BASE64` (512 KiB of base64). The extension keeps a bounded number of them per wallet and forgets pending entries after an hour and resolved ones after a day.

### `content-script-ready` event

The content script posts this message, with `type: 'event'`, once it can accept requests. The `window.dashPlatformExtension` global can arrive after it, so don't use this event to detect the global.

### Errors

A failed request produces a `response` message with `payload: null` and the reason in `error`:

| Error | Cause |
|---|---|
| `Application on url <origin> is not authorized` | The origin isn't approved |
| `Could not find handler for method <method>` | Unknown method |
| `Invalid payload: <reason>` | The payload failed validation |
| `Connection must be requested for the calling origin <origin>` | `url` doesn't match the page's origin |
| `No wallet loaded in the extension` | The user has no wallet |
| `State transition has no owner identity to check the connection against` | For example, an identity creation transition |
| `State transition owner <id> is not granted to this application` | The owner isn't a granted identity |

## Internal API

The popup and the extension's backend use a separate private API over `chrome.runtime` messaging. Web pages can't reach it and it isn't a stable contract. Its methods are listed in [`src/types/enums/MessagingMethods.ts`](src/types/enums/MessagingMethods.ts).
