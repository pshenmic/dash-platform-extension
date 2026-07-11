import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import {
  AssetLockProofWASM,
  OutPointWASM,
  OutputAddressNullableCreditsWASM,
  AddressFundsFeeStrategyStepWASM,
  PlatformAddressWASM
} from 'pshenmic-dpp'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { hexToBytes } from '../../../../utils'
import { TXID_HEX_LENGTH } from '../../../../constants'
import { FundPlatformAddressFromCorePayload } from '../../../../types/messages/payloads/FundPlatformAddressFromCorePayload'
import { FundPlatformAddressFromCoreResponse } from '../../../../types/messages/response/FundPlatformAddressFromCoreResponse'

// Funds a transparent platform address from a Core (L1) deposit via an
// AddressFundingFromAssetLock state transition. Mirrors the identity top-up
// asset-lock flow: build an asset lock from the funding transaction, broadcast it
// on L1, wait for its lock proof, then credit the platform address. The asset
// lock funding key both funds the lock and signs the state transition.
export class FundPlatformAddressFromCoreHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (walletRepository: WalletRepository, assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository, sdk: DashPlatformSDK, coreSDK: DashCoreSDK) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<FundPlatformAddressFromCoreResponse> {
    const payload: FundPlatformAddressFromCorePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    try {
      PlatformAddressWASM.fromBech32m(payload.platformAddress)
    } catch {
      throw new Error('Invalid platform address')
    }

    const assetLockFundingAddressEntry = await this.assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (assetLockFundingAddressEntry == null) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} not found`)
    }
    if (assetLockFundingAddressEntry.used) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used`)
    }

    const passwordHash = hash.sha256().update(payload.password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    let assetLockFundingKeyBytes: Uint8Array
    try {
      assetLockFundingKeyBytes = decrypt(secretKey.toHex(), hexToBytes(assetLockFundingAddressEntry.encryptedPrivateKey))
    } catch {
      throw new Error('Failed to decrypt asset lock funding key - wrong password or corrupted entry')
    }

    const assetLockFundingPrivateKey = PrivateKeyWASM.fromBytes(assetLockFundingKeyBytes, wallet.network)

    // The funding key funds the asset lock and owns the credit output (it signs
    // the state transition), so the credit output goes back to the funding address.
    const { assetLockTx } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      assetLockFundingPrivateKey.WIF(),
      payload.assetLockFundingAddress
    )

    const assetLockTxid = assetLockTx.hash()

    if (
      assetLockFundingAddressEntry.assetLockTxid != null &&
      assetLockFundingAddressEntry.assetLockTxid !== assetLockTxid
    ) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${assetLockFundingAddressEntry.assetLockTxid})`
      )
    }

    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [hexToBytes(assetLockTxid)]
    )

    if (assetLockFundingAddressEntry.assetLockTxid == null) {
      await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      await this.assetLockFundingAddressesRepository.markAsBroadcasted(payload.assetLockFundingAddress, assetLockTxid)
    }

    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    // waitForAssetLockProof races the instant lock and the chain lock, so the
    // proof may be of either kind — build the matching WASM proof for each.
    const assetLockProofWasm = assetLockProof.type === 'instantLock'
      ? AssetLockProofWASM.createInstantAssetLockProof(
        hexToBytes(assetLockProof.instantLock),
        hexToBytes(assetLockProof.transaction),
        assetLockProof.outputIndex
      )
      : AssetLockProofWASM.createChainAssetLockProof(
        assetLockProof.coreChainLockedHeight,
        new OutPointWASM(assetLockTxid, assetLockProof.outputIndex)
      )

    const outputs = [new OutputAddressNullableCreditsWASM(payload.platformAddress)]
    const feeStrategy = [AddressFundsFeeStrategyStepWASM.ReduceOutput(0)]

    const stateTransition = this.sdk.platformAddresses.createStateTransition('addressFundingFromAssetLock', {
      assetLockProof: assetLockProofWasm, inputs: [], feeStrategy, userFeeIncrease: 0, inputWitness: [], outputs
    })
    stateTransition.signByPrivateKey(assetLockFundingPrivateKey, undefined, KeyType.ECDSA_SECP256K1)

    const stateTransitionHash: string = stateTransition.hash(false)

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    await this.assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)

    return {
      platformAddress: payload.platformAddress,
      stateTransitionHash,
      assetLockTxid
    }
  }

  validatePayload (payload: FundPlatformAddressFromCorePayload): string | null {
    if (typeof payload.platformAddress !== 'string' || payload.platformAddress.length === 0) {
      return 'platformAddress must be provided'
    }
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
