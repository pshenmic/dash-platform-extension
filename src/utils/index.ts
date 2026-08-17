import { base58 } from '@scure/base'
import { RecoveredNoteWASM, CoreScriptWASM, OrchardAddressWASM, SpendableNoteWASM } from 'pshenmic-dpp'
import { IdentityWASM, PrivateKeyWASM, IdentityPublicKeyWASM, ShieldedEncryptedNote, ShieldedNullifierStatus } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from '../types/enums/Network'
import { NetworkType, Wallet } from '../types'
import {
  CORE_ADDRESS_VERSIONS,
  PLATFORM_ADDRESS_COIN_TYPE,
  PLATFORM_ADDRESS_FEATURE,
  PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS,
  SHIELDED_MAX_SPEND_NOTES,
  SHIELDED_NOTES_PAGE_SIZE
} from '../constants'
import type { PlatformSourceCandidate } from './platformTransfer'
import formatBigNumber from './formatBigNumber'
import hash from 'hash.js'
import { decrypt, PrivateKey } from 'eciesjs'
import { KeypairRepository } from '../content-script/repository/KeypairRepository'

export { formatBigNumber }
export { loadSigningKeys, isKeyCompatible } from './signingKeys'
export { fetchNames, normalizeName } from './names'
export { decodeStateTransition } from './decodeStateTransition'
export { copyToClipboard } from './copyToClipboard'
export { selectPlatformSource, buildSignedPlatformTransfer, buildSignedIdentityTopUpFromAddress, buildSignedAddressWithdrawal } from './platformTransfer'
export type { PlatformSourceCandidate } from './platformTransfer'

export const hexToBytes = (hex: string): Uint8Array => {
  return Uint8Array.from((hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)))
}

export const bytesToHex = (bytes: Uint8Array): string => {
  return Array.prototype.map.call(bytes, (x: number) => ('00' + x.toString(16)).slice(-2)).join('')
}

export const wait = async (ms: number): Promise<void> => {
  return await new Promise((resolve, reject) => setTimeout(resolve, ms))
}

export const validateHex = (str: string = ''): boolean => {
  try {
    return /[0-9a-fA-F]{32}/.test(str)
  } catch (e) {
    return false
  }
}

export const validateWalletId = (walletId: string): boolean => {
  return /[0-9a-fA-F]{6}/.test(walletId)
}
export const generateWalletId = (): string => {
  return generateRandomHex(6)
}

export const generateRandomHex = (size: number): string => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

export const findNextLocalIdentityIndex = (existingIndices: number[]): number => {
  const occupied = new Set(existingIndices.filter((index) => Number.isSafeInteger(index) && index >= 0))
  let candidate = 0

  while (occupied.has(candidate)) {
    candidate += 1
  }

  return candidate
}

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

export const deriveKeystorePrivateKey = async (wallet: Wallet, password: string, identityId: string, keyId: number, keyPairRepository: KeypairRepository): Promise<PrivateKeyWASM> => {
  const exists = await keyPairRepository.isExisting(identityId, keyId)

  if (!exists) {
    throw new Error(`Could not find private key with KeyID ${keyId} for identity ${identityId}`)
  }

  const encryptedPrivateKey = await keyPairRepository.getEncryptedPrivateKey(identityId, keyId)

  const passwordHash = hash.sha256().update(password).digest('hex')

  let privateKey

  try {
    privateKey = decrypt(passwordHash, hexToBytes(encryptedPrivateKey))
  } catch (e) {
    console.error(e)
    throw new Error('Failed to decrypt')
  }

  return PrivateKeyWASM.fromBytes(privateKey, wallet.network)
}

export const decryptMnemonic = (wallet: Wallet, password: string): string => {
  if (wallet.encryptedMnemonic == null) {
    throw new Error('Missing mnemonic')
  }

  const passwordHash = hash.sha256().update(password).digest('hex')
  const secretKey = PrivateKey.fromHex(passwordHash)

  try {
    return bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
  } catch (e) {
    throw new Error('Failed to decrypt')
  }
}

