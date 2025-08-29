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

  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null)
  const [currentWallet, setCurrentWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [availableIdentities, setAvailableIdentities] = useState<Identity[]>([])

  const loadStatus = async (): Promise<void> => {
    try {
      const status = await extensionAPI.getStatus()

      setCurrentNetwork(status.network)
      setCurrentWallet(status.currentWalletId)
    } catch (error) {
      console.warn('Failed to load current network:', error)
    }
  }

  // Load status and all wallets on mount
  useEffect(() => {
    void loadStatus().catch(error => {
      console.warn('Failed to load status on mount:', error)
    })
  }, [extensionAPI])

  // Load identities and set current identity
  useEffect(() => {
    const loadCurrentIdentity = async (): Promise<void> => {
      if (currentWallet === null) return

      try {
        // Load identities
        const identitiesData = await extensionAPI.getIdentities()
        const currentIdentityFromApi = await extensionAPI.getCurrentIdentity()

        // Set current Identity if it doesn't exist
        if (currentIdentityFromApi != null && currentIdentityFromApi !== '') {
          void identityChangeHandler(currentIdentityFromApi).catch(error => {
            console.warn('Failed to change identity handler:', error)
          })
        } else if ((identitiesData?.length ?? 0) > 0) {
          const firstIdentity = identitiesData[0].identifier
          void identityChangeHandler(firstIdentity).catch(error => {
            console.warn('Failed to change identity handler:', error)
          })
          await extensionAPI.switchIdentity(firstIdentity).catch(error => {
            console.warn('Failed to set current identity:', error)
          })
        }
      } catch (error) {
        console.warn('Failed to load current identity:', error)
      }
    }

    void loadCurrentIdentity().catch(error => {
      console.warn('Failed to load current identity in effect:', error)
    })
  }, [currentWallet, extensionAPI])

  // change all identities
  useEffect(() => {
    const getIdentities = async (): Promise<void> => {
      if (currentNetwork != null && currentNetwork !== '' && currentWallet != null && currentWallet !== '') {
        try {
          const identitiesData = await extensionAPI.getIdentities()
          setAvailableIdentities(identitiesData)
        } catch (e) {
          console.warn('getIdentities error: ', e)
        }
      }
    }

    void getIdentities().catch(error => {
      console.warn('Failed to get identities in effect:', error)
    })
  }, [currentNetwork, currentWallet])

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

  useEffect(() => {
    void loadWallets().catch(error => {
      console.warn('Failed to load wallets on mount:', error)
    })
  }, [])

  const networkChangeHandler = useCallback(async (network): Promise<void> => {
    try {
      sdk.setNetwork(network as 'testnet' | 'mainnet')
      await extensionAPI.switchNetwork(network)
      const status = await extensionAPI.getStatus()
      const wallets = await loadWallets()

      setCurrentNetwork(status.network)

      if (wallets.length > 0) {
        setCurrentWallet(status.currentWalletId)
      }
    } catch (e) {
      console.warn('changeNetwork error: ', e)
    }
  }, [sdk, extensionAPI, loadWallets])

  const walletChangeHandler = useCallback(async (wallet): Promise<void> => {
    if (wallet !== null && wallet !== '') {
      try {
        await extensionAPI.switchWallet(wallet)
        setCurrentWallet(wallet)
      } catch (e) {
        console.warn('changeWallet error: ', e)
      }
    }
  }, [extensionAPI])

  const identityChangeHandler = useCallback(async (identity): Promise<void> => {
    try {
      await extensionAPI.switchIdentity(identity)
      setCurrentIdentity(identity)
    } catch (e) {
      console.warn('Failed to switch identity:', e)
    }
  }, [extensionAPI])

  const createWallet = useCallback(async (walletType, mnemonic?) => {
    try {
      const result = await extensionAPI.createWallet(walletType, mnemonic)
      await loadWallets()
      await loadStatus()
      return result
    } catch (error) {
      console.warn('Failed to create wallet:', error)
      throw error
    }
  }, [extensionAPI, loadWallets])

  console.log('layout data:', {
    currentNetwork,
    currentWallet,
    currentIdentity
  })

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header
          onNetworkChange={(network) => { void networkChangeHandler(network).catch(error => console.warn('Network change error:', error)) }}
          currentNetwork={currentNetwork}
          onWalletChange={(wallet) => { void walletChangeHandler(wallet).catch(error => console.warn('Wallet change error:', error)) }}
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
      </div>
    </ThemeProvider>
  )
}

export default Layout
