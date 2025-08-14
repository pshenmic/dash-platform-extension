import React, { useState } from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { ArrowIcon, Button, BurgerMenuIcon } from 'dash-ui/react'
import { NetworkSelector } from './NetworkSelector'
import { WalletSelector } from './WalletSelector'
import { SettingsMenu } from '../../settings/SettingsMenu'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    imgClasses: 'max-w -mt-[22%]',
    containerClasses: 'w-[120%] -mr-[55%]'
  }
} as const

type ImageVariant = keyof typeof IMAGE_VARIANTS

interface Match {
  id: string
  pathname: string
  handle?: {
    headerProps?: {
      imageType?: string
      containerClasses?: string
      imgClasses?: string
      showLogo?: boolean
      hideLeftSection?: boolean
      showNetworkSelector?: boolean
      showWalletSelector?: boolean
      showBurgerMenu?: boolean
    }
    [key: string]: any
  }
  params: Record<string, string>
}

const headerStyles = cva(
  'relative flex justify-between items-start',
  {
    variants: {
      rightType: {
        image: '',
        burger: 'items-center',
        none: ''
      }
    },
    defaultVariants: {
      rightType: 'none'
    }
  }
)

export default function Header ({ onWalletChange }): React.JSX.Element {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const deepestRoute = [...matches].reverse().find((m): boolean =>
    m.handle?.headerProps != null
  )

  const headerProps = deepestRoute?.handle?.headerProps
  const showLogo = headerProps?.showLogo ?? false
  const hideLeftSection = headerProps?.hideLeftSection ?? false
  const showNetworkSelector = headerProps?.showNetworkSelector ?? false
  const showWalletSelector = headerProps?.showWalletSelector ?? false
  const showBurgerMenu = headerProps?.showBurgerMenu ?? false
  const imageType = headerProps?.imageType as ImageVariant | undefined

  const handleBack = (): void => {
    void navigate(-1)
  }

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = (): void => {
    setIsMenuOpen(false)
  }

  const getRightSectionType = (): 'image' | 'burger' | 'none' => {
    if (showBurgerMenu) return 'burger'
    if (imageType != null) return 'image'
    return 'none'
  }

  return (
    <header
      className={headerStyles({
        rightType: getRightSectionType()
      })}
    >
      {!hideLeftSection && (
        <div>
          {showLogo
            ? (
              <img
                src={useStaticAsset('dash_logo.svg')}
                alt='Platform Explorer'
                className='w-[2.25rem] h-[1.75rem] object-contain'
              />
              )
            : (
              <Button onClick={handleBack} colorScheme='lightGray'>
                <ArrowIcon color='var(--color-dash-primary-dark-blue)' />
              </Button>
              )}
        </div>
      )}

      {/* Network & Wallet Selectors in left side */}
      {hideLeftSection && (showNetworkSelector || showWalletSelector) && (
        <div className='flex items-center gap-2.5'>
          {showNetworkSelector && <NetworkSelector />}
          {showWalletSelector && <WalletSelector />}
        </div>
      )}

      {/* Burger Menu in right side */}
      {showBurgerMenu && (
        <Button
          onClick={toggleMenu}
          colorScheme='brand'
          size='xl'
          className='w-12 h-12 p-0'
        >
          <BurgerMenuIcon color='white'/>
        </Button>
      )}

      {imageType != null && ((): React.JSX.Element => {
        const defaultVariant = IMAGE_VARIANTS[imageType]
        const containerClasses = headerProps?.containerClasses ?? defaultVariant.containerClasses
        const imgClasses = headerProps?.imgClasses ?? defaultVariant.imgClasses

        return (
          <div className={containerClasses}>
            <img
              src={useStaticAsset(defaultVariant.src)}
              alt={defaultVariant.alt}
              className={`relative w-[348px] h-auto max-w-none ${imgClasses}`}
            />
          </div>
        )
      })()}

      <SettingsMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
      />
    </header>
  )
}
