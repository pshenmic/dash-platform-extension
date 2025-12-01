import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { bytesToHex, deriveSeedphrasePrivateKey, generateRandomHex } from '../../../../utils'
import { KeyType, PrivateKeyWASM, Purpose, SecurityLevel } from 'pshenmic-dpp'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { CreateIdentityPrivateKeyPayload } from '../../../../types/messages/payloads/CreateIdentityPrivateKeyPayload'
import { CreateIdentityPrivateKeyResponse } from '../../../../types/messages/response/CreateIdentityPrivateKeyResponse'
import { IdentityPublicKeyInCreation } from 'dash-platform-sdk/src/types'

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
      const existing = await this.keypairRepository.isExisting(identity.identifier, nextKeyId)

      if (existing) {
        privateKeyWASM = await this.keypairRepository.getPrivateKeyFromWallet(wallet, identity, nextKeyId, payload.password)
      } else {
        privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(64), network)

        await this.keypairRepository.add(identity.identifier, privateKeyWASM.hex(), nextKeyId, true)
      }
    } else if (wallet.type === 'seedphrase') {
      // if seedphrase - derive private key of next unused key
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, payload.password, identity.index, nextKeyId, this.sdk)
    } else {
      throw new Error('Unknown wallet type')
    }

    let data: Uint8Array = privateKeyWASM.getPublicKey().hash160()
    let publicKeyHash: string

    if (keyType === KeyType.ECDSA_HASH160) {
      data = privateKeyWASM.getPublicKey().hash160()
      publicKeyHash = bytesToHex(data)
    } else if (keyType === KeyType.ECDSA_SECP256K1) {
      data = privateKeyWASM.getPublicKey().bytes()
      publicKeyHash = privateKeyWASM.getPublicKeyHash()
    } else {
      throw new Error(`Unsupported key type (${payload.keyType})`)
    }

    let signature

    if (keyType === KeyType.ECDSA_SECP256K1) {
      const identityPublicKeyInCreation: IdentityPublicKeyInCreation = {
        data,
        id: 0,
        keyType,
        purpose: Purpose.SYSTEM,
        readOnly: false,
        securityLevel: SecurityLevel.MEDIUM
      }

      // const identityNonce = await this.sdk.identities.getIdentityNonce(identity.identifier)

      const stateTransition = this.sdk.identities.createStateTransition('update',
          {
            identityId: identity.identifier,
            addPublicKeys: [identityPublicKeyInCreation],
            revision: identityWASM.revision + 1n,
            identityNonce: 1n,
          }
      )

      const masterKeyId = 0

      const signerIdentityPublicKey = identityWASM.getPublicKeys()[masterKeyId]
      const signerPrivateKey = await this.keypairRepository.getPrivateKeyFromWallet(wallet, identity, masterKeyId, payload.password)

      stateTransition.signByPrivateKey(signerPrivateKey, 0, signerIdentityPublicKey.keyType)

      signature = stateTransition.signature
    }

    return {
      identifier: identity.identifier,
      keyId: nextKeyId,
      publicKeyData: bytesToHex(data),
      publicKeyHash,
      signature: signature != null ? bytesToHex(signature) : undefined
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
