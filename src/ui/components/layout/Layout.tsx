import React, { FC, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui/react'

const Layout: FC = () => {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container'>
        <Header 
          onNetworkChange={setSelectedNetwork}
          currentNetwork={selectedNetwork}
          onWalletChange={setSelectedWallet}
        />
        <Outlet context={{ selectedNetwork, selectedWallet }}/>
      </div>
    </ThemeProvider>
  )
}

export default Layout
