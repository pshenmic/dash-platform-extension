import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK, Output, PrivateKey, Transaction } from 'dash-core-sdk'
import { KeyType, Network, PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import { WalletRepository } from '../repository/WalletRepository'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { IdentityFundingRepository } from '../repository/IdentityFundingRepository'
import { CoreExplorerService } from './CoreExplorerService'
import { IdentityFundingOperation } from '../../types/IdentityFundingOperation'
import { RepositoryScope } from '../../types/RepositoryScope'
import { Wallet } from '../../types/Wallet'
import { CoreUtxo } from '../../types/CoreUtxo'
import { CoreAddressChain } from '../../types/enums/CoreAddressChain'
import { IdentityType } from '../../types/enums/IdentityType'
import {
  deriveWalletHdKey,
  deriveIdentityPrivateKey,
  deriveIdentityRegistrationKey,
  deriveIdentityTopUpKey
} from '../../utils'
import { CoreAddressEntry, deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../utils/coreAddresses'
import { CoreAssetLockPlan, buildAssetLockFromUtxos } from '../../utils/buildAssetLockFromUtxos'
import { buildIdentityCreateTransition, IDENTITY_KEY_DEFINITIONS } from '../../utils/identityRegistration'
import { isTransitionAlreadyKnownError } from '../../utils/identityFundingErrors'
import { isIdentityNotFoundError } from '../../utils/isIdentityNotFoundError'
import { AssetLockProof } from '../../types/AssetLockProof'
import { IDENTITY_INDEX_SCAN_LIMIT } from '../../constants'

export interface IdentityFundingClients {
  sdk: DashPlatformSDK
  core: DashCoreSDK
}

// Largest address window read from the explorer on one chain.
const MAX_CORE_ADDRESS_WINDOW = 10000

// Identity funding primitives: key and index reservation, the Core asset lock
// quote and the network steps of an operation. The handlers compose them into the prepare
// and execute flows; the journal stores signed bytes, never private keys.
export class IdentityFundingService {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK
  explorer: CoreExplorerService

  // Separate SDK instances cannot be repointed by SWITCH_NETWORK mid-operation.
  private readonly clients = new Map<string, IdentityFundingClients>()

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK, coreSDK: DashCoreSDK, explorer: CoreExplorerService) {
    this.walletRepository = walletRepository
    this.sdk = sdk
    this.coreSDK = coreSDK
    this.explorer = explorer
  }

  repository (scope: RepositoryScope): IdentityFundingRepository {
    return new IdentityFundingRepository(this.walletRepository.storageAdapter, scope)
  }

  clientsFor (scope: RepositoryScope): IdentityFundingClients {
    let clients = this.clients.get(scope.network)

    if (clients == null) {
      const options = this.sdk.getNetwork() === scope.network ? this.sdk.options : undefined
      clients = {
        sdk: new DashPlatformSDK({ ...options, network: scope.network as Network }),
        core: this.coreSDK.network === scope.network ? this.coreSDK : new DashCoreSDK({ network: scope.network })
      }
      this.clients.set(scope.network, clients)
    }

    return clients
  }

  // ── Keys and indexes ─────────────────────────────────────────────────────────

  // The first identity index past every one already taken whose auth key is not
  // registered on chain, e.g. by the same seed in another install.
  async reserveIdentityIndex (wallet: Wallet, password: string, sdk: DashPlatformSDK, taken: number[]): Promise<number> {
    const start = Math.max(-1, ...taken) + 1

    for (let index = start; index < start + IDENTITY_INDEX_SCAN_LIMIT; index++) {
      const key = await deriveIdentityPrivateKey(wallet, password, index, 0, sdk)

      if (!(await this.isAuthKeyRegistered(sdk, key.getPublicKeyHash()))) {
        return index
      }
    }

    throw new Error('Could not find a free identity index')
  }

  // The first DIP-13 top-up index past every one already taken whose funding
  // address the explorer has never seen, so an imported seed skips spent ones.
  async reserveTopUpIndex (wallet: Wallet, password: string, sdk: DashPlatformSDK, taken: number[]): Promise<number> {
    const start = Math.max(-1, ...taken) + 1

    for (let index = start; index < start + IDENTITY_INDEX_SCAN_LIMIT; index++) {
      const key = await deriveIdentityTopUpKey(wallet, password, index, sdk)
      const address = sdk.keyPair.p2pkhAddress(key.getPublicKey().bytes(), wallet.network as Network)

      if (!(await this.explorer.isAddressUsed(address, wallet.network))) {
        return index
      }
    }

    throw new Error('Could not find a free top-up key index')
  }

  async identityKeys (operation: IdentityFundingOperation, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<PrivateKeyWASM[]> {
    if (operation.identityIndex == null) {
      throw new Error('Missing reserved identity index')
    }

    const identityIndex = operation.identityIndex

    return await Promise.all(IDENTITY_KEY_DEFINITIONS.map(async key => await deriveIdentityPrivateKey(wallet, password, identityIndex, key.id, sdk)))
  }

  // The DIP-13 key that owns the asset lock credit output and signs its transition.
  async creditKey (operation: IdentityFundingOperation, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<PrivateKeyWASM> {
    if (operation.kind === 'registration' && operation.identityIndex != null) {
      return await deriveIdentityRegistrationKey(wallet, password, operation.identityIndex, sdk)
    }
    if (operation.kind === 'topUp' && operation.topUpIndex != null) {
      return await deriveIdentityTopUpKey(wallet, password, operation.topUpIndex, sdk)
    }

    throw new Error('Missing reserved DIP-13 key index')
  }

  // ── Core source ──────────────────────────────────────────────────────────────

  // The account xpub, derived and cached if this wallet has none yet.
  async coreAccountXpub (walletRepository: WalletRepository, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<string> {
    const cached = await walletRepository.getCoreAccountXpub(0)

    if (cached != null) {
      return cached
    }

    const xpub = await deriveCoreAccountXpub(wallet, password, 0, sdk)
    await walletRepository.setCoreAccountXpub(0, xpub)

    return xpub
  }

  // Every confirmed output the account can sign for, with its derivation, plus
  // the explorer's next unused index on the change chain.
  async loadSpendableUtxos (xpub: string, wallet: Wallet, sdk: DashPlatformSDK): Promise<{ utxos: CoreUtxo[], nextUnusedChange: number }> {
    const summary = await this.explorer.getXpubSummary(xpub, wallet.network)

    // Every used address sits below the explorer's next unused index on its
    // chain, so this window holds the key for any output the account owns.
    const signable = new Map<string, CoreAddressEntry>()
    for (const chain of [CoreAddressChain.receiving, CoreAddressChain.change]) {
      const count = summary.nextUnused[chain] + 1

      if (!Number.isSafeInteger(count) || count < 1 || count > MAX_CORE_ADDRESS_WINDOW) {
        throw new Error('Invalid Core explorer address range')
      }

      for (const entry of deriveCoreAddressesFromXpub(sdk, xpub, wallet.network, 0, chain, count)) {
        signable.set(entry.address, entry)
      }
    }

    const utxos: CoreUtxo[] = []
    for (const output of await this.explorer.getXpubUtxos(xpub, wallet.network)) {
      const entry = signable.get(output.address)

      // Outside the derived window this wallet cannot sign it; leave it be.
      if (entry != null) {
        utxos.push({ ...entry, txid: output.txid, vout: output.vout, amount: output.amount.toString() })
      }
    }

    return { utxos, nextUnusedChange: summary.nextUnused.change }
  }

  changeAddress (xpub: string, wallet: Wallet, sdk: DashPlatformSDK, index: number): string {
    return deriveCoreAddressesFromXpub(sdk, xpub, wallet.network, 0, CoreAddressChain.change, 1, index)[0].address
  }

  // Checks each selected input against its raw parent transaction — it must
  // exist, pay this address this amount, and be locked or deeply confirmed —
  // rather than trusting the explorer's report. Records the lock state found.
  async verifyUtxoParents (inputs: CoreUtxo[], core: DashCoreSDK): Promise<void> {
    for (const input of inputs) {
      const parent = await core.getTransaction(input.txid)
      const tx = Transaction.fromBytes(parent.transaction)
      const output = tx.outputs[input.vout]
      const expectedScript = Output.createP2PKH(0n, input.address).script.hex()

      if (tx.hash() !== input.txid || output == null || output.satoshis !== BigInt(input.amount) || output.script.hex() !== expectedScript) {
        throw new Error('Core explorer returned an invalid or foreign UTXO')
      }

      const confirmed = Number.isSafeInteger(parent.confirmations) && parent.confirmations >= 6

      if (!parent.isInstantLocked && !parent.isChainLocked && !confirmed) {
        throw new Error('Core input is not sufficiently confirmed')
      }

      input.confirmations = parent.confirmations
      input.isInstantLocked = parent.isInstantLocked
      input.isChainLocked = parent.isChainLocked
    }
  }

  // Signs the planned asset lock, one derived BIP44 key per input.
  async signAssetLock (plan: CoreAssetLockPlan, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<Transaction> {
    const root = deriveWalletHdKey(wallet, password, sdk)
    const keys: PrivateKey[] = []

    for (const input of plan.inputs) {
      const child = await sdk.keyPair.derivePath(root, input.derivationPath)

      if (child.privateKey == null) {
        throw new Error('Could not derive Core input key')
      }

      keys.push(PrivateKey.fromBytes(child.privateKey, wallet.network))
    }

    return buildAssetLockFromUtxos(plan, keys)
  }

  // The Platform fee of the transition this asset lock will fund. A mined proof is
  // not needed to size it: a placeholder chain proof of the same shape is used and
  // never stored. Instant proofs are larger, so the estimate is doubled.
  async estimateAssetLockTransitionFee (operation: IdentityFundingOperation, assetLockTxid: string, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<bigint> {
    const proof: AssetLockProof = { type: 'chainLock', txid: assetLockTxid, outputIndex: 0, coreChainLockedHeight: 1 }
    const transition = await this.buildAssetLockTransition(operation, proof, wallet, password, sdk)

    return transition.calculateMinRequiredFee() * 2n
  }

  // Broadcasts the asset lock. A lost response is fine when the network already
  // holds this exact transaction; any other failure is surfaced.
  async broadcastAssetLock (tx: Transaction, core: DashCoreSDK): Promise<void> {
    try {
      await core.broadcastTransaction(tx.bytes())
    } catch (error) {
      const known = await core.getTransaction(tx.hash()).catch(() => null)

      if (known == null || Transaction.fromBytes(known.transaction).hash() !== tx.hash()) {
        throw error
      }
    }
  }

  // The identity create or top-up transition spending the asset lock, signed by
  // the DIP-13 credit key.
  async buildAssetLockTransition (operation: IdentityFundingOperation, proof: AssetLockProof, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<StateTransitionWASM> {
    const creditKey = await this.creditKey(operation, wallet, password, sdk)

    if (operation.kind === 'registration') {
      return buildIdentityCreateTransition(await this.identityKeys(operation, wallet, password, sdk), creditKey, proof, sdk)
    }

    const transition = sdk.identities.createStateTransition('topUp', { identityId: operation.identityId as string, assetLockProof: proof })
    transition.signByPrivateKey(creditKey, undefined, KeyType.ECDSA_SECP256K1)

    return transition
  }

  // ── Platform result ──────────────────────────────────────────────────────────

  // Sends the saved transition. Resending bytes the network already holds is not
  // an error; every other rejection is surfaced as is.
  async broadcastTransition (sdk: DashPlatformSDK, transition: StateTransitionWASM): Promise<void> {
    try {
      await sdk.stateTransitions.broadcast(transition)
    } catch (error) {
      if (!isTransitionAlreadyKnownError(error)) {
        throw error
      }
    }
  }

  // Finds the identity a confirmed registration created and stores it in the
  // pinned wallet as the selected identity. Null when Platform holds none.
  async saveRegisteredIdentity (operation: IdentityFundingOperation, walletRepository: WalletRepository, wallet: Wallet, password: string, sdk: DashPlatformSDK): Promise<string | null> {
    const key = await deriveIdentityPrivateKey(wallet, password, operation.identityIndex as number, 0, sdk)
    const identity = await sdk.identities.getIdentityByPublicKeyHash(key.getPublicKeyHash())

    if (identity == null) {
      return null
    }

    const identityId = identity.id.base58()
    const identities = new IdentitiesRepository(this.walletRepository.storageAdapter, sdk, operation)

    if (await identities.getByIdentifier(identityId) == null) {
      await identities.create(identityId, IdentityType.regular, operation.identityIndex as number)
    }

    await walletRepository.switchIdentity(identityId)

    return identityId
  }

  // ── Funding sources ──────────────────────────────────────────────────────────

  async coreBalanceCredits (walletRepository: WalletRepository, network: Wallet['network']): Promise<string> {
    const xpub = await walletRepository.getCoreAccountXpub(0)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized; unlock this wallet first')
    }

    const summary = await this.explorer.getXpubSummary(xpub, network)

    return (summary.balance * 1000n).toString()
  }

  private async isAuthKeyRegistered (sdk: DashPlatformSDK, publicKeyHash: string): Promise<boolean> {
    const lookups = [
      async () => await sdk.identities.getIdentityByPublicKeyHash(publicKeyHash),
      async () => await sdk.identities.getIdentityByNonUniquePublicKeyHash(publicKeyHash)
    ]

    for (const lookup of lookups) {
      try {
        if ((await lookup()) != null) {
          return true
        }
      } catch (error) {
        if (!isIdentityNotFoundError(error)) {
          throw error
        }
      }
    }

    return false
  }
}
