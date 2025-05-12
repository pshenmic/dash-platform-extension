import React, { FC } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './header'

const Layout: FC = () => {
  return (
    <>
      <Header right={'back'}/>
      <Outlet/>
    </>
  )
}

export default Layout
