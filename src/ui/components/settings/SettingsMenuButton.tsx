import React, { useState } from 'react'
import { Button } from 'dash-ui/react'
import { SettingsMenu } from './SettingsMenu'

const SettingsIcon: React.FC = () => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M12.9333 8.46667C12.8466 8.64222 12.8466 8.84445 12.9333 9.02L13.4 9.92C13.4844 10.0922 13.4844 10.2956 13.4 10.4667L12.32 12.2533C12.2356 12.4244 12.0756 12.5489 11.8867 12.6L10.84 12.8933C10.6711 12.9311 10.5289 13.0467 10.4533 13.2067L10.0133 14.0933C9.93778 14.2622 9.79111 14.3844 9.61333 14.4267L7.81333 14.8333C7.63556 14.8756 7.44778 14.8756 7.27 14.8333L5.47 14.4267C5.29222 14.3844 5.14556 14.2622 5.07 14.0933L4.63 13.2067C4.55444 13.0467 4.41222 12.9311 4.24333 12.8933L3.19667 12.6C3.00778 12.5489 2.84778 12.4244 2.76333 12.2533L1.68333 10.4667C1.59889 10.2956 1.59889 10.0922 1.68333 9.92L2.15 9.02C2.23667 8.84445 2.23667 8.64222 2.15 8.46667L1.68333 7.56667C1.59889 7.39556 1.59889 7.19222 1.68333 7.02L2.76333 5.23333C2.84778 5.06222 3.00778 4.93778 3.19667 4.88667L4.24333 4.59333C4.41222 4.55556 4.55444 4.44 4.63 4.28L5.07 3.39333C5.14556 3.22444 5.29222 3.10222 5.47 3.06L7.27 2.65333C7.44778 2.61111 7.63556 2.61111 7.81333 2.65333L9.61333 3.06C9.79111 3.10222 9.93778 3.22444 10.0133 3.39333L10.4533 4.28C10.5289 4.44 10.6711 4.55556 10.84 4.59333L11.8867 4.88667C12.0756 4.93778 12.2356 5.06222 12.32 5.23333L13.4 7.02C13.4844 7.19222 13.4844 7.39556 13.4 7.56667L12.9333 8.46667Z'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const SettingsMenuButton: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = (): void => {
    setIsMenuOpen(false)
  }

  return (
    <>
      <Button
        onClick={toggleMenu}
        colorScheme='lightGray'
        size='sm'
        className='p-2'
      >
        <SettingsIcon />
      </Button>

      <SettingsMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
      />
    </>
  )
}
