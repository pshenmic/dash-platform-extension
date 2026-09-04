import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { IdentityType } from '../../../../types/enums/IdentityType'
import {
  buildPlatformSourceCandidates,
  selectPlatformSource,
  derivePlatformAddressPrivateKey,
  deriveIdentityPrivateKey,
  findNextLocalIdentityIndex
} from '../../../../utils'
import { IDENTITY_KEY_DEFINITIONS, buildSignedIdentityCreateFromAddress } from '../../../../utils/identityRegistration'
import { isIdentityNotFoundError } from '../../../../utils/isIdentityNotFoundError'
import { IDENTITY_INDEX_SCAN_LIMIT, TRANSFER_FEE_CREDITS } from '../../../../constants'
import { RegisterIdentityFromAddressPayload } from '../../../../types/messages/payloads/RegisterIdentityFromAddressPayload'
import { RegisterIdentityFromAddressResponse } from '../../../../types/messages/response/RegisterIdentityFromAddressResponse'

// Registers a new identity funded from a Platform address via an
// IdentityCreateFromAddresses state transition. Reuses the registration key
// machinery (free-index scan, 6 identity keys, proof-of-possession) and our
// platform source selection; the funding is the source address witness instead
// of an L1 asset lock.
export class RegisterIdentityFromAddressHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, identitiesRepository: IdentitiesRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<RegisterIdentityFromAddressResponse> {
    const payload: RegisterIdentityFromAddressPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Identity registration from a platform address is only supported for a seedphrase wallet')
    }

    const account = 0
    const amountCredits = BigInt(payload.amountCredits)

    // Find the next identity index whose auth key is not already registered.
    const identities = await this.identitiesRepository.getAll()
    const startIndex = findNextLocalIdentityIndex(identities.map(identity => identity.index))
    const scanLimit = startIndex + IDENTITY_INDEX_SCAN_LIMIT

    let identityIndex = startIndex
    let foundFreeIndex = false

    while (identityIndex < scanLimit) {
      const authPrivateKey = await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, 0, this.sdk)

      if (!(await this.isIdentityRegistered(authPrivateKey.getPublicKeyHash()))) {
        foundFreeIndex = true
        break
      }

      identityIndex++
    }

    if (!foundFreeIndex) {
      throw new Error(`Could not find a free identity index within ${IDENTITY_INDEX_SCAN_LIMIT} indexes from ${startIndex}`)
    }

    // Derive the identity key pairs (HD-derived for recoverability).
    const identityPrivateKeys: PrivateKeyWASM[] = []
    for (const { id } of IDENTITY_KEY_DEFINITIONS) {
      identityPrivateKeys.push(await deriveIdentityPrivateKey(wallet, payload.password, identityIndex, id, this.sdk))
    }

    // Select the funding platform address and derive its key.
    const xpub = await this.walletRepository.getPlatformAccountXpub(account)
    if (xpub == null) {
      throw new Error('Platform xpub is not initialized')
    }

    const count = await this.walletRepository.getPlatformAddressCount(account)
    if (count === 0) {
      throw new Error('No Platform addresses have been created yet')
    }

    const candidates = await buildPlatformSourceCandidates(this.sdk, xpub, wallet.network, account, count)
    const fromAddress = payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined
    const source = selectPlatformSource(candidates, amountCredits, fromAddress)
    const sourcePrivateKey = await derivePlatformAddressPrivateKey(wallet, payload.password, account, source.index, this.sdk)

    const stateTransition = buildSignedIdentityCreateFromAddress(this.sdk, identityPrivateKeys, source.platformAddress, source.nonce, amountCredits, sourcePrivateKey)

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    // IdentityCreateFromAddresses does not expose the new identity id on the state
    // transition (getOwnerId is null — there is no asset-lock outpoint to derive it
    // from). Resolve it after registration by looking up the identity via its
    // master authentication key's public key hash.
    const authKeyPublicKeyHash = identityPrivateKeys[0].getPublicKeyHash()
    const identity = await this.sdk.identities.getIdentityByPublicKeyHash(authKeyPublicKeyHash)
    const identifier = identity?.id.base58()

    if (identifier == null || identifier === '') {
      throw new Error('Could not resolve the registered identity identifier')
    }

    const existingIdentity = await this.identitiesRepository.getByIdentifier(identifier)
    if (existingIdentity == null) {
      await this.identitiesRepository.create(identifier, IdentityType.regular, identityIndex)
    }

    await this.walletRepository.switchIdentity(identifier)

    return {
      identifier,
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      feeCredits: TRANSFER_FEE_CREDITS.toString(),
      fromAddress: source.platformAddress
    }
  }

  // Returns whether an identity is already registered for this auth key public
  // key hash. Only a genuine "not found" counts as a free index; any other error
  // is rethrown so a transient failure is never mistaken for a free index.
  private async isIdentityRegistered (pkh: string): Promise<boolean> {
    const lookups = [
      async () => await this.sdk.identities.getIdentityByPublicKeyHash(pkh),
      async () => await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(pkh)
    ]

    for (const lookup of lookups) {
      try {
        if ((await lookup()) != null) {
          return true
        }
      } catch (e) {
        if (!isIdentityNotFoundError(e)) {
          throw e
        }
      }
    }

    return false
  }

  validatePayload (payload: RegisterIdentityFromAddressPayload): string | null {
    if (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n) {
      return 'Amount must be a positive integer string of credits'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }

    return null
  }
}
