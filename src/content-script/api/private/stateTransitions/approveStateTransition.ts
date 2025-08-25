import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { PrivateKeyWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { ApproveStateTransitionResponse } from '../../../../types/messages/response/ApproveStateTransitionResponse'
import { ApproveStateTransitionPayload } from '../../../../types/messages/payloads/ApproveStateTransitionPayload'
import { base64 } from '@scure/base'
import { bytesToHex, bytesToUtf8, hexToBytes, validateHex, validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { decrypt, PrivateKey } from 'eciesjs'
import hash from 'hash.js'
import { StateTransitionStatus } from '../../../../types/enums/StateTransitionStatus'
import { Network } from '../../../../types/enums/Network'

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

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(identity.identifier)

    const stateTransition = await this.stateTransitionsRepository.getByHash(payload.hash)

    if (stateTransition == null) {
      throw new Error(`Could not find state transition with hash ${payload.hash} for signing`)
    }

    const stateTransitionWASM = StateTransitionWASM.fromBytes(base64.decode(stateTransition.unsigned))

    if (wallet.type === WalletType.keystore) {
      const keyPairs = await this.keyPairRepository.getAllByIdentity(payload.identity)

      const [keyPair] = keyPairs
        .filter(keyPair => keyPair.identityPublicKey.keyId === payload.keyId)

      if (keyPair == null || keyPair.encryptedPrivateKey == null) {
        throw new Error(`Could not find private key with KeyID ${payload.keyId} for identity ${payload.identity}`)
      }

      const passwordHash = hash.sha256().update(payload.password).digest('hex')

      let privateKey

      try {
        privateKey = decrypt(passwordHash, hexToBytes(keyPair.encryptedPrivateKey))
      } catch (e) {
        throw new Error('Failed to decrypt')
      }

      const privateKeyWASM = PrivateKeyWASM.fromBytes(privateKey, wallet.network)

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
    } else if (wallet.type === WalletType.seedphrase) {
      if (wallet.encryptedMnemonic == null) {
        throw new Error('Missing mnemonic')
      }

      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let mnemonic

      try {
        mnemonic = bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
      } catch (e) {
        throw new Error('Failed to decrypt')
      }

      const seed = await this.sdk.keyPair.mnemonicToSeed(mnemonic, undefined, true)
      const hdKey = await this.sdk.keyPair.walletToIdentityKey(seed, identity.index, payload.keyId, { network: Network[wallet.network] })
      const privateKey = hdKey.privateKey

      const privateKeyWASM = PrivateKeyWASM.fromBytes(privateKey, wallet.network)

      const [identityPublicKey] = identityWASM.getPublicKeys().filter(identityPublicKey => identityPublicKey.keyId === payload.keyId)

      if (identityPublicKey == null) {
        throw new Error(`Could not find Identity Public Key with Key ID ${payload.keyId} in Identity ${payload.identity}`)
      }

      stateTransitionWASM.sign(privateKeyWASM, identityPublicKey)

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
    } else {
      throw new Error('Unsupported wallet type')
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
