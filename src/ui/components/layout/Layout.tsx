import React, { FC, useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'

const Layout: FC = () => {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])

  // Load status and all wallets on mount
  useEffect(() => {
    const loadStatus = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()

        setSelectedNetwork(status.network)
        setSelectedWallet(status.currentWalletId)
      } catch (error) {
        console.warn('Failed to load current network:', error)
      }
    }

    const loadAllWallets = async (): Promise<void> => {
      try {
        const wallets = await extensionAPI.getAllWallets()

        setAllWallets(wallets)
      } catch (error) {
        console.warn('Failed to load all wallets:', error)
      }
    }

    void loadStatus()
    void loadAllWallets()
  }, [extensionAPI])

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
          setCurrentIdentity(currentIdentityFromApi)
        } else if ((identitiesData?.length ?? 0) > 0) {
          const firstIdentity = identitiesData[0].identifier
          setCurrentIdentity(firstIdentity)
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

  // change wallet handler
  useEffect(() => {
    const changeWallet = async (): Promise<void> => {
      if (selectedWallet !== null && selectedWallet !== '') {
        try {
          await extensionAPI.switchWallet(selectedWallet)
        } catch (e) {
          // await extensionAPI.switchWallet('')
          console.warn('changeWallet error: ', e)
        }
      }
    }

    void changeWallet()
  }, [selectedWallet, extensionAPI])

  // change network handler
  useEffect(() => {
    const changeNetwork = async (): Promise<void> => {
      if (selectedNetwork !== null && selectedNetwork !== '') {
        try {
          sdk.setNetwork(selectedNetwork as 'testnet' | 'mainnet')
          await extensionAPI.switchNetwork(selectedNetwork)

          if (allWallets.length > 0) {
            const wallet = allWallets.find(wallet => wallet.network === selectedNetwork)
            if (wallet != null) {
              setSelectedWallet(wallet.walletId)
            } else {
              setSelectedWallet(null)
            }
          }
        } catch (e) {
          console.warn('changeNetwork error: ', e)
        }
      }
    }

    void changeNetwork()
  }, [selectedNetwork, extensionAPI, sdk])

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header
          onNetworkChange={setSelectedNetwork}
          currentNetwork={selectedNetwork}
          onWalletChange={setSelectedWallet}
          currentIdentity={currentIdentity}
          currentWalletId={selectedWallet}
          wallets={allWallets}
        />
        <Outlet context={{
          selectedNetwork,
          setSelectedNetwork,
          selectedWallet,
          setSelectedWallet,
          currentIdentity,
          setCurrentIdentity
        }} />
      </div>
    </ThemeProvider>
  )
}

export default Layout
