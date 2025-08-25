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

  // Load identities and set current identity
  useEffect(() => {
    const loadCurrentIdentity = async (): Promise<void> => {
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
  }, [extensionAPI])

  // TODO: Separate to switchNetwork and switchWallet
  useEffect(() => {
    const changeNetwork = async (): Promise<void> => {
      if (selectedWallet && selectedNetwork) {
        await extensionAPI.switchWallet(selectedWallet, selectedNetwork)
        sdk.setNetwork(selectedNetwork as 'testnet' | 'mainnet')
      }
    }

    void changeNetwork()
  }, [selectedNetwork, selectedWallet, extensionAPI, sdk]);

  useEffect(() => {
    const loadStatusAndWallets = async (): Promise<void> => {
      try {
        const [status, wallets] = await Promise.all([
          extensionAPI.getStatus(),
          extensionAPI.getAllWallets()
        ])

        setSelectedNetwork(status.network)
        setSelectedWallet(status.currentWalletId)
        setAllWallets(wallets)
      } catch (error) {
        console.warn('Failed to load current network:', error)
      }
    }

    void loadStatusAndWallets()
  }, [extensionAPI, selectedNetwork])

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
        <Outlet context={{ selectedNetwork, setSelectedNetwork, selectedWallet, currentIdentity, setCurrentIdentity }} />
      </div>
    </ThemeProvider>
  )
}

export default Layout
