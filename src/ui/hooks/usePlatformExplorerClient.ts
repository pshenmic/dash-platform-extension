import { PlatformExplorerClient } from '../../types/PlatformExplorerClient'

let platformExplorerClient: PlatformExplorerClient

export const usePlatformExplorerClient = (): PlatformExplorerClient => {
  if (platformExplorerClient == null) {
    platformExplorerClient = new PlatformExplorerClient()
  }

  return platformExplorerClient
}
