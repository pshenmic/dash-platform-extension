import { DashCoreSDK } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService, CoreWalletUtxo } from '../../../services/CoreExplorerService'
import { RecoverAssetLockFundsPayload } from '../../../../types/messages/payloads/RecoverAssetLockFundsPayload'
import { RecoverAssetLockFundsResponse } from '../../../../types/messages/response/RecoverAssetLockFundsResponse'
import { RepositoryScope } from '../../../../types/RepositoryScope'
import { validateRepositoryScopePayload } from '../../../../utils/validateRepositoryScopePayload'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { decryptAssetLockFundingKey } from '../../../../utils/assetLockFundingKey'
import { buildFundingAddressRecovery } from '../../../../utils/recoverFundingAddress'

// Spends a deposit stranded on an asset lock funding address this extension handed
// out, sending it wherever the user asks.
//
// The registration flow that produced these addresses is gone, and so is the
// operation that would have consumed the deposit: it was only ever spendable by
// building an asset lock out of it, and a registration that stopped before that
// has no way to resume. The money is still the user's, and the key that controls
// it is still in storage, so this pays it back out as an ordinary L1 transfer.
//
// Needs the password because the funding key is stored encrypted to a key derived
// from it. The key was a one-time random one, never derived from the seed, so
// storage and the password together are the only copy that exists.
export class RecoverAssetLockFundsHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  coreExplorer: CoreExplorerService
  coreSDK: DashCoreSDK
  sdk: DashPlatformSDK

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    coreExplorer: CoreExplorerService,
    coreSDK: DashCoreSDK,
    sdk: DashPlatformSDK
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.coreExplorer = coreExplorer
    this.coreSDK = coreSDK
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<RecoverAssetLockFundsResponse> {
    const payload: RecoverAssetLockFundsPayload = event.payload
    const scope = await this.resolveScope(payload)
    const repository = this.assetLockFundingAddressesRepository.forScope(scope)
    const network = scope.network as NetworkType

    const entry = await repository.getByAddress(payload.fundingAddress)

    if (entry == null) {
      throw new Error(`Asset lock funding address ${payload.fundingAddress} is not known on ${scope.network}`)
    }

    if (entry.used) {
      throw new Error(`Asset lock funding address ${payload.fundingAddress} has already been spent`)
    }

    // Not `used`, but its deposit is already committed: an asset lock on L1 spends
    // it. Sweeping that would double-spend the asset lock's input and leave a
    // registration that can never be finished, so the operation has to be resumed
    // instead of recovered.
    if (entry.assetLockTxid != null) {
      throw new Error(
        `Asset lock funding address ${payload.fundingAddress} already has an asset lock on L1 ` +
        `(${entry.assetLockTxid}). Finish that operation instead of recovering its deposit`
      )
    }

    if (entry.encryptedPrivateKey == null || entry.encryptedPrivateKey === '') {
      throw new Error(
        `Asset lock funding address ${payload.fundingAddress} has no stored key. ` +
        'Its funding key was a one-time random key that was never derived from the seed, ' +
        'so without it the deposit cannot be signed for'
      )
    }

    const privateKey = decryptAssetLockFundingKey(entry, payload.password, network)

    // The key must control the address it is stored against. A wrong password or a
    // corrupted entry decrypts to something else entirely, and signing with it
    // would produce a transaction no node relays - the inputs spent on paper, the
    // money nowhere. Refuse before broadcasting.
    const keyAddress = this.sdk.keyPair.p2pkhAddress(privateKey.getPublicKey().bytes(), network as Network)

    if (keyAddress !== entry.address) {
      throw new Error(
        `The stored key for ${entry.address} derives ${keyAddress} instead: wrong password or corrupted entry`
      )
    }

    const utxos = await this.coreExplorer.getAddressUtxos(entry.address, network)

    if (utxos.length === 0) {
      throw new Error(`Asset lock funding address ${entry.address} has no unspent outputs to recover`)
    }

    // The explorer reports outputs without an address; the builder needs one per
    // input to derive its locking script. Every output here pays the same address.
    const walletUtxos: CoreWalletUtxo[] = utxos.map(utxo => ({ ...utxo, address: entry.address }))

    const amountDuffs = payload.sendMax === true || payload.amountDuffs == null
      ? undefined
      : BigInt(payload.amountDuffs)

    const recovery = buildFundingAddressRecovery(
      walletUtxos,
      payload.toAddress,
      entry.address,
      privateKey.WIF(),
      network,
      amountDuffs
    )

    await this.coreSDK.broadcastTransaction(recovery.transaction.bytes())

    // Only a drain closes the entry out. A partial spend leaves change at the
    // address, and marking it used would hide money that is still there and still
    // recoverable.
    if (recovery.swept) {
      await repository.markAsUsed(entry.address)
    }

    return {
      txid: recovery.txid,
      fromAddress: entry.address,
      toAddress: payload.toAddress,
      amountDuffs: recovery.amountDuffs.toString(),
      feeDuffs: recovery.feeDuffs.toString(),
      changeDuffs: recovery.changeDuffs.toString(),
      swept: recovery.swept
    }
  }

  private async resolveScope (payload: RecoverAssetLockFundsPayload): Promise<RepositoryScope> {
    if (payload.walletId != null && payload.network != null) {
      return { network: payload.network, walletId: payload.walletId }
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    return { network: wallet.network, walletId: wallet.walletId }
  }

  validatePayload (payload: RecoverAssetLockFundsPayload): string | null {
    if (typeof payload?.fundingAddress !== 'string' || payload.fundingAddress.length === 0) {
      return 'fundingAddress must be a non-empty string'
    }

    if (typeof payload.toAddress !== 'string' || payload.toAddress.length === 0) {
      return 'toAddress must be a non-empty string'
    }

    if (payload.toAddress === payload.fundingAddress) {
      return 'toAddress must differ from the funding address being recovered'
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be a non-empty string'
    }

    if (payload.amountDuffs != null) {
      if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs)) {
        return 'amountDuffs must be an integer string of duffs'
      }

      if (BigInt(payload.amountDuffs) <= 0n) {
        return 'amountDuffs must be greater than zero'
      }
    }

    if (payload.sendMax != null && typeof payload.sendMax !== 'boolean') {
      return 'sendMax must be a boolean'
    }

    return validateRepositoryScopePayload(payload)
  }
}