export const deriveIdentityRegistrationKey = async (wallet: Wallet, password: string, identityIndex: number, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> => {
  const coinType = wallet.network === 'mainnet' ? 5 : 1
  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  const walletHDKey = sdk.keyPair.seedToHdKey(seed, wallet.network)
  const { privateKey } = await sdk.keyPair.derivePath(walletHDKey, `m/9'/${coinType}'/5'/1'/${identityIndex}`)

  if (privateKey == null) {
    throw new Error('Could not derive identity registration key from wallet hd key')
  }

  return PrivateKeyWASM.fromBytes(privateKey, wallet.network)
}

type WalletHdKey = ReturnType<DashPlatformSDK['keyPair']['seedToHdKey']>

// Decrypts the mnemonic and builds the wallet HD root once. Callers that derive
// many child keys (e.g. the top-up gap-scan) should build it once and reuse it
// instead of re-decrypting per index.
export const deriveWalletHdKey = (wallet: Wallet, password: string, sdk: DashPlatformSDK): WalletHdKey => {
  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))

  return sdk.keyPair.seedToHdKey(seed, wallet.network as any)
}

// Derives the DIP-0013 top-up funding key (m/9'/coin'/5'/2'/N) from an already
// built wallet HD key. The index is a flat per-wallet counter, unlike
// registration which keys off identityIndex on the 5'/1' branch. Deterministic
// derivation is what lets the gap-scan find the next unused funding address and
// recover an interrupted top-up.
export const deriveTopUpKeyFromHdKey = async (walletHdKey: WalletHdKey, network: Wallet['network'], topUpIndex: number, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> => {
  const coinType = network === 'mainnet' ? 5 : 1
  const { privateKey } = await sdk.keyPair.derivePath(walletHdKey, `m/9'/${coinType}'/5'/2'/${topUpIndex}`)

  if (privateKey == null) {
    throw new Error('Could not derive identity top-up key from wallet hd key')
  }

  return PrivateKeyWASM.fromBytes(privateKey, network)
}

export const deriveIdentityTopUpKey = async (wallet: Wallet, password: string, topUpIndex: number, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> => {
  const walletHdKey = deriveWalletHdKey(wallet, password, sdk)

  return await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, topUpIndex, sdk)
}

export const deriveIdentityPrivateKey = async (wallet: Wallet, password: string, identityIndex: number, keyId: number, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> => {
  const network = Network[wallet.network as keyof typeof Network]
  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  const walletHDKey = sdk.keyPair.seedToHdKey(seed, network)
  const { privateKey } = sdk.keyPair.deriveIdentityPrivateKey(walletHDKey, identityIndex, keyId, network)

  if (privateKey == null) {
    throw new Error('Could not derive private key from wallet hd key')
  }

  return PrivateKeyWASM.fromBytes(privateKey, wallet.network)
}

export interface PlatformAddressEntry {
  address: string
  derivationPath: string
  index: number
}

// Derive the DIP-17 account-level extended public key (xpub) for the clear-funds
// key class (m/9'/coin'/17'/account'/0'). Needs the password (decrypts the seed),
// but only once per account — the xpub then derives every address index publicly,
// with no further access to the seed.
export const derivePlatformAccountXpub = async (wallet: Wallet, password: string, account: number, sdk: DashPlatformSDK): Promise<string> => {
  if (wallet.type !== 'seedphrase') {
    throw new Error('Platform addresses can only be derived from a seedphrase wallet')
  }

  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))

  return await sdk.keyPair.derivePlatformAccountXpub(seed, wallet.network, account)
}

