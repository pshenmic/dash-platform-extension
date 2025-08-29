import hash from 'hash.js'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { BatchTransitionWASM, DataContractUpdateTransitionWASM, PrivateKeyWASM, StateTransitionWASM } from 'pshenmic-dpp'
import { decrypt, PrivateKey } from 'eciesjs'
import { StateTransitionsRepository } from '../../../repository/StateTransitionsRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types/EventData'
import { ApproveStateTransitionResponse } from '../../../../types/messages/response/ApproveStateTransitionResponse'
import { ApproveStateTransitionPayload } from '../../../../types/messages/payloads/ApproveStateTransitionPayload'
import { bytesToHex, bytesToUtf8, hexToBytes, validateHex, validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StateTransitionStatus } from '../../../../types/enums/StateTransitionStatus'
import { Network } from '../../../../types/enums/Network'
import { Wallet } from '../../../../types/Wallet'
import { Identity } from '../../../../types/Identity'

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

  async deriveKeystorePrivateKey (wallet: Wallet, password: string, identityId: string, keyId: number): Promise<PrivateKeyWASM> {
    const keyPairs = await this.keyPairRepository.getAllByIdentity(identityId)

    const [keyPair] = keyPairs
      .filter(keyPair => keyPair.identityPublicKey.keyId === keyId)

    if (keyPair == null || keyPair.encryptedPrivateKey == null) {
      throw new Error(`Could not find private key with KeyID ${keyId} for identity ${identityId}`)
    }

    const passwordHash = hash.sha256().update(password).digest('hex')

    let privateKey

    try {
      privateKey = decrypt(passwordHash, hexToBytes(keyPair.encryptedPrivateKey))
    } catch (e) {
      throw new Error('Failed to decrypt')
    }

    return PrivateKeyWASM.fromBytes(privateKey, wallet.network)
  }

  async deriveSeedphrasePrivateKey (wallet: Wallet, password: string, identityIndex: number, keyId: number): Promise<PrivateKeyWASM> {
    if (wallet.encryptedMnemonic == null) {
      throw new Error('Missing mnemonic')
    }

    const passwordHash = hash.sha256().update(password).digest('hex')
    const secretKey = PrivateKey.fromHex(passwordHash)

    let mnemonic

    try {
      mnemonic = bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
    } catch (e) {
      throw new Error('Failed to decrypt')
    }

    const seed = await this.sdk.keyPair.mnemonicToSeed(mnemonic, undefined, true)
    const hdWallet = await this.sdk.keyPair.seedToWallet(seed)
    const hdKey = await this.sdk.keyPair.walletToIdentityKey(hdWallet, identityIndex, keyId, { network: Network[wallet.network] })
    const privateKey = hdKey.privateKey

    return PrivateKeyWASM.fromBytes(privateKey, wallet.network)
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
      privateKeyWASM = await this.deriveKeystorePrivateKey(wallet, password, identity.identifier, keyId)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKeyWASM = await this.deriveSeedphrasePrivateKey(wallet, password, identity.index, keyId)
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
      txHash: stateTransition.hash
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
