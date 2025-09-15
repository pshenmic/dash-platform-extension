import React, { FC, useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks'
import { useSdk } from '../../hooks'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { GetStatusResponse } from '../../../types/messages/response/GetStatusResponse'
import { NetworkType, EventData, Identity } from '../../../types'
import LoadingScreen from './LoadingScreen'

const Layout: FC = () => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [isApiReady, setIsApiReady] = useState<boolean>(false)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('mainnet')
  const [currentWallet, setCurrentWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])

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
    if (!isApiReady || !currentWallet) return
    try {
      const identities = await extensionAPI.getIdentities()
      setAvailableIdentities(identities)
    } catch (error) {
      console.log('Failed to load identities:', error)
    }
  }, [isApiReady, currentWallet, extensionAPI])

  const loadCurrentIdentity = useCallback(async (): Promise<void> => {
    if (!isApiReady || !currentWallet) return
    try {
      const identity = await extensionAPI.getCurrentIdentity()
      setCurrentIdentity(identity)
    } catch (error) {
      console.log('Failed to load current identity:', error)
    }
  }, [isApiReady, currentWallet, extensionAPI])

  // Network change handler - simplified
  const handleNetworkChange = useCallback(async (network: NetworkType): Promise<void> => {
    if (!isApiReady) return

    try {
      sdk.setNetwork(network)
      await extensionAPI.switchNetwork(network)
      
      const status: GetStatusResponse = await extensionAPI.getStatus()
      setCurrentNetwork(status.network as NetworkType)
      setCurrentWallet(status.currentWalletId)

      // Reload data for new network
      await loadWallets()
    } catch (error) {
      console.log('Network change error:', error)
    }
  }, [isApiReady, sdk, extensionAPI, loadWallets])

  // Wallet change handler - simplified  
  const handleWalletChange = useCallback(async (walletId: string | null): Promise<void> => {
    if (!isApiReady || !walletId) return

    try {
      await extensionAPI.switchWallet(walletId)
      setCurrentWallet(walletId)
    } catch (error) {
      console.log('Wallet change error:', error)
    }
  }, [isApiReady, extensionAPI])

  // Identity change handler
  const handleIdentityChange = useCallback(async (identity: string): Promise<void> => {
    if (!isApiReady) return

    try {
      await extensionAPI.switchIdentity(identity)
      setCurrentIdentity(identity)
    } catch (error) {
      console.log('Identity change error:', error)
    }
  }, [isApiReady, extensionAPI])

  // Create wallet handler
  const createWallet = useCallback(async (walletType: any, mnemonic?: string) => {
    if (!isApiReady) throw new Error('API is not ready')

    try {
      const result = await extensionAPI.createWallet(walletType, mnemonic)
      await loadWallets()
      
      // Get updated status
      const status = await extensionAPI.getStatus()
      setCurrentWallet(status.currentWalletId)
      
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
          
          // Set SDK network
          sdk.setNetwork(status.network as NetworkType)
        }
      } catch (error) {
        console.log('Failed to initialize app:', error)
      }
    }

    const handleContentScriptReady = (event: MessageEvent<EventData>): void => {
      if (event.data?.method === 'content-script-ready') {
        initializeApp()
      }
    }

    window.addEventListener('message', handleContentScriptReady)
    initializeApp() // Try immediate init

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

    loadData()
  }, [isApiReady, loadWallets, loadIdentities, loadCurrentIdentity])

  if (!isApiReady) {
    return (
      <ThemeProvider initialTheme='light'>
        <div className='main_container'>
          <LoadingScreen message='Initializing application...' />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header
          onNetworkChange={handleNetworkChange}
          currentNetwork={currentNetwork}
          onWalletChange={handleWalletChange}
          currentIdentity={currentIdentity}
          currentWalletId={currentWallet}
          wallets={allWallets}
        />
        <Outlet context={{
          currentNetwork,
          setCurrentNetwork: handleNetworkChange,
          currentWallet,
          setCurrentWallet: handleWalletChange,
          currentIdentity,
          setCurrentIdentity: handleIdentityChange,
          allWallets,
          availableIdentities,
          createWallet
        }} />
      </div>
    </ThemeProvider>
  )
}

export default Layout
