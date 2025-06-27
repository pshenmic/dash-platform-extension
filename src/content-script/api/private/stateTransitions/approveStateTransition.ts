import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { DashPlatformProtocolWASM } from 'pshenmic-dpp'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { ApproveStateTransitionResponse } from '../../../../types/messages/response/ApproveStateTransitionResponse'
import { ApproveStateTransitionPayload } from '../../../../types/messages/payloads/ApproveStateTransitionPayload'
import { base64 } from '@scure/base'
import { KeyPair } from '../../../../types/KeyPair'
import { bytesToHex, hexToBytes, validateHex, validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { decrypt } from 'eciesjs'
import hash from 'hash.js'
import { StateTransitionStatus } from '../../../../types/enums/StateTransitionStatus'

export class ApproveStateTransitionHandler implements APIHandler {
  keyPairRepository: KeypairRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  dpp: DashPlatformProtocolWASM
  sdk: DashPlatformSDK

  constructor (stateTransitionsRepository: StateTransitionsRepository,
    identitiesRepository: IdentitiesRepository,
    walletRepository: WalletRepository,
    keyPairRepository: KeypairRepository,
    dpp: DashPlatformProtocolWASM, sdk: DashPlatformSDK) {
    this.keyPairRepository = keyPairRepository
    this.stateTransitionsRepository = stateTransitionsRepository
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.dpp = dpp
    this.sdk = sdk
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

    const stateTransitionWASM = this.dpp.StateTransitionWASM.fromBytes(base64.decode(stateTransition.unsigned))

    let keyPair: KeyPair | null

    if (wallet.type === WalletType.keystore) {
      const identityPublicKeyWASM = this.dpp.IdentityPublicKeyWASM.fromBytes(base64.decode(payload.identityPublicKey))

      keyPair = await this.keyPairRepository.getByIdentityPublicKey(payload.identity, identityPublicKeyWASM)

      if (keyPair == null || keyPair.encryptedPrivateKey == null) {
        throw new Error(`Could not find private key for identity public key (pkh ${base64.encode(identityPublicKeyWASM.bytes())})`)
      }

      const passwordHash = hash.sha256().update(payload.password).digest('hex')

      let privateKey

      try {
        privateKey = decrypt(passwordHash, hexToBytes(keyPair.encryptedPrivateKey))
      } catch (e) {
        throw new Error('Failed to decrypt')
      }

      const privateKeyWASM = this.dpp.PrivateKeyWASM.fromBytes(privateKey, wallet.network)

      stateTransitionWASM.sign(privateKeyWASM, keyPair.identityPublicKey)

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
        txHash: stateTransition.hash
      }
    } else if (wallet.type === WalletType.seed) {
      throw new Error('Seedphrases are not supported yet')
    } else {
      throw new Error('Unsupported key wallet')
    }
  }

  validatePayload (payload: ApproveStateTransitionPayload): null | string {
    if (!validateHex(payload.hash)) {
      return 'State transition hash is not valid'
    }

    if (!validateIdentifier(payload.identity)) {
      return 'Identity identifier is not valid'
    }

    return null
  }
}
