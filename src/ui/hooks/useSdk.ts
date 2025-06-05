import DashPlatformSDK from 'dash-platform-sdk/dist/main'

let sdk

export const useSdk = () => {
  if (!sdk) {
    sdk = new DashPlatformSDK()
  }

  return sdk
}
