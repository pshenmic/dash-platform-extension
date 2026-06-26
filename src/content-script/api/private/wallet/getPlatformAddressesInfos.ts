import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PlatformAddressWASM } from 'pshenmic-dpp'
import { GetPlatformAddressesInfosPayload } from '../../../../types/messages/payloads/GetPlatformAddressesInfosPayload'
import { GetPlatformAddressesInfosResponse } from '../../../../types/messages/response/GetPlatformAddressesInfosResponse'

// Fetches balance + nonce for a batch of platform addresses. Never-funded
// addresses come back as 0/0. Balances cross the messaging boundary as strings
// (bigint does not serialize) and are re-parsed with BigInt(...) by the consumer.
export class GetPlatformAddressesInfosHandler implements APIHandler {
  sdk: DashPlatformSDK

  constructor (sdk: DashPlatformSDK) {
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetPlatformAddressesInfosResponse> {
    const payload: GetPlatformAddressesInfosPayload = event.payload

    if (payload.addresses.length === 0) {
      return { infos: [] }
    }

    const network = this.sdk.network
    const infos = await this.sdk.platformAddresses.getAddressesInfos(payload.addresses)

    // The SDK returns infos in proof order, which is not guaranteed to match the
    // request order. Key results by canonical Bech32m and look each requested
    // address up explicitly, so balance/nonce can never be paired with the wrong
    // address. Addresses the SDK omits fall back to 0/0.
    const byAddress = new Map(infos.map(info => [
      info.address.toBech32m(network),
      { balance: info.balance.toString(), nonce: info.nonce }
    ]))

    return {
      infos: payload.addresses.map(address => {
        const key = new PlatformAddressWASM(address).toBech32m(network)
        const info = byAddress.get(key)

        return {
          address,
          balance: info?.balance ?? '0',
          nonce: info?.nonce ?? 0
        }
      })
    }
  }

  validatePayload (payload: GetPlatformAddressesInfosPayload): string | null {
    if (!Array.isArray(payload.addresses)) {
      return 'Addresses must be an array'
    }
    if (payload.addresses.some(address => typeof address !== 'string' || address.length === 0)) {
      return 'Each address must be a non-empty string'
    }

    return null
  }
}
