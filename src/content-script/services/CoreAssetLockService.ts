import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, Transaction } from 'dash-core-sdk'
import { WalletRepository } from '../repository/WalletRepository'
import { CoreExplorerService } from './CoreExplorerService'
import { Wallet } from '../../types/Wallet'
import { CoreUtxo } from '../../types/CoreUtxo'
import { CoreAddressChain } from '../../types/enums/CoreAddressChain'
import { AssetLockFundingAddressSchema } from '../storage/storageSchema'
import { deriveWalletHdKey } from '../../utils'
import { CoreAddressEntry, deriveCoreAccountXpub, deriveCoreAddressesFromXpub } from '../../utils/coreAddresses'
import { CoreAssetLockPlan, buildAssetLockFromUtxos } from '../../utils/buildAssetLockFromUtxos'

// Primitives for funding an asset lock with the wallet's own Core coins instead of
// a deposit to a one-off address: the spendable outputs, where change goes, which
// coins another unfinished asset lock already claimed, and the signing. The
// handlers decide when each one runs.
export class CoreAssetLockService {
  sdk: DashPlatformSDK
  explorer: CoreExplorerService

  constructor (sdk: DashPlatformSDK, explorer: CoreExplorerService) {
    this.sdk = sdk
    this.explorer = explorer
  }

  // The account xpub, cached on first use so later reads need no password. An xpub
  // that does not match this seed belongs to another wallet and is never
  // overwritten silently.
  async accountXpub (walletRepository: WalletRepository, wallet: Wallet, password: string): Promise<string> {
    const stored = await walletRepository.getCoreAccountXpub(0)
    const derived = await deriveCoreAccountXpub(wallet, password, 0, this.sdk)

    if (stored != null && stored !== derived) {
      throw new Error('Core xpub does not belong to this seed')
    }

    if (stored == null) {
      await walletRepository.setCoreAccountXpub(0, derived)
    }

    return derived
  }

  // Everything the account can spend right now, read by xpub so it covers addresses
  // this install never derived. Each output is matched back to the address entry it
  // belongs to, which carries the derivation path the signing needs; an output on an
  // address beyond the window is left out rather than guessed at.
  async spendableUtxos (xpub: string, wallet: Wallet): Promise<CoreUtxo[]> {
    const utxos = await this.explorer.getXpubUtxos(xpub, wallet.network)
    const derived = new Map(this.accountAddresses(xpub, wallet).map(entry => [entry.address, entry]))

    return utxos
      .filter(utxo => derived.has(utxo.address))
      .map(utxo => ({
        ...(derived.get(utxo.address) as CoreAddressEntry),
        txid: utxo.txid,
        vout: utxo.vout,
        amount: utxo.amount.toString()
      }))
  }

  // Both chains of the account, as far out as the wallet hands addresses.
  private accountAddresses (xpub: string, wallet: Wallet): CoreAddressEntry[] {
    return [CoreAddressChain.receiving, CoreAddressChain.change].flatMap(chain =>
      deriveCoreAddressesFromXpub(this.sdk, xpub, wallet.network, 0, chain, CORE_ADDRESS_WINDOW))
  }

  // Change goes to the next change address the explorer has not seen used, so two
  // asset locks in a row do not pay themselves to the same one.
  async changeAddress (xpub: string, wallet: Wallet): Promise<string> {
    const { nextUnused } = await this.explorer.getXpubSummary(xpub, wallet.network)

    return deriveCoreAddressesFromXpub(this.sdk, xpub, wallet.network, 0, CoreAddressChain.change, 1, nextUnused.change)[0].address
  }

  // Outpoints an unfinished asset lock has already signed. Its transaction may
  // still reach the network, so a new one must not spend the same coins.
  reservedOutpoints (entries: AssetLockFundingAddressSchema[]): Set<string> {
    const reserved = new Set<string>()

    for (const entry of entries) {
      if (entry.used || entry.assetLockTx == null) {
        continue
      }

      for (const input of Transaction.fromHex(entry.assetLockTx).inputs) {
        reserved.add(`${input.getTxIdHex()}:${input.vOut}`)
      }
    }

    return reserved
  }

  // Signs the planned asset lock with one BIP44 key per input, derived from the
  // seed at the path the explorer reported for that address.
  async signPlan (plan: CoreAssetLockPlan, wallet: Wallet, password: string): Promise<Transaction> {
    const root = deriveWalletHdKey(wallet, password, this.sdk)
    const keys: PrivateKey[] = []

    for (const input of plan.inputs) {
      const child = await this.sdk.keyPair.derivePath(root, input.derivationPath)

      if (child.privateKey == null) {
        throw new Error(`Could not derive the key for Core input address ${input.address}`)
      }

      keys.push(PrivateKey.fromBytes(child.privateKey, wallet.network))
    }

    return buildAssetLockFromUtxos(plan, keys)
  }
}

// How far along each chain an address is still considered the wallet's own.
const CORE_ADDRESS_WINDOW = 100
