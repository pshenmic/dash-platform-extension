import { DashCoreSDK, Transaction } from 'dash-core-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { EventData, Wallet } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { RegisterIdentityPayload } from '../../../../types/messages/payloads/RegisterIdentityPayload'
import { RegisterIdentityResponse } from '../../../../types/messages/response/RegisterIdentityResponse'
import { IdentityType } from '../../../../types/enums/IdentityType'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { CoreAssetLockService } from '../../../services/CoreAssetLockService'
import { selectAssetLockUtxos } from '../../../../utils/buildAssetLockFromUtxos'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { IDENTITY_KEY_DEFINITIONS, buildIdentityCreateTransition } from '../../../../utils/identityRegistration'
import {
  deriveIdentityPrivateKey,
  deriveIdentityRegistrationKey,
  findNextLocalIdentityIndex,
  hexToBytes,
  wait
} from '../../../../utils'
import { txidToFilterBytes } from '../../../../utils/txidToFilterBytes'
import { isStateTransitionAlreadyInChainError } from '../../../../utils/isStateTransitionAlreadyInChainError'
import { isIdentityNotFoundError } from '../../../../utils/isIdentityNotFoundError'
import { WalletType } from '../../../../types/WalletType'
import { TXID_HEX_LENGTH, IDENTITY_INDEX_SCAN_LIMIT, REGISTRATION_CONFIRM_TIMEOUT_MS } from '../../../../constants'

