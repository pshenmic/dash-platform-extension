import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { APIHandler } from '../../APIHandler'
import {FetchIdentityByPublicKeyHashPayload} from "../../../../types/messages/payloads/FetchIdentityByPublicKeyHash";
import {validateHex} from "../../../../utils";
import {
  FetchIdentityByPublicKeyHashResponse
} from "../../../../types/messages/response/FetchIdentityByPublicKeyHashResponse";
import {DashPlatformSDK} from "dash-platform-sdk";
import {IdentityPublicKeyWASM} from "pshenmic-dpp";
import {EventData} from "../../../../types/EventData";

export class FetchIdentityByPublicKeyHashHandler implements APIHandler {
  identitiesRepository: IdentitiesRepository
  sdk: DashPlatformSDK

  constructor (identitiesRepository: IdentitiesRepository, sdk: DashPlatformSDK) {
    this.identitiesRepository = identitiesRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<FetchIdentityByPublicKeyHashResponse> {
    const payload: FetchIdentityByPublicKeyHashPayload = event.payload

    let uniqueIdentity

    try {
      uniqueIdentity = await this.sdk.identities.getIdentityByPublicKeyHash(payload.publicKeyHash)
    } catch (e) {
    }

    let nonUniqueIdentity

    try {
      nonUniqueIdentity = await this.sdk.identities.getIdentityByNonUniquePublicKeyHash(payload.publicKeyHash)
    } catch (e) {
    }

    const [identity] = [uniqueIdentity, nonUniqueIdentity].filter((e => e != null))

    if (!identity) {
      return {identity: null}
    }

    const [identityPublicKey] = identity.getPublicKeys()
        .filter((publicKey: IdentityPublicKeyWASM) =>
            publicKey.getPublicKeyHash() === payload.publicKeyHash &&
            publicKey.purpose === 'AUTHENTICATION' &&
            publicKey.securityLevel === 'HIGH')

    if (identityPublicKey == null) {
      throw new Error('Please use a key with purpose AUTHENTICATION and security level HIGH')
    }

    const balance = await this.sdk.identities.getIdentityBalance(identity.id.base58())

    return {
      identity: {
        index: -1,
        identifier: identity.id.base58(),
        balance: balance.toString(),
        label: null
      }
    }
  }

  validatePayload (payload: FetchIdentityByPublicKeyHashPayload): null | string {
    if(!validateHex(payload.publicKeyHash)) {
      return 'Bad public key hash format'
    }

    return null
  }
}