// Derive `count` transparent P2PKH platform addresses from an account xpub.
// The address index is non-hardened, so public-only derivation reproduces the
// exact same addresses as the private path — no seed/password required. The
// address derivation and DIP-18 encoding live in the SDK; here we only expand
// the range and label each entry with its derivation path.
export const derivePlatformAddressesFromXpub = (sdk: DashPlatformSDK, xpub: string, network: NetworkType, account: number, count: number, start: number = 0): PlatformAddressEntry[] => {
  const coinType = PLATFORM_ADDRESS_COIN_TYPE[network]

  const entries: PlatformAddressEntry[] = []
  for (let offset = 0; offset < count; offset++) {
    const index = start + offset
    const address = sdk.keyPair.derivePlatformAddressFromXpub(xpub, network, index).toBech32m(network)
    const derivationPath = `m/9'/${coinType}'/${PLATFORM_ADDRESS_FEATURE}'/${account}'/${PLATFORM_ADDRESS_KEY_CLASS_CLEAR_FUNDS}'/${index}`
    entries.push({ address, derivationPath, index })
  }

  return entries
}

// Derive the private key for one of our DIP-17 platform addresses by its index:
// m/9'/coin'/17'/account'/0'/index. Needs the password (decrypts the seed). Used
// to sign a transfer that spends from that address.
export const derivePlatformAddressPrivateKey = async (wallet: Wallet, password: string, account: number, index: number, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> => {
  if (wallet.type !== 'seedphrase') {
    throw new Error('Platform addresses can only be derived from a seedphrase wallet')
  }

  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))

  return await sdk.keyPair.derivePlatformAddressPrivateKey(seed, wallet.network, account, index)
}

// Loads the wallet's created platform addresses (0..count-1) with their on-chain
// balance and nonce, as source candidates for a transfer / top-up / withdrawal.
// Balances are matched by canonical address, not by response order.
export const buildPlatformSourceCandidates = async (sdk: DashPlatformSDK, xpub: string, network: NetworkType, account: number, count: number): Promise<PlatformSourceCandidate[]> => {
  const created = derivePlatformAddressesFromXpub(sdk, xpub, network, account, count)

  if (created.length === 0) {
    return []
  }

  const infos = await sdk.platformAddresses.getAddressesInfos(created.map(entry => entry.address))
  const infoByAddress = new Map(infos.map(info => [
    info.address.toBech32m(network),
    { balance: info.balance, nonce: info.nonce }
  ]))

  return created.map(entry => {
    const info = infoByAddress.get(entry.address)

    return {
      platformAddress: entry.address,
      derivationPath: entry.derivationPath,
      index: entry.index,
      balanceCredits: info?.balance ?? 0n,
      nonce: info?.nonce ?? 0
    }
  })
}

// Decode a Core (L1) base58check address into a P2PKH/P2SH script, for use as a
// withdrawal recipient. Verifies the checksum and the network version byte.
export const coreAddressToScript = (coreAddress: string, network: NetworkType): CoreScriptWASM => {
  let decoded: Uint8Array
  try {
    decoded = base58.decode(coreAddress)
  } catch {
    throw new Error(`Invalid Core address: ${coreAddress}`)
  }

  if (decoded.length !== 25) {
    throw new Error(`Invalid Core address length: ${coreAddress}`)
  }

  const payload = decoded.slice(0, 21)
  const checksum = decoded.slice(21)
  const digest = hash.sha256().update(hash.sha256().update(payload).digest()).digest()

  for (let i = 0; i < 4; i++) {
    if (digest[i] !== checksum[i]) {
      throw new Error(`Invalid Core address checksum: ${coreAddress}`)
    }
  }

  const version = decoded[0]
  const hash160 = decoded.slice(1, 21)
  const versions = CORE_ADDRESS_VERSIONS[network]

  if (version === versions.pubKeyHash) {
    return CoreScriptWASM.newP2PKH(hash160)
  }
  if (version === versions.scriptHash) {
    return CoreScriptWASM.newP2SH(hash160)
  }

  throw new Error(`Core address ${coreAddress} is not a valid ${network} address`)
}

