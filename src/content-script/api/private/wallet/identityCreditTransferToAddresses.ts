import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PlatformAddressWASM, OutputAddressWASM } from 'pshenmic-dpp'
import { Purpose } from 'dash-platform-sdk/types'
import { WalletType } from '../../../../types/WalletType'
import { deriveIdentityPrivateKey, deriveKeystorePrivateKey } from '../../../../utils'
import { IdentityCreditTransferToAddressesPayload } from '../../../../types/messages/payloads/IdentityCreditTransferToAddressesPayload'
import { IdentityCreditTransferToAddressesResponse } from '../../../../types/messages/response/IdentityCreditTransferToAddressesResponse'

export class IdentityCreditTransferToAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  keypairRepository: KeypairRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, identitiesRepository: IdentitiesRepository, keypairRepository: KeypairRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<IdentityCreditTransferToAddressesResponse> {
    const payload: IdentityCreditTransferToAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.currentIdentity == null) {
      throw new Error('No identity is selected')
    }

    const identity = await this.identitiesRepository.getByIdentifier(wallet.currentIdentity)

    if (identity == null) {
      throw new Error(`Identity ${wallet.currentIdentity} not found`)
    }

    try {
      PlatformAddressWASM.fromBech32m(payload.toAddress)
    } catch {
      throw new Error('Invalid platform address')
    }

    const amountCredits = BigInt(payload.amountCredits)

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(identity.identifier)
    const transferKey = identityWASM.getPublicKeys().find(publicKey => publicKey.purposeNumber === Purpose.TRANSFER)

    if (transferKey == null) {
      throw new Error('Identity has no TRANSFER key, which is required for a credit transfer')
    }

    let privateKey
    if (wallet.type === WalletType.keystore) {
      privateKey = await deriveKeystorePrivateKey(wallet, payload.password, identity.identifier, transferKey.keyId, this.keypairRepository)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKey = await deriveIdentityPrivateKey(wallet, payload.password, identity.index, transferKey.keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }

    const nonce = await this.sdk.identities.getIdentityNonce(identity.identifier)
    const recipients = [new OutputAddressWASM(payload.toAddress, amountCredits)]
    const stateTransition = this.sdk.platformAddresses.createStateTransition('identityCreditTransferToAddresses', {
      identityId: identity.identifier,
      recipients,
      nonce: nonce + 1n
    })

    stateTransition.sign(privateKey, transferKey)

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      toAddress: payload.toAddress,
      fromIdentity: identity.identifier
    }
  }

  validatePayload (payload: IdentityCreditTransferToAddressesPayload): string | null {
    if (typeof payload.toAddress !== 'string' || payload.toAddress.length === 0) {
      return 'Recipient address must be provided'
    }
    if (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n) {
      return 'Amount must be a positive integer string of credits'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return null
  }
}
