import React, { FC, useState, useEffect, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { ThemeProvider, Identifier } from 'dash-ui-kit/react'
import { useExtensionAPI, useSdk } from '../../hooks'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { GetStatusResponse } from '../../../types/messages/response/GetStatusResponse'
import { NetworkType, EventData, Identity } from '../../../types'
import type { HeaderConfigOverride } from '../../types'
import LoadingScreen from './screens/LoadingScreen'
import { isTabView, findOpenExtensionTab } from '../../utils/extensionTab'
import { ConfirmDialog } from '../controls'

type PendingSwitch =
  | { type: 'wallet', walletId: string | null }
  | { type: 'network', network: NetworkType }
  | { type: 'identity', identityId: string }

type BlockedSwitch = PendingSwitch & { openTabIdentityId: string | null }

export interface LayoutContext {
  currentNetwork: NetworkType
  setCurrentNetwork: (network: NetworkType) => Promise<void>
  currentWallet: string | null
  setCurrentWallet: (walletId: string | null) => Promise<void>
  currentIdentity: string | null
  setCurrentIdentity: (identity: string) => Promise<void>
  allWallets: WalletAccountInfo[]
  hasAnyWallet: boolean
  reloadWallets: () => Promise<void>
  availableIdentities: Identity[]
  createWallet: (walletType: any, mnemonic?: string) => Promise<any>
  headerComponent: React.ReactNode
  setHeaderComponent: (component: React.ReactNode) => void
  headerConfigOverride: HeaderConfigOverride | null
  setHeaderConfigOverride: (config: HeaderConfigOverride | null) => void
}

const Layout: FC = () => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [isApiReady, setIsApiReady] = useState<boolean>(false)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('mainnet')
  const [currentWallet, setCurrentWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [hasAnyWallet, setHasAnyWallet] = useState<boolean>(false)
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])
  const [headerComponent, setHeaderComponent] = useState<React.ReactNode>(null)
  const [headerConfigOverride, setHeaderConfigOverride] = useState<HeaderConfigOverride | null>(null)
  const [blockedSwitch, setBlockedSwitch] = useState<BlockedSwitch | null>(null)

  // Read inside guardSwitch without making it change identity on every switch,
  // which would re-trigger the selectors that call it.
  const selectedRef = useRef({ currentWallet, currentNetwork, currentIdentity })
  selectedRef.current = { currentWallet, currentNetwork, currentIdentity }

  const loadWallets = useCallback(async (): Promise<WalletAccountInfo[]> => {
    if (!isApiReady) return []
    try {
      const wallets = await extensionAPI.getAllWallets()
      setAllWallets(wallets)
      return wallets
    } catch (error) {
      console.log('Failed to load wallets:', error)
      return []
    }
  }, [isApiReady, extensionAPI])

  const loadIdentities = useCallback(async (): Promise<void> => {
    if (!isApiReady || currentWallet == null) return
    try {
      const identities = await extensionAPI.getIdentities()
      setAvailableIdentities(identities)
    } catch (error) {
      console.log('Failed to load identities:', error)
    }
  }, [isApiReady, currentWallet, extensionAPI])

  const loadCurrentIdentity = useCallback(async (): Promise<void> => {
    if (!isApiReady || currentWallet == null) return
    try {
      const identity = await extensionAPI.getCurrentIdentity()
      setCurrentIdentity(identity)
    } catch (error) {
      console.log('Failed to load current identity:', error)
    }
  }, [isApiReady, currentWallet, extensionAPI])

  const applyNetworkChange = useCallback(async (network: NetworkType): Promise<void> => {
    if (!isApiReady) return

    try {
      sdk.setNetwork(network)
      await extensionAPI.switchNetwork(network)

      const status: GetStatusResponse = await extensionAPI.getStatus()
      setCurrentNetwork(status.network as NetworkType)
      setCurrentWallet(status.currentWalletId)

      await loadWallets()
    } catch (error) {
      console.log('Network change error:', error)
    }
  }, [isApiReady, sdk, extensionAPI, loadWallets])

  const applyWalletChange = useCallback(async (walletId: string | null): Promise<void> => {
    if (!isApiReady || walletId === null || walletId === '') return

    try {
      await extensionAPI.switchWallet(walletId)
      setCurrentWallet(walletId)
    } catch (error) {
      console.log('Wallet change error:', error)
    }
  }, [isApiReady, extensionAPI])

  const applyIdentityChange = useCallback(async (identity: string): Promise<void> => {
    if (!isApiReady) return

    try {
      await extensionAPI.switchIdentity(identity)
      setCurrentIdentity(identity)
    } catch (error) {
      console.log('Identity change error:', error)
    }
  }, [isApiReady, extensionAPI])

  // A top-up tab is bound to the wallet and network it was opened under,
  // so switching either one strands it. Ask before doing that.
  const guardSwitch = useCallback(async (target: PendingSwitch): Promise<void> => {
    // Selectors re-emit the current value on mount, so a switch to what is
    // already selected changes nothing and needs no confirmation.
    const selected = selectedRef.current

    const isNoop = target.type === 'wallet'
      ? target.walletId === selected.currentWallet
      : target.type === 'network'
        ? target.network === selected.currentNetwork
        : target.identityId === selected.currentIdentity

    if (!isNoop) {
      const openTab = await findOpenExtensionTab('topup')

      if (openTab != null) {
        const changesTabContext = target.type === 'wallet'
          ? target.walletId !== openTab.walletId
          : target.type === 'network'
            ? target.network !== openTab.network
            : target.identityId !== openTab.identityId

        if (changesTabContext) {
          setBlockedSwitch({ ...target, openTabIdentityId: openTab.identityId })
          return
        }
      }
    }

    await (target.type === 'wallet'
      ? applyWalletChange(target.walletId)
      : target.type === 'network'
        ? applyNetworkChange(target.network)
        : applyIdentityChange(target.identityId))
  }, [applyWalletChange, applyNetworkChange, applyIdentityChange])

  const handleNetworkChange = useCallback(async (network: NetworkType): Promise<void> => {
    await guardSwitch({ type: 'network', network })
  }, [guardSwitch])

  const handleWalletChange = useCallback(async (walletId: string | null): Promise<void> => {
    await guardSwitch({ type: 'wallet', walletId })
  }, [guardSwitch])

  const handleIdentityChange = useCallback(async (identity: string): Promise<void> => {
    await guardSwitch({ type: 'identity', identityId: identity })
  }, [guardSwitch])

  const reloadWallets = useCallback(async (): Promise<void> => {
    const wallets = await loadWallets()
    const networkWallets = wallets.filter(w => w.network === currentNetwork)
    const stillExists = networkWallets.some(w => w.walletId === currentWallet)
    if (!stillExists) {
      if (networkWallets.length > 0) {
        await applyWalletChange(networkWallets[0].walletId)
      } else {
        setCurrentWallet(null)
      }
    }
    const status = await extensionAPI.getStatus()
    setHasAnyWallet(status.hasAnyWallet)
  }, [loadWallets, currentNetwork, currentWallet, applyWalletChange, extensionAPI])

  const createWallet = useCallback(async (walletType: any, mnemonic?: string) => {
    if (!isApiReady) throw new Error('API is not ready')

    try {
      const result = await extensionAPI.createWallet(walletType, mnemonic)
      await loadWallets()

      const status = await extensionAPI.getStatus()
      setCurrentWallet(status.currentWalletId)
      setHasAnyWallet(true)

      return result
    } catch (error) {
      console.log('Failed to create wallet:', error)
      throw error
    }
  }, [isApiReady, extensionAPI, loadWallets])

  // Initial load
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()

        if (status.ready) {
          setIsApiReady(true)
          setCurrentNetwork(status.network as NetworkType)
          setCurrentWallet(status.currentWalletId)
          setHasAnyWallet(status.hasAnyWallet)
          sdk.setNetwork(status.network as NetworkType)
        }
      } catch (error) {
        console.log('Failed to initialize app:', error)
      }
    }

    const handleContentScriptReady = (event: MessageEvent<EventData>): void => {
      if (event.data?.method === 'content-script-ready') {
        initializeApp().catch(e => console.log('initializeApp error', e))
      }
    }

    window.addEventListener('message', handleContentScriptReady)
    initializeApp().catch(e => console.log('initializeApp error', e))

    return () => {
      window.removeEventListener('message', handleContentScriptReady)
    }
  }, [extensionAPI, sdk])

  // Load data when API becomes and callbacks changes
  useEffect(() => {
    if (!isApiReady) return

    const loadData = async (): Promise<void> => {
      await loadWallets()
      await loadIdentities()
      await loadCurrentIdentity()
    }

    loadData().catch(e => console.log('loadData error', e))
  }, [isApiReady, loadWallets, loadIdentities, loadCurrentIdentity])

  // body sits outside the React root, so its tab-mode class is synced here
  useEffect(() => {
    if (!isTabView()) return

    document.body.classList.add('tab-view')

    return () => { document.body.classList.remove('tab-view') }
  }, [])

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        {isApiReady
          ? <Outlet context={{
            currentNetwork,
            setCurrentNetwork: handleNetworkChange,
            currentWallet,
            setCurrentWallet: handleWalletChange,
            currentIdentity,
            setCurrentIdentity: handleIdentityChange,
            allWallets,
            hasAnyWallet,
            reloadWallets,
            availableIdentities,
            createWallet,
            headerComponent,
            setHeaderComponent,
            headerConfigOverride,
            setHeaderConfigOverride
          }}
            />
          : <LoadingScreen message='Initializing application...' />}

        <ConfirmDialog
          open={blockedSwitch !== null}
          onOpenChange={(open) => { if (!open) setBlockedSwitch(null) }}
          title='Top-up in progress'
          message={
            <span className='flex flex-col gap-2'>
              <span>A top-up is open in another tab{blockedSwitch?.openTabIdentityId != null ? ' for identity:' : '.'}</span>

              {blockedSwitch?.openTabIdentityId != null && (
                <Identifier ellipsis={false} highlight='both'>
                  {blockedSwitch.openTabIdentityId}
                </Identifier>
              )}

              <span>
                {blockedSwitch?.type === 'identity'
                  ? 'It stays bound to that identity and will credit it, not the one you are switching to.'
                  : `Switching the ${blockedSwitch?.type === 'network' ? 'network' : 'wallet'} will break it, and funds already sent will stay on the funding address.`}
              </span>
            </span>
          }
          confirmText='Switch Anyway'
          cancelText='Cancel'
          onConfirm={() => {
            const target = blockedSwitch
            setBlockedSwitch(null)

            if (target == null) return

            void (target.type === 'wallet'
              ? applyWalletChange(target.walletId)
              : target.type === 'network'
                ? applyNetworkChange(target.network)
                : applyIdentityChange(target.identityId))
          }}
        />
      </div>
    </ThemeProvider>
  )
}

export default Layout
