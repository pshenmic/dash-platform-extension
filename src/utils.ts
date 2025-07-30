import { base58 } from '@scure/base'
import { IdentityWASM, PrivateKeyWASM } from 'pshenmic-dpp'
import { DashPlatformSDK } from 'dash-platform-sdk'

export const hexToBytes = (hex: string): Uint8Array => {
  return Uint8Array.from((hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)))
}

export const bytesToHex = (bytes: Uint8Array): string => {
  return Array.prototype.map.call(bytes, (x: number) => ('00' + x.toString(16)).slice(-2)).join('')
}

export const wait = async (ms: number): Promise<void> => {
  return await new Promise((resolve, reject) => setTimeout(resolve, ms))
}

export const validateHex = (str: string): boolean => {
  return /[0-9a-fA-F]{32}/.test(str)
}

export const validateWalletId = (walletId: string): boolean => {
  return /[0-9a-fA-F]{6}/.test(walletId)
}
export const generateWalletId = (): string => {
  return generateRandomHex(6)
}

export const generateRandomHex = (size: number): string => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

export const validateIdentifier = (str: string): boolean => {
  try {
    const bytes = base58.decode(str)

    return bytes.length === 32
  } catch (e) {
    return false
  }
}

export const utf8ToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str)
}
export const bytesToUtf8 = (bytes: Uint8Array): string => {
  return new TextDecoder().decode(bytes)
}

export const fetchIdentitiesBySeed = async (seed: Uint8Array, sdk: DashPlatformSDK): Promise<IdentityWASM[]> => {
  const hdWallet = await sdk.keyPair.seedToWallet(seed)

  const identities = []

  let identity = null
  let identityIndex = 0

  do {
    const hdKey = await sdk.keyPair.walletToIdentityKey(hdWallet, identityIndex, 0, { network: 'testnet' })
    const privateKey = hdKey.privateKey
    const pkh = PrivateKeyWASM.fromBytes(privateKey, 'testnet').getPublicKeyHash()

    let uniqueIdentity

    try {
      uniqueIdentity = await sdk.identities.getIdentityByPublicKeyHash(pkh)
    } catch (e) {
    }

    let nonUniqueIdentity

    try {
      nonUniqueIdentity = await sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh)
    } catch (e) {
    }

    [identity] = [uniqueIdentity, nonUniqueIdentity].filter(e => e != null)

    if (identity != null) {
      identities.push(identity)
    }

    identityIndex = identityIndex + 1
  } while (identity != null)

  return identities
}

export const popupWindow = (url: string, windowName: string, win: Window, w: number, h: number): void => {
  if (win.top == null) {
    throw new Error('Could not detect window size')
  }

  const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2)
  const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2)
  // return win.open(url, windowName, `popup, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`);

  win.open(url, windowName, `popup, width=${w}, height=${h}, top=${y}, left=${x}`)
}

export const injectScript = (document: Document, src: string): void => {
  if (document.getElementById(src) != null) {
    return
  }

  const s = document.createElement('script')
  s.id = src
  s.src = chrome.runtime.getURL(src);
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  (document.head || document.documentElement).append(s)

  console.log(`Injected ${src}`)
}

/**
 * Checks that there is WebAssembly support on the page
 */
export const checkWebAssembly = (): boolean => {
  try {
    // eslint-disable-next-line
    new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))

    return true
  } catch (e) {
    return false
  }
}

export const getFaviconUrl = (url: string, size: number = 32): string => {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
  } catch (error) {
    console.warn('Invalid URL provided to getFaviconUrl:', url)
    return `https://www.google.com/s2/favicons?domain=example.com&sz=${size}`
  }
}