export interface ShieldedAddressEntry {
  address: string
  derivationPath: string
  diversifierIndex: number
}

// Derive `count` diversified Orchard (shielded) addresses for an account.
// ZIP-32 m/32'/coinType'/account'; each diversifierIndex yields a distinct
// receiving address sharing the account's viewing key. Needs the password
// (decrypts the seed).
export const deriveShieldedAddresses = (wallet: Wallet, password: string, account: number, count: number, sdk: DashPlatformSDK): ShieldedAddressEntry[] => {
  if (wallet.type !== 'seedphrase') {
    throw new Error('Shielded addresses can only be derived from a seedphrase wallet')
  }

  const networkType = wallet.network
  const network = Network[networkType as keyof typeof Network]
  const seed = sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, password))
  const coinType = PLATFORM_ADDRESS_COIN_TYPE[networkType]
  const derivationPath = `m/32'/${coinType}'/${account}'`

  const entries: ShieldedAddressEntry[] = []
  for (let diversifierIndex = 0; diversifierIndex < count; diversifierIndex++) {
    const orchardAddress = sdk.keyPair.deriveShieldedAddress(seed, network, account, diversifierIndex)
    entries.push({ address: orchardAddress.toBech32m(networkType), derivationPath, diversifierIndex })
  }

  return entries
}

// Pages the entire shielded note set (commitment-tree leaves) from the pool,
// preserving global leaf order so a leaf position maps to its array index.
// Read-only — no Halo2 builder is constructed.
export const fetchAllShieldedNotes = async (sdk: DashPlatformSDK): Promise<ShieldedEncryptedNote[]> => {
  const total = await sdk.shielded.getShieldedNotesCount()

  if (total == null || total === 0n) {
    return []
  }

  const notes: ShieldedEncryptedNote[] = []
  for (let start = 0n; start < total; start += BigInt(SHIELDED_NOTES_PAGE_SIZE)) {
    const page = await sdk.shielded.getShieldedEncryptedNotes(start, SHIELDED_NOTES_PAGE_SIZE)

    if (page.length === 0) {
      break
    }

    notes.push(...page)
  }

  return notes
}

// The nullifier of a recovered note as derived from the wallet's viewing key —
// the value to check against getShieldedNullifiers to tell whether THIS note has
// been spent.
//
// This is NOT the action leaf's nullifier (`ShieldedEncryptedNote.nullifier` /
// `SerializedAction.nullifier`): a leaf's nullifier belongs to the note that
// action spent (its input), which is unrelated to our received note. Checking
// the leaf nullifier lets an already-spent note pass the spent filter, so it can
// be reselected and the spend is rejected on-chain with "Nullifier has already
// been spent".
//
// STOPGAP: the SDK's RecoveredNoteWASM wrapper does not expose this yet (only
// `index` / `note`), so we reach into the raw NAPI. TODO: drop the cast once
// dash-platform-sdk / pshenmic-dpp add a public RecoveredNoteWASM.nullifier
// getter.
interface RawRecoveredNoteWithNullifier {
  _rawRecoveredNote: { nullifier: Uint8Array }
}

export const recoveredNoteNullifier = (recoveredNote: RecoveredNoteWASM): Uint8Array => {
  return (recoveredNote as unknown as RawRecoveredNoteWithNullifier)._rawRecoveredNote.nullifier
}

export interface ShieldedAddressBalance {
  // Diversified Orchard address (bech32m) that received the notes.
  address: string
  // Our derivation index for this address, or null when it falls outside the
  // derived window (the balance is still counted, only the index is unknown).
  diversifierIndex: number | null
  balance: bigint
  spendableNotes: number
}

