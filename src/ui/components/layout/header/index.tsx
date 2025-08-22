import React, { useState, useEffect } from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { ArrowIcon, Button, BurgerMenuIcon, Text } from 'dash-ui/react'
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
    containerClasses: 'w-[120%] -mr-[55%]'
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
}

export default function Header ({ onWalletChange, onNetworkChange, currentNetwork, currentIdentity, currentWalletId }: HeaderProps): React.JSX.Element {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [allWallets, setAllWallets] = useState<WalletAccountInfo[]>([])
  const [walletsLoaded, setWalletsLoaded] = useState(false)

  // Load wallets for displaying wallet name instead of identity hash
  useEffect(() => {
    const loadWallets = async (): Promise<void> => {
      try {
        const wallets = await extensionAPI.getAllWallets()
        setAllWallets(wallets)
        setWalletsLoaded(true)
      } catch (error) {
        console.warn('Failed to load wallets in header:', error)
        setWalletsLoaded(true)
      }
    }

    if (currentWalletId && !walletsLoaded) {
      void loadWallets()
    }
  }, [currentWalletId, walletsLoaded, extensionAPI])

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
    if (!currentWalletId || !walletsLoaded) return 'Loading...'

    const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)
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

          {config.showWalletSelector && <WalletSelector onSelect={onWalletChange} currentNetwork={currentNetwork} />}
        </div>
      )}

      {/* Network & Wallet Selectors in left side */}
      {config.hideLeftSection && (config.showNetworkSelector || config.showWalletSelector) && (
        <div className='flex items-center gap-2.5'>
          {config.showNetworkSelector && <NetworkSelector onSelect={onNetworkChange} />}
          {config.showWalletSelector && <WalletSelector onSelect={onWalletChange} currentNetwork={currentNetwork} />}
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
        <div className='flex justify-between items-center gap-2.5 w-full'>
          {config.showWalletRightReadOnly && currentWalletId && (
            <Text size='sm' color='gray' weight='medium' className='text-right' dim>
              {getWalletDisplayName()}
            </Text>
          )}

          {config.showNetworkRightReadOnly && (
            <Text size='sm' color='gray' weight='medium' dim>
              {(currentNetwork ?? '')
                .toString()
                .replace(/^(.)/, (m) => m.toUpperCase())}
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
