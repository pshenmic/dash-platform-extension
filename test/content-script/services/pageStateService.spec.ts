import { PageStateService } from '../../../src/content-script/services/PageStateService'
import { AppConnectStatus } from '../../../src/types/enums/AppConnectStatus'
import { IdentityType } from '../../../src/types/enums/IdentityType'

// The one place that decides what a website may see. CONNECT_APP and the events
// pushed to a page both go through it.
describe('PageStateService', () => {
  const origin = 'https://app.example.com'
  const identityA = 'idA'
  const identityB = 'idB'

  let appConnectRepository: any
  let identitiesRepository: any
  let walletRepository: any
  let storage: any
  let service: PageStateService

  const connection = (status: AppConnectStatus, identities: string[]): any => ({ id: '100680', url: origin, status, identities })

  beforeEach(() => {
    appConnectRepository = { getByURL: jest.fn(async () => connection(AppConnectStatus.approved, [identityA])) }
    appConnectRepository.forScope = jest.fn(() => appConnectRepository)

    identitiesRepository = {
      forScope: jest.fn(() => identitiesRepository),
      getAll: jest.fn(async () => [
        { identifier: identityA, index: 0, label: null, proTxHash: null, type: IdentityType.regular },
        { identifier: identityB, index: 1, label: null, proTxHash: null, type: IdentityType.regular }
      ])
    }
    walletRepository = { getCurrent: jest.fn(async () => ({ walletId: 'wallet1', currentIdentity: identityA })) }
    walletRepository.forScope = jest.fn(() => walletRepository)
    storage = { get: jest.fn(async (key: string) => key === 'network' ? 'testnet' : 'wallet1') }

    service = new PageStateService(appConnectRepository, identitiesRepository, walletRepository, storage)
  })

  it('pins the wallet and network it was taken against', async () => {
    await service.snapshot(origin)

    expect(appConnectRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'wallet1' })
    expect(identitiesRepository.forScope).toHaveBeenCalledWith({ network: 'testnet', walletId: 'wallet1' })
  })

  it('shows only the granted identities', async () => {
    const snapshot = await service.snapshot(origin)

    expect(snapshot.identities.map(identity => identity.identifier)).toEqual([identityA])
    expect(snapshot).toMatchObject({ network: 'testnet', walletId: 'wallet1', approved: true, currentIdentity: identityA })
  })

  it('shows nothing while the connection is not approved', async () => {
    appConnectRepository.getByURL.mockResolvedValue(connection(AppConnectStatus.pending, [identityA]))

    expect(await service.snapshot(origin)).toMatchObject({ approved: false, identities: [], currentIdentity: null })
  })

  it('shows nothing to a website that never connected', async () => {
    appConnectRepository.getByURL.mockResolvedValue(null)

    expect(await service.snapshot(origin)).toMatchObject({ approved: false, identities: [], currentIdentity: null })
  })

  it('does not name an identity the website may not see as its current one', async () => {
    walletRepository.getCurrent.mockResolvedValue({ walletId: 'wallet1', currentIdentity: identityB })

    expect((await service.snapshot(origin)).currentIdentity).toBe(identityA)
  })

  it('drops a granted identity the wallet no longer holds', async () => {
    appConnectRepository.getByURL.mockResolvedValue(connection(AppConnectStatus.approved, [identityA, 'idGone']))

    const snapshot = await service.snapshot(origin)

    expect(snapshot.identities.map(identity => identity.identifier)).toEqual([identityA])
  })

  it('is empty when no wallet is chosen, without asking about connections', async () => {
    storage.get.mockImplementation(async (key: string) => key === 'network' ? 'testnet' : null)

    expect(await service.snapshot(origin)).toEqual({ network: 'testnet', walletId: null, approved: false, identities: [], currentIdentity: null })
    expect(appConnectRepository.getByURL).not.toHaveBeenCalled()
  })
})
