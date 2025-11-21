import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { bytesToHex, deriveSeedphrasePrivateKey, generateRandomHex } from '../../../../utils'
import { PrivateKeyWASM, KeyType } from 'pshenmic-dpp'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { CreateIdentityPrivateKeyPayload } from '../../../../types/messages/payloads/CreateIdentityPrivateKeyPayload'
import { CreateIdentityPrivateKeyResponse } from '../../../../types/messages/response/CreateIdentityPrivateKeyResponse'

export class CreateIdentityPrivateKeyHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  keypairRepository: KeypairRepository
  stateTransitionsRepository: StateTransitionsRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, identitiesRepository: IdentitiesRepository, keypairRepository: KeypairRepository, storageAdapter: StorageAdapter, stateTransitionsRepository: StateTransitionsRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.stateTransitionsRepository = stateTransitionsRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<CreateIdentityPrivateKeyResponse> {
    const payload: CreateIdentityPrivateKeyPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()
    const network = await this.storageAdapter.get('network') as string
    const keyType = KeyType[payload.keyType]

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error('Identity could not be found')
    }

    const identityWASM = await this.sdk.identities.getIdentityByIdentifier(payload.identity)

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
    } else if (wallet.type === 'seedphrase') {
      // if seedphrase - derive private key of next unused key
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, payload.password, identity.index, nextKeyId, this.sdk)
    } else {
      throw new Error('Unknown wallet type')
    }

    let data: Uint8Array = privateKeyWASM.getPublicKey().hash160()
    let publicKeyHash: string

    if (KeyType[keyType] === KeyType[KeyType.ECDSA_HASH160]) {
      data = privateKeyWASM.getPublicKey().hash160()
      publicKeyHash = bytesToHex(data)
    } else if (KeyType[keyType] === KeyType[KeyType.ECDSA_SECP256K1]) {
      data = privateKeyWASM.getPublicKey().bytes()
      publicKeyHash = privateKeyWASM.getPublicKeyHash()
    } else {
      throw new Error(`Unsupported key type ${KeyType[keyType]}`)
    }

    // const identityPublicKeyInCreation: IdentityPublicKey InCreation = {
    //   data,
    //   id: 0,
    //   keyType,
    //   purpose,
    //   readOnly: false,
    //   securityLevel
    // }
    //
    // identityPublicKeyInCreation.validatePrivateKey(privateKeyWASM)

    return {
      identifier: identity.identifier,
      keyId: nextKeyId,
      publicKeyData: bytesToHex(data),
      publicKeyHash
    }
  }

  validatePayload (payload: CreateIdentityPrivateKeyPayload): string | null {
    if (typeof payload.identity !== 'string' || payload.identity.length === 0) {
      return 'Identity identifier must be provided'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    if (payload.keyType !== 'ECDSA_SECP256K1' && payload.keyType !== 'ECDSA_HASH160') {
      return 'Invalid key type value (only ECDSA_SECP256K1 or ECDSA_HASH160 are supported)'
    }

    return null
  }
}
