import { base58 } from '@scure/base'
import { IdentityWASM, PrivateKeyWASM, IdentityPublicKeyWASM } from 'pshenmic-dpp'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from './types/enums/Network'
import { NetworkType } from './types'

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

export const fetchIdentitiesBySeed = async (seed: Uint8Array, sdk: DashPlatformSDK, network: Network): Promise<IdentityWASM[]> => {
  const hdWallet = await sdk.keyPair.seedToWallet(seed)

  const identities = []

  let identity = null
  let identityIndex = 0

  do {
    const hdKey = await sdk.keyPair.walletToIdentityKey(hdWallet, identityIndex, 0, { network })
    const privateKey = hdKey.privateKey
    const pkh = PrivateKeyWASM.fromBytes(privateKey, network).getPublicKeyHash()

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
    console.log('Invalid URL provided to getFaviconUrl:', url)
    return `https://www.google.com/s2/favicons?domain=example.com&sz=${size}`
  }
}

export const creditsToDash = (credits: number | bigint): number => {
  const numericCredits = typeof credits === 'bigint' ? Number(credits) : credits
  return numericCredits / 10e10
}

export const getTokenName = (localizations: any, form: 'singularForm' | 'pluralForm' = 'singularForm'): string => {
  return localizations?.en?.[form] ??
    Object.values(localizations ?? {})[0]?.[form] ??
    ''
}

export interface ProcessedPrivateKey {
  key: PrivateKeyWASM
  identity: IdentityWASM
  balance: string
}

export const validatePrivateKeyFormat = (privateKey: string): boolean => {
  const trimmed = privateKey.trim()
  return trimmed.length === 52 || trimmed.length === 64
}

export const parsePrivateKey = (privateKey: string, network: NetworkType): PrivateKeyWASM => {
  const trimmed = privateKey.trim()

  if (trimmed.length === 52) {
    // WIF format
    return PrivateKeyWASM.fromWIF(trimmed)
  } else if (trimmed.length === 64) {
    // Hex format
    return PrivateKeyWASM.fromHex(trimmed, network)
  } else {
    throw new Error('Unrecognized private key format. Expected 52 characters (WIF) or 64 characters (hex)')
  }
}

export const findIdentityForPrivateKey = async (
  privateKey: PrivateKeyWASM,
  sdk: DashPlatformSDK
): Promise<IdentityWASM | null> => {
  const publicKeyHash = privateKey.getPublicKeyHash()

  // Try unique identity first
  try {
    const uniqueIdentity = await sdk.identities.getIdentityByPublicKeyHash(publicKeyHash)
    if (uniqueIdentity != null) return uniqueIdentity
  } catch (e) {
    console.log('Continue to check non-unique', e)
  }

  // Try non-unique identity
  try {
    const nonUniqueIdentity = await sdk.identities.getIdentityByNonUniquePublicKeyHash(publicKeyHash)
    if (nonUniqueIdentity != null) return nonUniqueIdentity
  } catch (e) {
    console.log('No identity found', e)
  }

  return null
}

export const validateIdentityPublicKey = (
  identity: IdentityWASM,
  privateKey: PrivateKeyWASM
): IdentityPublicKeyWASM | null => {
  const publicKeys = identity.getPublicKeys()
  const targetHash = privateKey.getPublicKeyHash()

  const matchingKey = publicKeys.find((publicKey: IdentityPublicKeyWASM) =>
    publicKey.getPublicKeyHash() === targetHash
  )

  return matchingKey ?? null
}

export const processPrivateKey = async (
  privateKeyString: string,
  sdk: DashPlatformSDK,
  network: NetworkType
): Promise<ProcessedPrivateKey> => {
  if (!validatePrivateKeyFormat(privateKeyString)) {
    throw new Error('Invalid private key format. Expected 52 characters (WIF) or 64 characters (hex)')
  }

  // Parse private key
  let privateKey: PrivateKeyWASM
  try {
    privateKey = parsePrivateKey(privateKeyString, network)
  } catch (e) {
    throw new Error(`Could not decode private key: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Find associated identity
  const identity = await findIdentityForPrivateKey(privateKey, sdk)
  if (identity == null) {
    throw new Error(`Could not find identity belonging to private key: ${privateKeyString}`)
  }

  // Validate that there's at least one matching public key
  const identityPublicKey = validateIdentityPublicKey(identity, privateKey)
  if (identityPublicKey == null) {
    throw new Error(`No matching public key found for this private key: ${privateKeyString}`)
  }

  // Get balance
  const identifierString = identity.id.base58()
  const balance = await sdk.identities.getIdentityBalance(identifierString)

  return {
    key: privateKey,
    identity,
    balance: balance.toString()
  }
}

function numberFormat (number: number): string {
  return new Intl.NumberFormat('en', { maximumSignificantDigits: 3 }).format(number)
}

export function numberDigitRound (number: number | string | bigint): string {
  const num = Number(number)
  const billions = num / 1.0e9
  const millions = num / 1.0e6
  const thousands = num / 1.0e3

  if (Math.abs(num) >= 1.0e9) {
    if (Math.abs(billions) >= 100) return `${numberFormat(Math.round(billions))}B`
    if (Math.abs(billions) >= 10) return `${numberFormat(Number(billions.toFixed(1)))}B`
    return `${numberFormat(Number(billions.toFixed(2)))}B`
  }

  if (Math.abs(num) >= 1.0e6) {
    if (Math.abs(millions) >= 100) return `${numberFormat(Math.round(millions))}M`
    if (Math.abs(millions) >= 10) return `${numberFormat(Number(millions.toFixed(1)))}M`
    return `${numberFormat(Number(millions.toFixed(2)))}M`
  }

  if (Math.abs(num) >= 1.0e3) {
    if (Math.abs(thousands) >= 100) return `${numberFormat(Math.round(thousands))}K`
    if (Math.abs(thousands) >= 10) return `${numberFormat(Number(thousands.toFixed(1)))}K`
    return `${numberFormat(Number(thousands.toFixed(1)))}K`
  }

  return num.toFixed()
}

export const isTooBigNumber = (number: number | string | bigint): boolean => Number(number) > 999999999
