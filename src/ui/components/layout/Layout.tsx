import React, { FC } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from 'dash-ui/react'

const Layout: FC = () => {
  return (
    <ThemeProvider initialTheme='light'>
      <div className='main_container p-[0.875rem]'>
        <Header />
        <Outlet />
      </div>
    </ThemeProvider>
  )
}

export default Layout
