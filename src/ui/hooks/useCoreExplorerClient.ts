import { CoreExplorerClient } from '../../types/CoreExplorerClient'

let coreExplorerClient: CoreExplorerClient

export const useCoreExplorerClient = (): CoreExplorerClient => {
  if (coreExplorerClient == null) {
    coreExplorerClient = new CoreExplorerClient()
  }

  return coreExplorerClient
}
