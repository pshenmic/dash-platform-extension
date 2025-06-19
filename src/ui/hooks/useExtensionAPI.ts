import { PrivateAPIClient } from '../../types/PrivateAPIClient'

let privateAPIClient: PrivateAPIClient

export const useExtensionAPI = () => {
  if (!privateAPIClient) {
    privateAPIClient = new PrivateAPIClient()
  }

  return privateAPIClient
}
