import React from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { ArrowIcon, Button } from 'dash-ui/react'

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
    }
    [key: string]: any
  }
  params: Record<string, string>
}

const headerStyles = cva(
  'relative flex justify-between items-center',
  {
    variants: {
      rightType: {
        image: '',
        none: ''
      }
    },
    defaultVariants: {
      rightType: 'none'
    }
  }
)

export default function Header (): React.JSX.Element {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()

  const deepestRoute = [...matches].reverse().find((m): boolean => 
    m.handle?.headerProps != null
  )
  
  const headerProps = deepestRoute?.handle?.headerProps
  const showLogo = headerProps?.showLogo ?? false
  const imageType = headerProps?.imageType as ImageVariant | undefined

  const handleBack = (): void => {
    navigate(-1)
  }

  return (
    <header className={headerStyles({
      rightType: imageType ? 'image' : 'none'
    })}
    >
      <div>
        {showLogo ? (
          <img
            src={useStaticAsset('dash_logo.svg')}
            alt='Platform Explorer'
            className='w-[2.25rem] h-[1.75rem] object-contain'
          />
        ) : (
          <Button onClick={handleBack} colorScheme='lightGray'>
            <ArrowIcon color='var(--color-dash-primary-dark-blue)' />
          </Button>
        )}
      </div>

      {imageType && ((): React.JSX.Element => {
        const defaultVariant = IMAGE_VARIANTS[imageType]
        const containerClasses = headerProps?.containerClasses ?? defaultVariant.containerClasses
        const imgClasses = headerProps?.imgClasses ?? defaultVariant.imgClasses

        return (
          <div className={containerClasses}>
            <img
              src={useStaticAsset(defaultVariant.src)}
              alt={defaultVariant.alt}
              className={`relative ${imgClasses} max-w-[348px] max-h-[327px]`}
            />
          </div>
        )
      })()}
    </header>
  )
}
