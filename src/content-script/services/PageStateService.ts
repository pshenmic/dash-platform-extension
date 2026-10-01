import { AppConnect } from '../../types'
import { IdentityInfo } from '../../types/IdentityInfo'
import { PageState } from '../../types/PageState'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { RepositoryScope } from '../../types/RepositoryScope'
import { NetworkType } from '../../types/PlatformExplorer'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { StorageAdapter } from '../storage/storageAdapter'

/**
 * What a website may see of the wallet: the single place that applies a
 * connection's grant, so the answer to CONNECT_APP and the events pushed to the
 * page can never disagree.
 */
export class PageStateService {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter

  constructor (
    appConnectRepository: AppConnectRepository,
    identitiesRepository: IdentitiesRepository,
    walletRepository: WalletRepository,
    storageAdapter: StorageAdapter
  ) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  // Identities of the wallet this connection was granted, and which of them the
  // website should act as. Nothing is visible until the user approves.
  async visible (appConnect: AppConnect | null, scope?: RepositoryScope): Promise<{ identities: IdentityInfo[], currentIdentity: string | null }> {
    const granted = appConnect?.status === AppConnectStatus.approved ? appConnect.identities : []

    // A snapshot pins the pair it was taken against, so a switch midway cannot
    // mix one wallet's identities with another's connection.
    const identitiesRepository = scope == null ? this.identitiesRepository : this.identitiesRepository.forScope(scope)
    const walletRepository = scope == null ? this.walletRepository : this.walletRepository.forScope(scope)

    const identities = (await identitiesRepository.getAll())
      .filter(identity => granted.includes(identity.identifier))
      .map(identity => ({ identifier: identity.identifier, type: identity.type, proTxHash: identity.proTxHash }))

    const wallet = await walletRepository.getCurrent()

    // The wallet's own current identity when the website may see it, otherwise
    // the first one it may, so a connected site always has something to act as.
    const currentIdentity = wallet?.currentIdentity != null && granted.includes(wallet.currentIdentity)
      ? wallet.currentIdentity
      : identities[0]?.identifier ?? null

    return { identities, currentIdentity }
  }

  // The whole picture for one website, including the wallet and network it is
  // taken against: a later snapshot is compared with it to tell the page what
  // changed.
  async snapshot (origin: string): Promise<PageState> {
    const network = await this.storageAdapter.get('network') as string | null
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      return { network, walletId: null, approved: false, identities: [], currentIdentity: null }
    }

    const scope: RepositoryScope = { network: network as NetworkType, walletId }

    const appConnect = await this.appConnectRepository.forScope(scope).getByURL(origin)
    const { identities, currentIdentity } = await this.visible(appConnect, scope)

    return {
      network,
      walletId,
      approved: appConnect?.status === AppConnectStatus.approved,
      identities,
      currentIdentity
    }
  }
}
