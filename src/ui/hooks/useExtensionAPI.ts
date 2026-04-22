import { PrivateAPIClient } from '../../types/PrivateAPIClient'

let privateAPIClient: PrivateAPIClient

export const useExtensionAPI = (): PrivateAPIClient => {
  if (privateAPIClient == null) {
    privateAPIClient = new PrivateAPIClient()
  }
(window as any).privateAPI = privateAPIClient
  return privateAPIClient
}
