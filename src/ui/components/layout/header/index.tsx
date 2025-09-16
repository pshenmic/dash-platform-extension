import React, { useState } from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches, useOutletContext } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { ArrowIcon, Button, BurgerMenuIcon, Text, WebIcon } from 'dash-ui-kit/react'
import { NetworkSelector } from '../../controls/NetworkSelector'
import { WalletSelector } from '../../controls/WalletSelector'
import { SettingsMenu } from '../../settings'
import type { LayoutContext } from '../Layout'
import type { NetworkType } from '../../../../types'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    imgClasses: 'max-w -mt-[22%]',
    containerClasses: 'w-[100%] -mr-[55%]'
  }
} as const

type ImageVariant = keyof typeof IMAGE_VARIANTS

interface HeaderVariantConfig {
  showLogo?: boolean
  hideLeftSection?: boolean
  showNetworkSelector?: boolean
  showWalletSelector?: boolean
  showBurgerMenu?: boolean
  showNetworkRightReadOnly?: boolean
  showNetworkRightSelector?: boolean
  showWalletRightReadOnly?: boolean
  networkDisplayFormat?: 'text' | 'card'
  imageType?: ImageVariant
  imageClasses?: string
  containerClasses?: string
}

const HEADER_VARIANTS: Record<string, HeaderVariantConfig> = {
  // Landing/auth screens with decorative image
  landing: {
    hideLeftSection: true,
    imageType: 'coins',
    imageClasses: '!w-[110%] -mt-[67%] right-[7%]'
  },

  // Import/setup screens with centered image
  onboarding: {
    hideLeftSection: false,
    imageType: 'coins',
    imageClasses: '-mt-[65%] !w-[426px] -ml-[15%]'
  },

  // Choose wallet type with network selector in top-right
  chooseWalletType: {
    hideLeftSection: false,
    imageType: 'coins',
    imageClasses: '-mt-[62%] !w-[426px] -ml-[15%]',
    showNetworkRightSelector: true,
    networkDisplayFormat: 'card'
  },

  // Seed phrase import with specific positioning
  seedImport: {
    imageType: 'coins',
    imageClasses: '-mt-[52%]',
    containerClasses: 'w-[120%] -mr-[55%]',
    showNetworkRightReadOnly: true,
    networkDisplayFormat: 'card'
  },

  // Main app screen with full controls
  main: {
    hideLeftSection: true,
    showNetworkSelector: true,
    showWalletSelector: true,
    showBurgerMenu: true
  },

  // Transaction approval with read-only displays, no back button
  transaction: {
    hideLeftSection: true,
    showWalletRightReadOnly: true,
    showNetworkRightReadOnly: true
  },

  // Simple back navigation only
  simple: {},

  // Minimal header with just logo
  minimal: {
    hideLeftSection: true,
    showLogo: true
  }
}

type HeaderVariant = keyof typeof HEADER_VARIANTS

const NetworkCard: React.FC<{ network: string }> = ({ network }) => {
  return (
    <div className='backdrop-blur-[15px] bg-[rgba(12,28,51,0.15)] border border-[rgba(255,255,255,0.15)] rounded-[15px] px-4 py-[15px] flex items-center justify-center gap-1 h-12'>
      <div className='w-4 h-4 flex items-center justify-center'>
        <WebIcon size={16} className='text-white' />
      </div>
      <Text size='sm' weight='medium' className='text-white capitalize'>
        {network}
      </Text>
    </div>
  )
}

