import DashPlatformSDK from 'dash-platform-sdk'

let sdk

export const useSdk = () => {
  if (!sdk) {
    sdk = new DashPlatformSDK()
  }

  return sdk
}
