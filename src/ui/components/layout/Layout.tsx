import React, { FC } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'

const Layout: FC = () => {
  return (
    <div className={'p-10'}>
      <Header/>
      <Outlet/>
    </div>
  )
}

export default Layout
