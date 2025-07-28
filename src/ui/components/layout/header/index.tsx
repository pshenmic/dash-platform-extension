import React from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../hooks/useStaticAsset'
import { Button, ArrowIcon } from 'dash-ui/react'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    imgClasses: 'max-w -mt-[22%]',
    containerClasses: 'w-[120%] -mr-[55%]'
  }
} as const

type ImageVariant = keyof typeof IMAGE_VARIANTS

interface RightImage {
  variant: 'image'
  imageType: ImageVariant
  customClasses?: {
    containerClasses?: string
    imgClasses?: string
  }
}

interface RightBack {
  variant: 'back'
  onClick?: () => void
}

type RightProps = RightImage | RightBack

interface Match {
  id: string
  pathname: string
  handle?: {
    headerProps?: {
      imageType?: string
      containerClasses?: string
      imgClasses?: string
    }
    [key: string]: any
  }
  params: Record<string, string>
}

export interface HeaderProps {
  right?: RightProps
}

const headerStyles = cva(
  'relative flex justify-between',
  {
    variants: {
      type: {
        image: 'items-start',
        button: 'items-center -mt-[0.625rem]'
      }
    },
    defaultVariants: {
      type: 'button'
    }
  }
)

export default function Header (): React.JSX.Element {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()

  const deepestRoute = [...matches].reverse().find((m): boolean => m.handle?.headerProps?.imageType != null)
  const right = (deepestRoute?.handle?.headerProps?.imageType != null)
    ? {
        variant: 'image' as const, 
        imageType: deepestRoute.handle.headerProps.imageType as ImageVariant,
        customClasses: {
          containerClasses: deepestRoute.handle.headerProps.containerClasses,
          imgClasses: deepestRoute.handle.headerProps.imgClasses
        }
      }
    : { variant: 'back' as const }

  const handleBack = (): void => {
    if (right?.variant === 'back') {
      void navigate(-1)
    }
  }

  return (
    <header className={headerStyles({
      type: right.variant === 'image' ? 'image' : 'button'
    })}
    >
      <div>
        <img
          src={useStaticAsset('dash_logo.svg')}
          alt='Platform Explorer'
          className='w-[2.25rem] h-[1.75rem] object-contain'
        />
      </div>

      {right.variant === 'image'
        ? ((): React.JSX.Element => {
            const defaultVariant = IMAGE_VARIANTS[right.imageType]
            const containerClasses = right.customClasses?.containerClasses ?? defaultVariant.containerClasses
            const imgClasses = right.customClasses?.imgClasses ?? defaultVariant.imgClasses
            
            return (
              <div className={containerClasses}>
                <img
                  src={useStaticAsset(defaultVariant.src)}
                  alt={defaultVariant.alt}
                  className={`relative ${imgClasses} max-w-[348px] max-h-[327px]`}
                />
              </div>
            )
          })()
        : (
          <Button onClick={handleBack}>
            <ArrowIcon className='mr-[0.625rem] h-[0.875rem] w-auto' />
            Back
          </Button>
          )}
    </header>
  )
}
