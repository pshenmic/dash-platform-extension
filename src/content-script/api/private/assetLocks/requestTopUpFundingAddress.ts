import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { RequestTopUpFundingAddressPayload } from '../../../../types/messages/payloads/RequestTopUpFundingAddressPayload'
import { RequestTopUpFundingAddressResponse } from '../../../../types/messages/response/RequestTopUpFundingAddressResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network } from 'dash-platform-sdk/types'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { NetworkType } from '../../../../types/PlatformExplorer'
import { encrypt } from 'eciesjs'
import { bytesToHex, hexToBytes, deriveWalletHdKey, deriveTopUpKeyFromHdKey } from '../../../../utils'
import { TOPUP_FUNDING_GAP_LIMIT } from '../../../../constants'

export class RequestTopUpFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository
  coreExplorer: CoreExplorerService
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository,
    coreExplorer: CoreExplorerService,
    sdk: DashPlatformSDK,
    storageAdapter: StorageAdapter
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.walletRepository = walletRepository
    this.coreExplorer = coreExplorer
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<RequestTopUpFundingAddressResponse> {
    const payload: RequestTopUpFundingAddressPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    const network = wallet.network as NetworkType

    // Reuse an in-flight top-up funding address if one is still pending. Don't
    // trust the local flag blindly — re-check every pending entry against L1 and
    // reuse the first that is not consumed. "Consumed" = on-chain history but no
    // spendable UTXO (already spent into an asset lock elsewhere, or a crash
    // before it was marked). An untouched address (no history) or one holding a
    // pending deposit (history + UTXO) is what we want to reuse; consumed ones
    // are retired locally so they are never handed out again.
    const pending = await this.assetLockFundingAddressesRepository.findAllUnused('topUp')

    for (const entry of pending) {
      const [info, utxos] = await Promise.all([
        this.coreExplorer.getAddressInfo(entry.address, network),
        this.coreExplorer.getAddressUtxos(entry.address, network)
      ])

      const consumed = info != null && utxos.length === 0

      if (!consumed) {
        return { address: entry.address }
      }

      await this.assetLockFundingAddressesRepository.markAsUsed(entry.address)
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    // Gap-scan DIP-13 top-up funding indexes (m/9'/coin'/5'/2'/N) for the first
    // address that has never appeared on L1 (per dashscan) and is not already
    // claimed by a local entry. The wallet HD root is derived once and reused
    // across indexes. Deterministic derivation is what makes the chosen index
    // recoverable from seed later.
    const walletHdKey = deriveWalletHdKey(wallet, payload.password, this.sdk)

    let foundIndex = -1
    let foundKeyHex: string | null = null
    let foundAddress: string | null = null

    for (let index = 0; index < TOPUP_FUNDING_GAP_LIMIT; index++) {
      const candidate = await deriveTopUpKeyFromHdKey(walletHdKey, wallet.network, index, this.sdk)
      const candidateAddress = this.sdk.keyPair.p2pkhAddress(candidate.getPublicKey().bytes(), wallet.network as Network)

      const localEntry = await this.assetLockFundingAddressesRepository.getByAddress(candidateAddress)

      if (localEntry != null) {
        continue
      }

      const used = await this.coreExplorer.isAddressUsed(candidateAddress, network)

      if (!used) {
        foundIndex = index
        foundKeyHex = candidate.hex()
        foundAddress = candidateAddress
        break
      }
    }

    if (foundAddress == null || foundKeyHex == null) {
      throw new Error(`No unused top-up funding address found within ${TOPUP_FUNDING_GAP_LIMIT} indexes`)
    }

    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(foundKeyHex)))

    await this.assetLockFundingAddressesRepository.create({
      address: foundAddress,
      encryptedPrivateKey,
      used: false,
      index: foundIndex,
      purpose: 'topUp'
    })

    return { address: foundAddress }
  }

  validatePayload (payload: RequestTopUpFundingAddressPayload): null | string {
    if (typeof payload?.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    return null
  }
}