// Sums the value of recovered notes that are not yet spent, both in aggregate
// and grouped by the diversified Orchard address that received each note
// (`note.address` from the trial-decrypted plaintext). Spent status is matched
// by each note's own nullifier (see recoveredNoteNullifier), by nullifier hex —
// not array order, since getShieldedNullifiers does not guarantee response order.
// `diversifierIndexByAddress` attributes our known address indices; a note to an
// address outside that map gets diversifierIndex null.
export const sumUnspentShieldedValue = (
  recovered: RecoveredNoteWASM[],
  statuses: ShieldedNullifierStatus[],
  network: NetworkType,
  diversifierIndexByAddress: Map<string, number> = new Map()
): { balance: bigint, spendableNotes: number, byAddress: ShieldedAddressBalance[] } => {
  const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))

  let balance = 0n
  let spendableNotes = 0
  const buckets = new Map<string, { balance: bigint, spendableNotes: number }>()

  for (const recoveredNote of recovered) {
    if (spent.has(bytesToHex(recoveredNoteNullifier(recoveredNote)))) {
      continue
    }

    const value = recoveredNote.note.value
    balance += value
    spendableNotes += 1

    const address = recoveredNote.note.address.toBech32m(network)
    const bucket = buckets.get(address) ?? { balance: 0n, spendableNotes: 0 }
    bucket.balance += value
    bucket.spendableNotes += 1
    buckets.set(address, bucket)
  }

  const byAddress: ShieldedAddressBalance[] = Array.from(buckets.entries()).map(([address, bucket]) => ({
    address,
    diversifierIndex: diversifierIndexByAddress.get(address) ?? null,
    balance: bucket.balance,
    spendableNotes: bucket.spendableNotes
  }))

  return { balance, spendableNotes, byAddress }
}

export interface ShieldedSpendInputs {
  spends: SpendableNoteWASM[]
  anchor: Uint8Array
  changeAddress: OrchardAddressWASM
  coinType: number
}

// Narrows recovered notes to those received on one of `fromAddresses` (bech32m),
// so a spend can draw only from specific source shielded addresses instead of the
// whole account. Notes are keyed by their receiving address (`note.address`).
export const filterRecoveredNotesByAddress = (notes: RecoveredNoteWASM[], fromAddresses: string[], network: NetworkType): RecoveredNoteWASM[] => {
  const wanted = new Set(fromAddresses)

  return notes.filter(recoveredNote => wanted.has(recoveredNote.note.address.toBech32m(network)))
}

// Selects the fewest notes (largest first) whose combined value covers
// `requiredCredits`. Minimizing the note count keeps the Orchard bundle — one
// action per note — under Platform's state-transition size limit. Throws if the
// notes cannot cover the amount, or if even the minimal set exceeds the action cap.
const selectShieldedNotes = (spendable: RecoveredNoteWASM[], requiredCredits: bigint): RecoveredNoteWASM[] => {
  const byValueDesc = [...spendable].sort((a, b) => (a.note.value < b.note.value ? 1 : -1))

  const selected: RecoveredNoteWASM[] = []
  let total = 0n
  for (const note of byValueDesc) {
    if (total >= requiredCredits) {
      break
    }
    selected.push(note)
    total += note.note.value
  }

  if (total < requiredCredits) {
    throw new Error('Insufficient shielded balance for this amount plus fee')
  }
  if (selected.length > SHIELDED_MAX_SPEND_NOTES) {
    throw new Error(`This spend requires ${selected.length} notes, over the ${SHIELDED_MAX_SPEND_NOTES}-note limit per shielded transaction — consolidate notes first`)
  }

  return selected
}

