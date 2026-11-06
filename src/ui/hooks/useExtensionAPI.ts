import { PrivateAPIClient } from '../../types/PrivateAPIClient'
import { PreviewAPIClient, isPreviewMode } from '../preview/PreviewAPIClient'

let privateAPIClient: PrivateAPIClient
let previewAPIClient: PrivateAPIClient

export const useExtensionAPI = (): PrivateAPIClient => {
  // Temporary: /preview routes get a mocked client, checked on every call so a hash change without reload still switches.
  if (isPreviewMode()) {
    if (previewAPIClient == null) previewAPIClient = new PreviewAPIClient()
    return previewAPIClient
  }

  if (privateAPIClient == null) {
    privateAPIClient = new PrivateAPIClient()
  }

  return privateAPIClient
}
