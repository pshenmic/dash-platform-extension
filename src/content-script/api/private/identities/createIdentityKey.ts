import {EventData} from '../../../../types'
import {APIHandler} from '../../APIHandler'
import {WalletRepository} from '../../../repository/WalletRepository'
import {StorageAdapter} from '../../../storage/storageAdapter'
import {DashPlatformSDK} from 'dash-platform-sdk'
import {deriveSeedphrasePrivateKey, generateRandomHex} from '../../../../utils'
import {PrivateKeyWASM, SecurityLevel} from 'pshenmic-dpp'
import type {CreateIdentityKeyPayload} from '../../../../types/messages/payloads/CreateIdentityKeyPayload'
import {IdentitiesRepository} from '../../../repository/IdentitiesRepository'
import {KeypairRepository} from '../../../repository/KeypairRepository'
import {VoidResponse} from "../../../../types/messages/response/VoidResponse";
import {IdentityPublicKeyInCreation} from "dash-platform-sdk/src/types";
import {PurposeLabelsInfo, SecurityLabelsInfo} from "../../../../enums";
import {KeyType, Purpose} from "pshenmic-dpp/pshenmic_dpp";
import {StateTransitionsRepository} from "../../../repository/StateTransitionsRepository";

export class CreateIdentityKeyHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  keypairRepository: KeypairRepository
  stateTransitionsRepository: StateTransitionsRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, identitiesRepository: IdentitiesRepository, keypairRepository: KeypairRepository, storageAdapter: StorageAdapter, stateTransitionsRepository:StateTransitionsRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.stateTransitionsRepository = stateTransitionsRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: CreateIdentityKeyPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()
    const network = await this.storageAdapter.get('network') as string
    const keyType = KeyType[payload.keyType]
    const purpose = Purpose[payload.purpose]
    const securityLevel = SecurityLevel[payload.securityLevel]

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const signingIdentity = await this.identitiesRepository.getByIdentifier(payload.signingIdentity)

    if (signingIdentity == null) {
      throw new Error('Signing Identity could not be found')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error('Identity could not be found')
    }

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(payload.signingIdentity)

    const nextKeyId = identityWASM.getPublicKeys().reduce((nextIndex, identityPublicKey) => {
      if (identityPublicKey.keyId >= nextIndex) {
        return identityPublicKey.keyId + 1
      }
      return nextIndex
    }, 0)

    let privateKeyWASM: PrivateKeyWASM

    if (wallet.type === 'keystore') {
      // if keystore - generate new private key and store in the keypair repository
       privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(40), network)

      await this.keypairRepository.add(identity.identifier, privateKeyWASM.hex(), nextKeyId, true)
    } else if(wallet.type === 'seedphrase') {
      // if seedphrase - derive private key of next unused key
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, payload.password, identity.index, nextKeyId, this.sdk)
    } else {
      throw new Error("Unknown wallet type")
    }

    let data: Uint8Array = privateKeyWASM.getPublicKey().hash160()

    if (keyType === KeyType.ECDSA_HASH160) {
      data = privateKeyWASM.getPublicKey().hash160()
    }

    if (keyType === KeyType.ECDSA_SECP256K1) {
      data = privateKeyWASM.getPublicKey().bytes()
    }

    const identityPublicKeyInCreation: IdentityPublicKeyInCreation = {
      data,
      id: 0,
      keyType,
      purpose,
      readOnly: false,
      securityLevel
    }

    const stateTransitionWASM =  this.sdk.identities.createStateTransition('update',{
      addPublicKeys: [identityPublicKeyInCreation]
    })

    const stateTransition = await this.stateTransitionsRepository.create(stateTransitionWASM)

    return {
      stateTransition
    }
  }

  validatePayload (payload: CreateIdentityKeyPayload): string | null {
    if (typeof payload.identity !== 'string' || payload.identity.length === 0) {
      return 'Identity identifier must be provided'
    }
    if (typeof payload.signingIdentity !== 'string' || payload.signingIdentity.length === 0) {
      return 'Signing identifier must be provided'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    if (Object.keys(SecurityLabelsInfo).indexOf(payload.securityLevel) === -1) {
      return 'Invalid security level value'
    }
    if (Object.keys(PurposeLabelsInfo).indexOf(payload.purpose) === -1) {
      return 'Invalid purpose value'
    }
    if (payload.keyType !== 'ECDSA_SECP256K1' && payload.keyType !== 'ECDSA_HASH160') {
      return 'Invalid key type value (only ECDSA_SECP256K1 or ECDSA_HASH160 are supported)'
    }

    return null
  }
}