export class RegisterIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  coreAssetLock: CoreAssetLockService
  identitiesRepository: IdentitiesRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    storageAdapter: StorageAdapter,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK,
    coreAssetLock: CoreAssetLockService
  ) {
    this.coreAssetLock = coreAssetLock
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<RegisterIdentityResponse> {
    const payload: RegisterIdentityPayload = event.payload

    // ── 1. Validate wallet and network context ──────────────────────────────
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('Identity registration is only supported for seedphrase wallets')
    }

    // ── 2. Load the asset lock record ───────────────────────────────────────
    // Either a deposit the user paid to a one-off address, or - when no address is
    // given - the wallet's own coins. In that mode the record is keyed by the
    // credit output address and may not exist yet; an unfinished one is picked up
    // so a retry continues the same asset lock.
    const selfFunded = payload.assetLockFundingAddress == null
    let assetLockFundingAddressEntry = selfFunded
      ? await this.unfinishedSelfFundedEntry()
      : await this.assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress as string)

    if (!selfFunded && assetLockFundingAddressEntry == null) {
      throw new Error(
        `Asset lock funding address ${String(payload.assetLockFundingAddress)} not found. ` +
        'It may belong to a different wallet or network.'
      )
    }

    if (assetLockFundingAddressEntry?.used === true) {
      throw new Error(`Asset lock funding address ${assetLockFundingAddressEntry.address} has already been used for registration`)
    }

    // ── 3. Decrypt the one-time funding key ─────────────────────────────────
    // The funding key signs the asset lock tx inputs only. Credit output
    // ownership and Platform ST signing are handled by identityRegistrationKey
    // derived in step 5 (DIP-0013).
    // Own coins are signed by BIP44 keys derived from the seed, so there is no
    // one-off key to decrypt in that mode.
    let assetLockFundingPrivateKey: PrivateKeyWASM | null = null

    if (assetLockFundingAddressEntry?.encryptedPrivateKey != null) {
      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let assetLockFundingKeyBytes: Uint8Array
      try {
        assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
      } catch {
        throw new Error('Failed to decrypt asset lock funding key — wrong password or corrupted entry')
      }

      assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)
    }

    // ── 4. Determine the identity index ─────────────────────────────────────
    // The credit output address — and therefore the asset lock txid — is derived
    // from identityIndex. On a retry it MUST match the index the committed asset
    // lock funded; re-scanning could land on a different index (e.g. once the
    // first attempt's auth key is registered on-chain, or a local identity record
    // was left behind by a popup that closed mid-registration), which would
    // rebuild a different tx than the one already committed on L1.
    let identityIndex: number

    if (assetLockFundingAddressEntry?.registrationIdentityIndex != null) {
      // Recovery: reuse the index pinned for this asset lock. With own coins it is
      // pinned when the record is opened, before anything is broadcast.
      identityIndex = assetLockFundingAddressEntry.registrationIdentityIndex
    } else if (assetLockFundingAddressEntry?.assetLockTxid == null) {
      // Fresh registration: scan for the next free index on-chain.
      identityIndex = await this.scanFreeIdentityIndex(wallet, payload.password)
    } else {
      // Legacy recovery: the asset lock was broadcast before the index was
      // pinned. Recover it by finding the index whose rebuilt asset lock matches
      // the committed txid.
      identityIndex = await this.recoverIdentityIndexFromTxid(
        wallet,
        payload,
        assetLockFundingPrivateKey as PrivateKeyWASM,
        assetLockFundingAddressEntry.assetLockTxid
      )
    }

    // ── 5. Derive identity registration key (DIP-0013 path 5'/1'/index) ────
    // This key owns the asset lock credit output and signs the
    // IdentityCreateTransition. Derived from seed — recoverable without storage.
    const identityRegistrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
    const creditOutputAddress = this.creditOutputAddress(identityRegistrationKey, wallet.network)

    // ── 6. Build asset lock transaction ─────────────────────────────────────
    // A deposit is spent by its one-time key and rebuilds byte for byte on retry.
    // Own coins are selected once, signed, and the signed transaction is stored
    // before it is broadcast: the wallet's UTXO set moves, so a retry must send
    // that transaction rather than select again.
    let assetLockTx: Transaction

    if (selfFunded) {
      assetLockTx = assetLockFundingAddressEntry?.assetLockTx != null
        ? Transaction.fromHex(assetLockFundingAddressEntry.assetLockTx)
        : await this.openSelfFundedAssetLock(wallet, payload, creditOutputAddress, identityIndex)

      assetLockFundingAddressEntry = await this.assetLockFundingAddressesRepository.getByAddress(creditOutputAddress)
    } else {
      assetLockTx = (await buildAssetLockFromFundingTx(
        this.coreSDK,
        payload.assetLockFundingTxid as string,
        payload.assetLockFundingAddress as string,
        (assetLockFundingPrivateKey as PrivateKeyWASM).WIF(),
        creditOutputAddress
      )).assetLockTx
    }

    const fundingAddress = selfFunded ? creditOutputAddress : payload.assetLockFundingAddress as string
    const assetLockTxid = assetLockTx.hash()

    if (
      assetLockFundingAddressEntry?.assetLockTxid != null &&
      assetLockFundingAddressEntry.assetLockTxid !== assetLockTxid
    ) {
      throw new Error(
        `Asset lock funding address ${fundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${assetLockFundingAddressEntry.assetLockTxid})`
      )
    }

    // ── 7. Broadcast the asset lock transaction (skip if already broadcast) ─
    // The instant lock subscription is opened in both fresh and recovery modes
    // because waitForAssetLockProof needs it to receive instant lock events
    // for txs that are not yet chain-locked.
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [fundingAddress],
      [txidToFilterBytes(assetLockTxid)]
    )

    if (assetLockFundingAddressEntry?.assetLockTxid == null) {
      await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      // Persist the broadcasted txid AND the identity index before any further
      // work, so a retry after a crash rebuilds the exact same asset lock instead
      // of re-scanning to a different index.
      await this.assetLockFundingAddressesRepository.markAsBroadcasted(fundingAddress, assetLockTxid, identityIndex)
    }

    // ── 8. Wait for instant lock or chain lock (whichever comes first) ──────
    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    // ── 9. Derive all identity key pairs (HD-derived for recoverability) ────
    const identityPrivateKeys: PrivateKeyWASM[] = []

    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(
        await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, id, this.sdk)
      )
    }

    // ── 10. Build and sign identity create state transition ─────────────────
    // Signed by the identity registration key (DIP-0013) which owns the credit
    // output. The funding key is not used for Platform signing.
    const stateTransition = buildIdentityCreateTransition(
      identityPrivateKeys,
      identityRegistrationKey,
      assetLockProof,
      this.sdk
    )

    // ── 11. Derive the new identity identifier ──────────────────────────────
    const identifier = stateTransition.getOwnerId()?.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not derive identity identifier from state transition')
    }

    const stateTransitionHash: string = stateTransition.hash(false)

    // ── 12. Persist identity in repo before broadcasting the state transition.
    // If the broadcast fails with a non-idempotent error we roll back this
    // record so the local state never contains a phantom identity. If the
    // identifier is already present (e.g. previous attempt reached this step),
    // we treat it as recovery and skip the create.
    const existingIdentity = await this.identitiesRepository.getByIdentifier(identifier)
    let wasJustCreated = false

    if (existingIdentity == null) {
      await this.identitiesRepository.create(identifier, IdentityType.regular, identityIndex)
      wasJustCreated = true
    }

    // ── 13. Broadcast the state transition ──────────────────────────────────
    let alreadyOnPlatform = false

    try {
      await this.sdk.stateTransitions.broadcast(stateTransition)
    } catch (e) {
      if (isStateTransitionAlreadyInChainError(e)) {
        alreadyOnPlatform = true
      } else {
        if (wasJustCreated) {
          await this.identitiesRepository.remove(identifier)
        }
        throw e
      }
    }

    // ── 14. Best-effort confirmation. The identity is already created by the
    // broadcast above, so wait only briefly for finalization (usually 1-3s) and
    // return once it exists rather than blocking indefinitely if the confirmation
    // stream is slow. A genuine state-transition failure still rolls back.
    if (!alreadyOnPlatform) {
      try {
        await Promise.race([
          this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition),
          wait(REGISTRATION_CONFIRM_TIMEOUT_MS).then(() => { throw new Error('confirmation-timeout') })
        ])
      } catch (e) {
        const isTimeout = e instanceof Error && e.message === 'confirmation-timeout'

        if (!isTimeout) {
          if (wasJustCreated) {
            await this.identitiesRepository.remove(identifier)
          }

          throw e
        }
      }
    }

    // ── 15. Mark funding address as used and switch identity ────────────────
    await this.assetLockFundingAddressesRepository.markAsUsed(fundingAddress)
    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
      stateTransitionHash
    }
  }

  // The next identity index not occupied by a locally-stored identity.
  private async nextLocalIdentityIndex (): Promise<number> {
    const identities = await this.identitiesRepository.getAll()

    return findNextLocalIdentityIndex(identities.map((identity) => identity.index))
  }

  // Address that owns an asset lock credit output for a given registration key
  // (P2PKH of the DIP-0013 registration key at m/9'/coin'/5'/1'/identityIndex).
  // An asset lock this wallet already signed with its own coins and has not
  // finished. Such a record has no one-off key, which is what tells it apart from
  // a deposit address still waiting for money.
  private async unfinishedSelfFundedEntry (): Promise<AssetLockFundingAddressSchema | null> {
    const entries = await this.assetLockFundingAddressesRepository.findAllUnused('registration')

    return entries.find(entry => entry.encryptedPrivateKey == null) ?? null
  }

  // Selects the wallet's own coins, signs the asset lock and stores it together
  // with the identity index - before anything reaches the network. That order is
  // what makes a retry safe: the record already names the transaction to send and
  // the index whose credit address it pays to.
  private async openSelfFundedAssetLock (
    wallet: Wallet,
    payload: RegisterIdentityPayload,
    creditOutputAddress: string,
    identityIndex: number
  ): Promise<Transaction> {
    if (payload.amountCredits == null) {
      throw new Error('Funding an asset lock from your own coins needs an amount in credits')
    }

    const amountCredits = BigInt(payload.amountCredits)

    if (amountCredits % 1000n !== 0n) {
      throw new Error('Amount must be a whole number of duffs (1000 credits)')
    }

    const xpub = await this.coreAssetLock.accountXpub(this.walletRepository, wallet, payload.password)
    const [utxos, changeAddress, entries] = await Promise.all([
      this.coreAssetLock.spendableUtxos(xpub, wallet),
      this.coreAssetLock.changeAddress(xpub, wallet),
      this.assetLockFundingAddressesRepository.getAll()
    ])

    const plan = selectAssetLockUtxos(
      utxos,
      amountCredits / 1000n,
      creditOutputAddress,
      changeAddress,
      this.coreAssetLock.reservedOutpoints(entries)
    )

    const assetLockTx = await this.coreAssetLock.signPlan(plan, wallet, payload.password)

    await this.assetLockFundingAddressesRepository.create({
      address: creditOutputAddress,
      encryptedPrivateKey: null,
      used: false,
      assetLockTx: assetLockTx.hex(),
      registrationIdentityIndex: identityIndex,
      purpose: 'registration'
    })

    return assetLockTx
  }

  private creditOutputAddress (identityRegistrationKey: PrivateKeyWASM, network: Wallet['network']): string {
    return this.sdk.keyPair.p2pkhAddress(identityRegistrationKey.getPublicKey().bytes(), network as any)
  }

  // Scans for the next identity index whose auth key is not yet registered
  // on-chain, starting past the next locally-free index (skips indices whose
  // derived auth key is already registered, e.g. the same seedphrase used
  // elsewhere). Throws if none is found within the scan limit.
  private async scanFreeIdentityIndex (wallet: Wallet, password: string): Promise<number> {
    const startIndex = await this.nextLocalIdentityIndex()
    const scanLimit = startIndex + IDENTITY_INDEX_SCAN_LIMIT

    let identityIndex = startIndex

    while (identityIndex < scanLimit) {
      const authPrivateKey = await deriveIdentityPrivateKey(wallet, password, identityIndex, 0, this.sdk)

      if (!(await this.isIdentityRegistered(authPrivateKey.getPublicKeyHash()))) {
        return identityIndex
      }

      identityIndex++
    }

    throw new Error(
      `Could not find a free identity index within ${IDENTITY_INDEX_SCAN_LIMIT} indexes from ${startIndex}`
    )
  }

  // Recovers the identity index for an asset lock that was already broadcast but
  // whose index was not pinned (legacy entry). Rebuilds the asset lock for each
  // candidate index and returns the one whose txid matches the committed txid.
  // The original attempt picked the index via the free-index scan, so it lies in
  // the same window from 0. Throws if no candidate matches.
  private async recoverIdentityIndexFromTxid (wallet: Wallet, payload: RegisterIdentityPayload, assetLockFundingPrivateKey: PrivateKeyWASM, committedTxid: string): Promise<number> {
    const scanLimit = await this.nextLocalIdentityIndex() + IDENTITY_INDEX_SCAN_LIMIT

    for (let identityIndex = 0; identityIndex < scanLimit; identityIndex++) {
      const registrationKey = await deriveIdentityRegistrationKey(wallet, payload.password, identityIndex, this.sdk)
      const creditOutputAddress = this.creditOutputAddress(registrationKey, wallet.network)

      const { assetLockTx } = await buildAssetLockFromFundingTx(
        this.coreSDK,
        payload.assetLockFundingTxid as string,
        payload.assetLockFundingAddress as string,
        assetLockFundingPrivateKey.WIF(),
        creditOutputAddress
      )

      if (assetLockTx.hash() === committedTxid) {
        return identityIndex
      }
    }

    throw new Error(
      `Could not recover the identity index for the committed asset lock ${committedTxid} within ${IDENTITY_INDEX_SCAN_LIMIT} indexes`
    )
  }

  // Returns whether an identity is already registered on-chain for this auth
  // key public key hash. Only a genuine "not found" (from both the unique and
  // non-unique lookups) counts as a free index; any other error (network /
  // DAPI / proof) is rethrown so a transient failure is never mistaken for a
  // free index and used to register a colliding key.
  private async isIdentityRegistered (pkh: string): Promise<boolean> {
    const lookups = [
      async () => await this.sdk.identities.getIdentityByPublicKeyHash(pkh),
      async () => await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh)
    ]

    for (const lookup of lookups) {
      try {
        if ((await lookup()) != null) {
          return true
        }
      } catch (e) {
        if (!isIdentityNotFoundError(e)) {
          throw e
        }
      }
    }

    return false
  }

  validatePayload (payload: RegisterIdentityPayload): string | null {
    if (typeof payload.assetLockFundingAddress !== 'string' || payload.assetLockFundingAddress.length === 0) {
      return 'assetLockFundingAddress must be provided'
    }

    if (typeof payload.assetLockFundingTxid !== 'string' || payload.assetLockFundingTxid.length !== TXID_HEX_LENGTH) {
      return `assetLockFundingTxid must be a ${TXID_HEX_LENGTH}-character hex string`
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    return null
  }
}
