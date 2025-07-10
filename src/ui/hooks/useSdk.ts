import { DashPlatformSDK } from 'dash-platform-sdk'

let sdk: DashPlatformSDK | null = null

export const useSdk = (): DashPlatformSDK => {
  if (sdk == null) {
    sdk = new DashPlatformSDK()
  }

  return sdk
}
