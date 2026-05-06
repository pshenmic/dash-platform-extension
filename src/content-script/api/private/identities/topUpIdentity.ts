import { DashCoreSDK } from 'dash-core-sdk'
import { KeyType, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKey, decrypt } from 'eciesjs'
import hash from 'hash.js'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { TopUpIdentityPayload } from '../../../../types/messages/payloads/TopUpIdentityPayload'
import { TopUpIdentityResponse } from '../../../../types/messages/response/TopUpIdentityResponse'
import { buildAssetLockFromFundingTx } from '../../../../utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../../../utils/waitForAssetLockProof'
import { hexToBytes } from '../../../../utils'
import { TXID_HEX_LENGTH } from '../../../../constants'
import { isIdempotentTopUpError } from '../../../../utils/isIdempotentTopUpError'

const TXID_HEX_RE = /^[0-9a-fA-F]{64}$/

export class TopUpIdentityHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (
    walletRepository: WalletRepository,
    identitiesRepository: IdentitiesRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    sdk: DashPlatformSDK,
    coreSDK: DashCoreSDK
  ) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async handle (event: EventData): Promise<TopUpIdentityResponse> {
    const payload: TopUpIdentityPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const ownedIdentity = await this.identitiesRepository.getByIdentifier(payload.identityId)

    if (ownedIdentity == null) {
      throw new Error(`Identity ${payload.identityId} does not belong to the current wallet`)
    }

    const assetLockFundingAddressEntry = await this.assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (assetLockFundingAddressEntry == null) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} not found`)
    }

    if (assetLockFundingAddressEntry.used) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used`)
    }

    if (
      assetLockFundingAddressEntry.claimedForIdentityId != null &&
      assetLockFundingAddressEntry.claimedForIdentityId !== payload.identityId
    ) {
      throw new Error(
        `Asset lock funding address ${payload.assetLockFundingAddress} is already claimed for identity ` +
        `${assetLockFundingAddressEntry.claimedForIdentityId}`
      )
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

    const { assetLockTx } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      payload.assetLockFundingTxid,
      payload.assetLockFundingAddress,
      assetLockFundingPrivateKey.WIF()
    )

    await this.assetLockFundingAddressesRepository.markAsClaimed(payload.assetLockFundingAddress, payload.identityId)

    const assetLockTxid = assetLockTx.hash()
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [payload.assetLockFundingAddress],
      [hexToBytes(assetLockTxid)]
    )

    await this.coreSDK.broadcastTransaction(assetLockTx.bytes())

    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    const stateTransition = this.sdk.identities.createStateTransition('topUp', {
      identityId: payload.identityId,
      assetLockProof
    })

    stateTransition.signByPrivateKey(assetLockFundingPrivateKey, undefined, KeyType.ECDSA_SECP256K1)

    const stateTransitionHash: string = stateTransition.hash(false)

    try {
      await this.sdk.stateTransitions.broadcast(stateTransition)
      await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)
    } catch (e) {
      if (!isIdempotentTopUpError(e)) {
        throw e
      }
    }

    await this.assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)

    return {
      identityId: payload.identityId,
      stateTransitionHash
    }
  }

  validatePayload (payload: TopUpIdentityPayload): string | null {
    if (typeof payload.identityId !== 'string' || payload.identityId.length === 0) {
      return 'identityId must be provided'
    }

    if (typeof payload.assetLockFundingAddress !== 'string' || payload.assetLockFundingAddress.length === 0) {
      return 'assetLockFundingAddress must be provided'
    }

    if (typeof payload.assetLockFundingTxid !== 'string' || !TXID_HEX_RE.test(payload.assetLockFundingTxid)) {
      return `assetLockFundingTxid must be a ${TXID_HEX_LENGTH}-character hex string`
    }

    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }

    return null
  }
}
