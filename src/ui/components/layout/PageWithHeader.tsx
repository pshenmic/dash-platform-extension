import React, { FC, ReactNode } from 'react'
import { DashboardGridBackground } from './DashboardGridBackground'
import Header from './header'

interface PageWithHeaderProps {
  children: ReactNode
  showGrid?: boolean
}

const PageWithHeader: FC<PageWithHeaderProps> = ({ children, showGrid = false }) => {
  if (!showGrid) {
    return (
      <>
        <Header />
        {children}
      </>
    )
  }

  return (
    <>
      <DashboardGridBackground />
      <Header />
      <div className='relative z-[1] min-w-0 w-full flex flex-col'>
        {children}
      </div>
    </>
  )
}

export default PageWithHeader
