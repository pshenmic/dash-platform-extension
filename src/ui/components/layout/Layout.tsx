import React, { FC, useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { Identity } from '../../../types'

const Layout: FC = () => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])

  const loadStatus = async (): Promise<void> => {
    try {
      const status = await extensionAPI.getStatus()

      setSelectedNetwork(status.network)
      setSelectedWallet(status.currentWalletId)
    } catch (error) {
      console.warn('Failed to load current network:', error)
    }
  }

  // Load status and all wallets on mount
  useEffect(() => void loadStatus(), [extensionAPI])

  // Load identities and set current identity
  useEffect(() => {
    const loadCurrentIdentity = async (): Promise<void> => {
      if (selectedWallet === null) return

      try {
        // Load identities
        const identitiesData = await extensionAPI.getIdentities()
        const currentIdentityFromApi = await extensionAPI.getCurrentIdentity()

        // Set current Identity if it doesn't exist
        if (currentIdentityFromApi != null && currentIdentityFromApi !== '') {
          identityChangeHandler(currentIdentityFromApi)
        } else if ((identitiesData?.length ?? 0) > 0) {
          const firstIdentity = identitiesData[0].identifier
          identityChangeHandler(firstIdentity)
          await extensionAPI.switchIdentity(firstIdentity).catch(error => {
            console.warn('Failed to set current identity:', error)
          })
        }
      } catch (error) {
        console.warn('Failed to load current identity:', error)
      }
    }

    void loadCurrentIdentity()
  }, [selectedWallet, extensionAPI])

  // change all identities
  useEffect(() => {
    const getIdentities = async (): Promise<void> => {
      if (selectedNetwork != null && selectedNetwork !== '' && selectedWallet != null && selectedWallet !== '') {
        try {
          const identitiesData = await extensionAPI.getIdentities()
          setAvailableIdentities(identitiesData)
        } catch (e) {
          console.warn('getIdentities error: ', e)
        }
      }
    }

    void getIdentities()
  }, [selectedNetwork, selectedWallet])

  const loadWallets = useCallback(async (): Promise<WalletAccountInfo[]> => {
    try {
      const wallets = await extensionAPI.getAllWallets()
      console.log('loadWallets wallets', wallets)
      setAllWallets(wallets)
      return wallets
    } catch (error) {
      console.warn('Failed to load all wallets:', error)
      return []
    }
  }, [extensionAPI])

  useEffect(() => void loadWallets(), [])

  const networkChangeHandler = useCallback(async (network) => {
    try {
      sdk.setNetwork(network as 'testnet' | 'mainnet')
      await extensionAPI.switchNetwork(network)
      const status = await extensionAPI.getStatus()
      const wallets = await loadWallets()

      setSelectedNetwork(status.network)

      if (wallets.length > 0) {
        setSelectedWallet(status.currentWalletId)
      }
    } catch (e) {
      console.warn('changeNetwork error: ', e)
    }
  }, [sdk, extensionAPI, loadWallets])

  const walletChangeHandler = useCallback(async (wallet) => {
    if (wallet !== null && wallet !== '') {
      try {
        await extensionAPI.switchWallet(wallet)
        setSelectedWallet(wallet)
      } catch (e) {
        console.warn('changeWallet error: ', e)
      }
    }
  }, [extensionAPI])

  const identityChangeHandler = useCallback(async (identity) => {
    try {
      await extensionAPI.switchIdentity(identity)
      setCurrentIdentity(identity)
    } catch (e) {
      console.warn('Failed to switch identity:', e)
    }
  }, [extensionAPI])

  const createWallet = useCallback(async (walletType, data) => {
    try {
      const result = await extensionAPI.createWallet(walletType, data)
      await loadWallets()
      await loadStatus()  
      return result
    } catch (error) {
      console.warn('Failed to create wallet:', error)
      throw error
    }
  }, [extensionAPI, loadWallets])


  console.log('layout data:', {
    selectedNetwork,
    selectedWallet,
    currentIdentity
  })

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header
          onNetworkChange={networkChangeHandler}
          currentNetwork={selectedNetwork}
          onWalletChange={walletChangeHandler}
          currentIdentity={currentIdentity}
          currentWalletId={selectedWallet}
          wallets={allWallets}
        />
        <Outlet context={{
          selectedNetwork,
          setSelectedNetwork: networkChangeHandler,
          selectedWallet,
          setSelectedWallet: walletChangeHandler,
          currentIdentity,
          setCurrentIdentity: identityChangeHandler,
          allWallets,
          availableIdentities,
          createWallet
        }}
        />
      </div>
    </ThemeProvider>
  )
}

export default Layout