// Prepares the shared inputs for any shielded spend (transfer / unshield /
// withdrawal): syncs the full note set, recovers the wallet's own notes, keeps
// only the unspent ones, selects the minimal set covering `requiredCredits`
// (amount + fee), witnesses just those against the commitment tree, and derives
// the change address. The Halo2 builder is not touched here — proving happens
// inside the createStateTransition call the handler makes with these inputs.
// `fromAddresses` (optional) restricts the spend to notes on those source
// shielded addresses; when omitted, the whole account's notes are eligible.
export const prepareShieldedSpend = async (sdk: DashPlatformSDK, seed: Uint8Array, network: NetworkType, account: number, requiredCredits: bigint, fromAddresses?: string[]): Promise<ShieldedSpendInputs> => {
  console.time('[shielded] sync notes')
  const allNotes = await fetchAllShieldedNotes(sdk)
  console.timeEnd('[shielded] sync notes')
  console.log(`[shielded] synced ${allNotes.length} notes; recovering own notes…`)

  const recovered = sdk.shielded.recoverNotes(allNotes, seed, account)

  if (recovered.length === 0) {
    throw new Error('No shielded notes available to spend')
  }

  // Drop already-spent notes (their nullifiers are on-chain) so they never enter
  // a spend — matching how the balance is computed. Uses each note's own
  // nullifier (recoveredNoteNullifier), not the action leaf's, so a note we
  // already spent is excluded instead of being reselected and rejected on-chain.
  const nullifiers = recovered.map(recoveredNoteNullifier)
  const statuses = nullifiers.length > 0 ? await sdk.shielded.getShieldedNullifiers(nullifiers) : []
  const spent = new Set(statuses.filter(status => status.isSpent).map(status => bytesToHex(status.nullifier)))

  const unspent = recovered.filter(recoveredNote => !spent.has(bytesToHex(recoveredNoteNullifier(recoveredNote))))

  if (unspent.length === 0) {
    throw new Error('No unspent shielded notes available to spend')
  }

  // Optionally restrict the spend to notes on specific source addresses.
  const scoped = fromAddresses != null && fromAddresses.length > 0
    ? filterRecoveredNotesByAddress(unspent, fromAddresses, network)
    : unspent

  if (scoped.length === 0) {
    throw new Error('No unspent shielded notes on the selected source address(es)')
  }

  const selected = selectShieldedNotes(scoped, requiredCredits)
  console.log(`[shielded] selected ${selected.length}/${scoped.length} notes; witnessing against the tree…`)

  console.time('[shielded] build spendable notes')
  const { spends, anchor } = sdk.shielded.buildSpendableNotes(allNotes, selected)
  console.timeEnd('[shielded] build spendable notes')

  const changeAddress = sdk.keyPair.deriveShieldedAddress(seed, network, account)

  return { spends, anchor, changeAddress, coinType: PLATFORM_ADDRESS_COIN_TYPE[network] }
}

export const fetchIdentitiesBySeed = async (seed: Uint8Array, sdk: DashPlatformSDK, network: Network): Promise<IdentityWASM[]> => {
  const walletHDKey = sdk.keyPair.seedToHdKey(seed, network)

  const identities = []

  let identity = null
  let identityIndex = 0

  do {
    const hdKey = sdk.keyPair.deriveIdentityPrivateKey(walletHDKey, identityIndex, 0, network)
    const privateKey = hdKey.privateKey

    if (privateKey == null) {
      throw new Error('Could not derive private key from wallet hd key')
    }

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

export const popupWindow = (url: string, windowName: string, win: Window, w: number, h: number): Window | null => {
  if (win.top == null) {
    throw new Error('Could not detect window size')
  }

  const y = win.top.outerHeight / 2 + win.top.screenY - (h / 2)
  const x = win.top.outerWidth / 2 + win.top.screenX - (w / 2)

  return win.open(url, windowName, `popup, width=${w}, height=${h}, top=${y}, left=${x}`)
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
  // 1 DASH = 100,000,000,000 credits (10^11)
  return numericCredits / 1e11
}

export * from './bigintUtils'

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
  } catch (e) {}

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

export const isTooBigNumber = (number: number | string | bigint): boolean => Number(number) > 999999999

export * from './recipientSearch'
