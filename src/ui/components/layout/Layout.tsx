import React, { FC } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'
import { ThemeProvider } from '../../contexts/ThemeContext'

const Layout: FC = () => {
  return (
    <ThemeProvider initialTheme='light'>
      <div className='p-10'>
        <Header />
        <Outlet />
      </div>
    </ThemeProvider>
  )
}

export default Layout
