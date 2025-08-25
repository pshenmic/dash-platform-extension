import React, { useState, useEffect } from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { ArrowIcon, Button, BurgerMenuIcon, Text, WebIcon } from 'dash-ui/react'
import { NetworkSelector } from '../../controls/NetworkSelector'
import { WalletSelector } from '../../controls/WalletSelector'
import { SettingsMenu } from '../../settings/SettingsMenu'
import { WalletAccountInfo } from '../../../../types/messages/response/GetAllWalletsResponse'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    imgClasses: 'max-w -mt-[22%]',
    containerClasses: 'w-[120%] -mr-[55%]'
  }
} as const

type ImageVariant = keyof typeof IMAGE_VARIANTS

// Predefined header variants with semantic names
interface HeaderVariantConfig {
  showLogo?: boolean
  hideLeftSection?: boolean
  showNetworkSelector?: boolean
  showWalletSelector?: boolean
  showBurgerMenu?: boolean
  showNetworkRightReadOnly?: boolean
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
    imageClasses: '!w-[109%] -mt-[67%] right-[7%]'
  },

  // Import/setup screens with centered image
  onboarding: {
    hideLeftSection: true,
    imageType: 'coins',
    imageClasses: '-mt-[68%] !w-[426px] ml-[5%]'
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

const NetworkDisplayCard: React.FC<{ network: string }> = ({ network }) => {
  return (
    <div className="backdrop-blur-[15px] bg-[rgba(12,28,51,0.15)] border border-[rgba(255,255,255,0.15)] rounded-[15px] px-4 py-[15px] flex items-center justify-center gap-1 h-12">
      <div className="w-4 h-4 flex items-center justify-center">
        <WebIcon size={16} className="text-white" />
      </div>
      <Text size="sm" weight="medium" className="text-white">
        {network.charAt(0).toUpperCase() + network.slice(1)}
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

interface HeaderProps {
  onWalletChange?: (walletId: string | null) => void
  onNetworkChange?: (network: string) => void
  currentNetwork?: string | null
  currentIdentity?: string | null
  currentWalletId?: string | null
  wallets?: WalletAccountInfo[]
}

export default function Header ({ onWalletChange, onNetworkChange, currentNetwork, currentIdentity, currentWalletId, wallets = [] }: HeaderProps): React.JSX.Element {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const deepestRoute = [...matches].reverse().find((m): boolean =>
    m.handle?.headerProps != null
  )

  const headerProps = deepestRoute?.handle?.headerProps

  // Get configuration from variant
  const variant = headerProps?.variant ? HEADER_VARIANTS[headerProps.variant] : {}
  const config = {
    showLogo: variant.showLogo ?? false,
    hideLeftSection: variant.hideLeftSection ?? false,
    showNetworkSelector: variant.showNetworkSelector ?? false,
    showWalletSelector: variant.showWalletSelector ?? false,
    showBurgerMenu: variant.showBurgerMenu ?? false,
    showNetworkRightReadOnly: variant.showNetworkRightReadOnly ?? false,
    showWalletRightReadOnly: variant.showWalletRightReadOnly ?? false,
    networkDisplayFormat: variant.networkDisplayFormat ?? 'text',
    imageType: variant.imageType,
    imageClasses: variant.imageClasses,
    containerClasses: variant.containerClasses
  }

  const handleBack = (): void => {
    void navigate(-1)
  }

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = (): void => {
    setIsMenuOpen(false)
  }

  // Get wallet display name (same logic as WalletSelector)
  const getWalletDisplayName = (): string => {
    if (!currentWalletId) return 'Wallet'

    const availableWallets = wallets.filter(wallet => wallet.network === currentNetwork)
    const currentWallet = availableWallets.find(wallet => wallet.walletId === currentWalletId)

    if (currentWallet == null) return 'Wallet'

    const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWalletId)
    return currentWallet.label ?? `Wallet_${currentWalletIndex + 1}`
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

          {config.showWalletSelector && <WalletSelector onSelect={onWalletChange} currentNetwork={currentNetwork} wallets={wallets} currentWalletId={currentWalletId} />}
        </div>
      )}

      {/* Network & Wallet Selectors in left side */}
      {config.hideLeftSection && (config.showNetworkSelector || config.showWalletSelector) && (
        <div className='flex items-center gap-2.5'>
          {config.showNetworkSelector && <NetworkSelector onSelect={onNetworkChange} />}
          {config.showWalletSelector && <WalletSelector onSelect={onWalletChange} currentNetwork={currentNetwork} wallets={wallets} currentWalletId={currentWalletId} />}
        </div>
      )}

      {/* Right side: either image, burger, or read-only network name */}
      {config.showBurgerMenu && (
        <Button
          onClick={toggleMenu}
          colorScheme='brand'
          size='xl'
          className='w-12 h-12 p-0'
        >
          <BurgerMenuIcon color='white' />
        </Button>
      )}

      {/* Right side read-only displays */}
      {(config.showWalletRightReadOnly || config.showNetworkRightReadOnly) && (
        <div className={`flex items-center gap-2.5 ${config.imageType != null ? 'absolute top-0 right-0 z-10' : 'w-full justify-between'}`}>
          {config.showWalletRightReadOnly && currentWalletId && (
            <Text size='sm' color='gray' weight='medium' className='text-right' dim>
              {getWalletDisplayName()}
            </Text>
          )}

          {config.showNetworkRightReadOnly && currentNetwork && (
            config.networkDisplayFormat === 'card' 
              ? <NetworkDisplayCard network={currentNetwork} />
              : <Text size='sm' color='gray' weight='medium' dim>
                  {currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
                </Text>
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
        onClose={closeMenu}
        currentIdentity={currentIdentity}
      />
    </header>
  )
}
