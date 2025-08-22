import React, { FC, useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

const Layout: FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null)
  const extensionAPI = useExtensionAPI()

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

  useEffect(() => {
    const loadCurrentNetwork = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setSelectedNetwork(status.network)
        setCurrentWalletId(status.currentWalletId)
        setSelectedWallet(status.currentWalletId)
      } catch (error) {
        console.warn('Failed to load current network:', error)
      }
    }

    void loadCurrentNetwork()
  }, [extensionAPI])

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header
          onNetworkChange={setSelectedNetwork}
          currentNetwork={selectedNetwork}
          onWalletChange={setSelectedWallet}
          currentIdentity={currentIdentity}
          currentWalletId={currentWalletId}
        />
        <Outlet context={{ selectedNetwork, setSelectedNetwork, selectedWallet, currentIdentity, setCurrentIdentity }} />
      </div>
    </ThemeProvider>
  )
}

export default Layout
