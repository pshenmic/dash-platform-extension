import React, { FC, ReactNode } from 'react'
import Header from './header'

interface PageWithHeaderProps {
  children: ReactNode
}

const PageWithHeader: FC<PageWithHeaderProps> = ({ children }) => {
  return (
    <>
      <Header />
      {children}
    </>
  )
}

export default PageWithHeader
