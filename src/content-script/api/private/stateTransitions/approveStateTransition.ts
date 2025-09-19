import { DashPlatformSDK } from 'dash-platform-sdk'
import { BatchTransitionWASM, DataContractUpdateTransitionWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { ApproveStateTransitionResponse } from '../../../../types/messages/response/ApproveStateTransitionResponse'
import { ApproveStateTransitionPayload } from '../../../../types/messages/payloads/ApproveStateTransitionPayload'
import { bytesToHex, deriveKeystorePrivateKey, deriveSeedphrasePrivateKey, validateHex, validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StateTransitionStatus } from '../../../../types/enums/StateTransitionStatus'
import { Wallet, Identity, WalletType, EventData } from '../../../../types'

export class ApproveStateTransitionHandler implements APIHandler {
  keyPairRepository: KeypairRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (stateTransitionsRepository: StateTransitionsRepository,
    identitiesRepository: IdentitiesRepository,
    walletRepository: WalletRepository,
    keyPairRepository: KeypairRepository, sdk: DashPlatformSDK) {
    this.keyPairRepository = keyPairRepository
    this.stateTransitionsRepository = stateTransitionsRepository
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.sdk = sdk
  }

  async sign (stateTransitionBase64: string, wallet: Wallet, identity: Identity, keyId: number, password: string): Promise<StateTransitionWASM> {
    const stateTransitionWASM = StateTransitionWASM.fromBase64(stateTransitionBase64)

    // handle changed owner from approve transaction screen
    if (stateTransitionWASM.getOwnerId().base58() !== identity.identifier) {
      if (stateTransitionWASM.getActionType() === 'IDENTITY_CREATE') {
        throw new Error('Incorrect owner used for IdentityCreate transaction, changing is prohibited')
      }

      stateTransitionWASM.setOwnerId(identity.identifier)

      // replace identityContractNonce
      if (['BATCH', 'DATA_CONTRACT_UPDATE'].includes(stateTransitionWASM.getActionType())) {
        let dataContractId

        if (stateTransitionWASM.getActionType() === 'DATA_CONTRACT_UPDATE') {
          const dataContractUpdateTransitionWASM = DataContractUpdateTransitionWASM.fromStateTransition(stateTransitionWASM)

          // @ts-expect-error
          dataContractId = dataContractUpdateTransitionWASM.getDataContract().id
        }

        if (stateTransitionWASM.getActionType() === 'BATCH') {
          const batchTransition = BatchTransitionWASM.fromStateTransition(stateTransitionWASM)
          const [transition] = batchTransition.transitions

          dataContractId = transition.dataContractId
        }

        const identityContractNonce = await this.sdk.identities.getIdentityContractNonce(identity.identifier, dataContractId)

        stateTransitionWASM.setIdentityContractNonce(identityContractNonce)
      }

      // replace identityNonce
      if (['DATA_CONTRACT_CREATE', 'IDENTITY_CREDIT_WITHDRAWAL', 'IDENTITY_UPDATE', 'IDENTITY_CREDIT_TRANSFER', 'MASTERNODE_VOTE'].includes(stateTransitionWASM.getActionType())) {
        const identityNonce = await this.sdk.identities.getIdentityNonce(identity.identifier)
        stateTransitionWASM.setIdentityNonce(identityNonce)
      }
    }

    let privateKeyWASM

    if (wallet.type === WalletType.keystore) {
      privateKeyWASM = await deriveKeystorePrivateKey(wallet, password, identity.identifier, keyId, this.keyPairRepository)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, password, identity.index, keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(identity.identifier)

    const [identityPublicKey] = identityWASM.getPublicKeys().filter(identityPublicKey => identityPublicKey.keyId === keyId)

    if (identityPublicKey == null) {
      throw new Error(`Could not find Identity Public Key with Key ID ${keyId} in Identity ${identity.identifier}`)
    }

    stateTransitionWASM.sign(privateKeyWASM, identityPublicKey)

    return stateTransitionWASM
  }

  async handle (event: EventData): Promise<ApproveStateTransitionResponse> {
    const payload: ApproveStateTransitionPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    const stateTransition = await this.stateTransitionsRepository.getByHash(payload.hash)

    if (stateTransition == null) {
      throw new Error(`Could not find state transition with hash ${payload.hash} for signing`)
    }

    const stateTransitionWASM = await this.sign(stateTransition.unsigned, wallet, identity, payload.keyId, payload.password)

    const signature = stateTransitionWASM.signature
    const signaturePublicKeyId = stateTransitionWASM.signaturePublicKeyId as number

    try {
      await this.sdk.stateTransitions.broadcast(stateTransitionWASM)

      await this.stateTransitionsRepository.update(stateTransition.hash, StateTransitionStatus.approved, bytesToHex(signature), signaturePublicKeyId)
    } catch (e) {
      console.log('Failed to broadcast transaction', e)
      await this.stateTransitionsRepository.update(stateTransition.hash, StateTransitionStatus.error)

      throw e
    }

    return {
      txHash: stateTransitionWASM.hash(true)
    }
  }

  validatePayload (payload: ApproveStateTransitionPayload): null | string {
    if (!validateHex(payload.hash)) {
      return 'State transition hash is not valid'
    }

    if (!validateIdentifier(payload.identity)) {
      return 'Identity identifier is not valid'
    }

    if (payload.password == null) {
      return 'Password is missing'
    }

    if (payload.keyId == null) {
      return 'Key ID is missing'
    }

    return null
  }
}
