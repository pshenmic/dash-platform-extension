import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { validateHex } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ImportMasternodeIdentityPayload } from '../../../../types/messages/payloads/ImportMasternodeIdentityPayload'
import { Network } from '../../../../types/enums/Network'
import { IdentityType } from '../../../../types/enums/IdentityType'

export class ImportMasternodeIdentityHandler implements APIHandler {
  keypairRepository: KeypairRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository, keypairRepository: KeypairRepository, sdk: DashPlatformSDK) {
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  // creates a masternode identity or adds a new private key to an existing one
  async processMasternodeIdentity (proTxHash: string, privateKey: string, type: 'masternode' | 'voting', network: Network): Promise<void> {
    const privateKeyWASM = PrivateKeyWASM.fromHex(privateKey, network)

    const identifier = type === 'masternode' ? this.sdk.utils.createMasternodeIdentifier(proTxHash) : await this.sdk.utils.createVoterIdentifier(proTxHash, privateKeyWASM.getPublicKeyHash())
    const identity = await this.sdk.identities.getIdentityByIdentifier(identifier)

    const identityPublicKey = identity.getPublicKeys().find((identityPublicKeys) => identityPublicKeys.getPublicKeyHash() === privateKeyWASM.getPublicKeyHash())

    if (identityPublicKey == null) {
      throw new Error('Could not find identity public key matching private key for masternode identity')
    }

    if (identityPublicKey.disabledAt != null) {
      throw new Error('Identity key is disabled')
    }

    const existingIdentity = await this.identitiesRepository.getByIdentifier(identity.id.base58())

    if (existingIdentity == null) {
      await this.identitiesRepository.create(identity.id.base58(), IdentityType[type], proTxHash)
    }

    const existingKeyPair = await this.keypairRepository.getByIdentityPublicKey(identity.id.base58(), identityPublicKey)

    if (existingKeyPair == null) {
      await this.keypairRepository.add(identity.id.base58(), privateKeyWASM.hex(), identityPublicKey)
    }
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: ImportMasternodeIdentityPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'keystore') {
      throw new Error('Importing identity only possible in keystore wallet mode')
    }
    const { owner, voting, payout } = payload.privateKeys
    const { proTxHash } = payload

    // console.log(PrivateKeyWASM.fromHex(payout, 'testnet').getPublicKeyHash())

    // create masternode and voting identity
    if (owner != null) {
      await this.processMasternodeIdentity(proTxHash, owner, 'masternode', Network[wallet.network])

      if (owner === voting) {
        await this.processMasternodeIdentity(proTxHash, owner, 'voting', Network[wallet.network])
      }
    }

    // create voting identity
    if (voting != null && voting !== owner) {
      await this.processMasternodeIdentity(proTxHash, voting, 'voting', Network[wallet.network])
    }

    // create masternode identity
    if (payout != null) {
      await this.processMasternodeIdentity(proTxHash, payout, 'masternode', Network[wallet.network])
    }
    return {}
  }

  validatePayload (payload: ImportMasternodeIdentityPayload): string | null {
    const { owner, voting, payout } = payload.privateKeys

    if ([owner, voting, payout].filter(e => validateHex(e)).length === 0) {
      throw new Error('At least one private key must be specified (in hex format)')
    }

    if (!validateHex(payload.proTxHash)) {
      return 'Pro Tx Hash must be in a hex format'
    }

    if (payout != null && (payout === owner || payout === voting)) {
      throw new Error('Owner and voting address must differ')
    }

    return null
  }
}