interface Match {
  id: string
  pathname: string
  handle?: {
    headerProps?: {
      variant?: HeaderVariant
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

export default function Header (): React.JSX.Element {
  const context = useOutletContext<LayoutContext | null>()

  // Handle case where context might be null during initial render
  const {
    currentNetwork,
    setCurrentNetwork,
    currentWallet,
    setCurrentWallet,
    currentIdentity,
    allWallets
  } = context ?? {} as Partial<LayoutContext>
  const matches = useMatches() as Match[]
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const deepestRoute = [...matches].reverse().find((m): boolean =>
    m.handle?.headerProps != null
  )
  const headerProps = deepestRoute?.handle?.headerProps
  const variant = headerProps?.variant !== null && headerProps?.variant !== undefined ? HEADER_VARIANTS[headerProps.variant] : {}
  const config = {
    showLogo: variant.showLogo ?? false,
    hideLeftSection: variant.hideLeftSection ?? false,
    showNetworkSelector: variant.showNetworkSelector ?? false,
    showWalletSelector: variant.showWalletSelector ?? false,
    showBurgerMenu: variant.showBurgerMenu ?? false,
    showNetworkRightReadOnly: variant.showNetworkRightReadOnly ?? false,
    showNetworkRightSelector: variant.showNetworkRightSelector ?? false,
    showWalletRightReadOnly: variant.showWalletRightReadOnly ?? false,
    networkDisplayFormat: variant.networkDisplayFormat ?? 'text',
    imageType: variant.imageType,
    imageClasses: variant.imageClasses,
    containerClasses: variant.containerClasses
  }

  const handleBack = (): void => {
    void navigate(-1)
  }

  const getWalletDisplayName = (): string => {
    if (currentWallet === null || !allWallets?.length) return 'Wallet'

    const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)
    const currentWalletData = availableWallets.find(wallet => wallet.walletId === currentWallet)

    if (currentWalletData == null) return 'Wallet'

    const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWallet)
    return currentWalletData.label ?? `Wallet_${currentWalletIndex + 1}`
  }

  const getRightSectionType = (): 'image' | 'burger' | 'none' => {
    if (config.showBurgerMenu) return 'burger'
    if (config.imageType != null) return 'image'
    return 'none'
  }

  return (
    <header
      className={headerStyles({
        rightType: getRightSectionType()
      })}
    >
      {!config.hideLeftSection && (
        <div className='flex items-center gap-2.5'>
          {config.showLogo
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

          {config.showWalletSelector && <WalletSelector onSelect={setCurrentWallet} currentNetwork={currentNetwork} wallets={allWallets} currentWalletId={currentWallet} />}
        </div>
      )}

      {/* Network & Wallet Selectors in left side */}
      {config.hideLeftSection && (config.showNetworkSelector || config.showWalletSelector) && (
        <div className='flex items-center gap-2.5'>
          {config.showNetworkSelector && <NetworkSelector onSelect={setCurrentNetwork} currentNetwork={currentNetwork as NetworkType} wallets={allWallets} />}
          {config.showWalletSelector && <WalletSelector onSelect={setCurrentWallet} currentNetwork={currentNetwork} wallets={allWallets} currentWalletId={currentWallet} />}
        </div>
      )}

      {/* Right side: either image, burger, or read-only network name */}
      {config.showBurgerMenu && (
        <Button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          colorScheme='brand'
          size='xl'
          className='w-12 h-12 p-0'
        >
          <BurgerMenuIcon color='white' />
        </Button>
      )}

      {/* Right side read-only displays and selectors */}
      {(config.showWalletRightReadOnly || config.showNetworkRightReadOnly || config.showNetworkRightSelector) && (
        <div className={`flex items-center gap-2.5 ${config.imageType != null ? 'absolute top-0 right-0 z-10' : 'w-full justify-between'}`}>
          {config.showWalletRightReadOnly && currentWallet !== null && (
            <Text size='sm' color='gray' weight='medium' className='text-right' dim>
              {getWalletDisplayName()}
            </Text>
          )}

          {config.showNetworkRightReadOnly && currentNetwork !== null && (
            config.networkDisplayFormat === 'card'
              ? <NetworkCard network={currentNetwork ?? ''} />
              : (
                <Text className='capitalize' size='sm' color='gray' weight='medium' dim>
                  {currentNetwork}
                </Text>
                )
          )}

          {config.showNetworkRightSelector && (
            config.networkDisplayFormat === 'card'
              ? <NetworkSelector
                  onSelect={setCurrentNetwork}
                  wallets={allWallets}
                  variant='card'
                  border
                  className='!backdrop-blur-[15px] !bg-[rgba(12,28,51,0.15)] text-white !outline-white/15'
                />
              : <NetworkSelector onSelect={setCurrentNetwork} wallets={allWallets} />
          )}
        </div>
      )}

      {config.imageType != null && ((): React.JSX.Element => {
        const defaultVariant = IMAGE_VARIANTS[config.imageType]
        const containerClasses = config.containerClasses ?? defaultVariant.containerClasses
        const imgClasses = config.imageClasses ?? defaultVariant.imgClasses

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
        onClose={() => setIsMenuOpen(false)}
        currentIdentity={currentIdentity}
        currentNetwork={currentNetwork}
        currentWallet={allWallets?.find(wallet => wallet.walletId === currentWallet) ?? null}
      />
    </header>
  )
}
