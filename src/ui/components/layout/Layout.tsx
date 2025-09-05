import React, { FC, useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { GetStatusResponse } from '../../../types/messages/response/GetStatusResponse'
import { NetworkType, EventData, Identity } from '../../../types'

const Layout: FC = () => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [isApiReady, setIsApiReady] = useState<boolean>(false)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('mainnet')
  const [currentWallet, setCurrentWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])

  const loadStatus = async (): Promise<void> => {
    try {
      const status = await extensionAPI.getStatus()

      if (status.ready) {
        setIsApiReady(true)
        setCurrentNetwork(status.network as NetworkType)
        setCurrentWallet(status.currentWalletId)
      } else {
        setIsApiReady(false)
      }
    } catch (error) {
      console.log('Failed to load current network:', error)
      setIsApiReady(false)
    }
  }

  useEffect(() => {
    const handleContentScriptReady = (event: MessageEvent<EventData>): void => {
      const data = event.data

      if (data?.method === 'content-script-ready') {
        setIsApiReady(true)

        loadStatus().catch(error => {
          console.log('Failed to load status after content script ready:', error)
        })
      }
    }

    window.addEventListener('message', handleContentScriptReady)

    loadStatus().catch(error => {
      console.log('Failed to load status on mount:', error)
    })

    return () => {
      window.removeEventListener('message', handleContentScriptReady)
    }
  }, [])

  // Load identities and set current identity
  useEffect(() => {
    const loadCurrentIdentity = async (): Promise<void> => {
      if (!isApiReady || currentWallet === null) return

      try {
        const currentIdentityFromApi = await extensionAPI.getCurrentIdentity()
        setCurrentIdentity(currentIdentityFromApi)
      } catch (error) {
        console.log('Failed to load current identity:', error)
      }
    }

    loadCurrentIdentity().catch(error => {
      console.log('Failed to load current identity in effect:', error)
    })
  }, [isApiReady, currentWallet, extensionAPI])

  // change all identities
  useEffect(() => {
    const getIdentities = async (): Promise<void> => {
      if (!isApiReady || currentNetwork == null || currentWallet == null) return

      try {
        const identitiesData = await extensionAPI.getIdentities()
        setAvailableIdentities(identitiesData)
      } catch (e) {
        console.log('getIdentities error: ', e)
      }
    }

    getIdentities().catch(error => {
      console.log('Failed to get identities in effect:', error)
    })
  }, [isApiReady, currentNetwork, currentWallet, extensionAPI])

  const loadWallets = useCallback(async (): Promise<WalletAccountInfo[]> => {
    if (!isApiReady) return []

    try {
      const wallets = await extensionAPI.getAllWallets()
      setAllWallets(wallets)
      return wallets
    } catch (error) {
      console.log('Failed to load all wallets:', error)
      return []
    }
  }, [isApiReady, extensionAPI])

  useEffect(() => {
    if (!isApiReady) return

    loadWallets().catch(error => {
      console.log('Failed to load wallets on mount:', error)
    })
  }, [isApiReady, loadWallets])

  const networkChangeHandler = useCallback(async (network): Promise<void> => {
    if (!isApiReady) return

    try {
      if (currentNetwork === network) return

      sdk.setNetwork(network as NetworkType)
      await extensionAPI.switchNetwork(network)
      const status: GetStatusResponse = await extensionAPI.getStatus()
      const wallets = await loadWallets()

      setCurrentNetwork(status.network as NetworkType)

      if (wallets.length > 0) {
        setCurrentWallet(status.currentWalletId)
      }
    } catch (e) {
      console.log('changeNetwork error: ', e)
    }
  }, [isApiReady, sdk, extensionAPI, loadWallets, currentNetwork])

  const walletChangeHandler = useCallback(async (wallet): Promise<void> => {
    if (!isApiReady || wallet === null) return

    try {
      await extensionAPI.switchWallet(wallet)
      setCurrentWallet(wallet)
    } catch (e) {
      console.warn('changeWallet error: ', e)
    }
  }, [isApiReady, extensionAPI])

  const identityChangeHandler = useCallback(async (identity): Promise<void> => {
    if (!isApiReady) return

    try {
      await extensionAPI.switchIdentity(identity)
      setCurrentIdentity(identity)
    } catch (e) {
      console.log('Failed to switch identity:', e)
    }
  }, [isApiReady, extensionAPI])

  const createWallet = useCallback(async (walletType, mnemonic?) => {
    if (!isApiReady) {
      throw new Error('API is not ready')
    }

    try {
      const result = await extensionAPI.createWallet(walletType, mnemonic)
      await loadWallets()
      await loadStatus()
      return result
    } catch (error) {
      console.log('Failed to create wallet:', error)
      throw error
    }
  }, [isApiReady, extensionAPI, loadWallets])

  if (!isApiReady) {
    return (
      <ThemeProvider initialTheme='light'>
        <div className='main_container'>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            loading
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        {isApiReady
          ? (
            <>
              <Header
                onNetworkChange={(network) => {
                  networkChangeHandler(network).catch(error => console.log('Network change error:', error))
                }}
                currentNetwork={currentNetwork}
                onWalletChange={(wallet) => {
                  walletChangeHandler(wallet).catch(error => console.log('Wallet change error:', error))
                }}
                currentIdentity={currentIdentity}
                currentWalletId={currentWallet}
                wallets={allWallets}
              />
              <Outlet context={{
                currentNetwork,
                setCurrentNetwork: networkChangeHandler,
                currentWallet,
                setCurrentWallet: walletChangeHandler,
                currentIdentity,
                setCurrentIdentity: identityChangeHandler,
                allWallets,
                availableIdentities,
                createWallet
              }}
              />
            </>
            )
          : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              loading
            </div>
            )}
      </div>
    </ThemeProvider>
  )
}

export default Layout
