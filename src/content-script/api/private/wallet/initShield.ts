import { APIHandler } from '../../APIHandler'
import { DashPlatformSDK } from 'dash-platform-sdk'

// Initializes the Halo2 shielded prover once and caches it on the SDK instance,
// so subsequent shielded spends skip the heavy builder set-up. CPU-heavy in the
// popup — the client calls it with an extended timeout.
export class InitShieldHandler implements APIHandler {
  sdk: DashPlatformSDK

  constructor (sdk: DashPlatformSDK) {
    this.sdk = sdk
  }

  async handle (): Promise<{ ready: boolean }> {
    console.time('[shielded] init (Halo2 builder)')
    try {
      await this.sdk.shielded.init()
    } finally {
      console.timeEnd('[shielded] init (Halo2 builder)')
    }

    return { ready: true }
  }

  validatePayload (): string | null {
    return null
  }
}
