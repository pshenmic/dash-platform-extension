import React from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../../hooks/useStaticAsset'
import { Button } from 'dash-ui/react'
import { ArrowIcon } from '../../icons'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    imgClasses: 'max-w -mt-[22%]',
    containerClasses: 'w-[120%] -mr-[55%]'
  },
} as const

type ImageVariant = keyof typeof IMAGE_VARIANTS

type RightImage = {
  variant: 'image'
  imageType: ImageVariant
}

type RightBack = {
  variant: 'back'
  onClick?: () => void
}

type RightProps = RightImage | RightBack

type Match = {
  id: string
  pathname: string
  handle?: {
    imageType?: string
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
  },
)

export default function Header () {
  const matches = useMatches() as Match[]
  const navigate = useNavigate()

  const deepestRoute = [...matches].reverse().find(m => m.handle?.imageType)
  const right = deepestRoute?.handle?.imageType
    ? { variant: 'image', imageType: deepestRoute?.handle?.imageType}
    : { variant: 'back' }

  console.log('Все совпадения:', matches)
  console.log('Найденный handle.imageType:', deepestRoute?.handle?.imageType)


  const handleBack = () => {
    right?.variant === 'back'
      ? navigate(-1)
      : null
  }

  return (
    <header className={headerStyles({
      type: right.variant === 'image' ? 'image' : 'button'
    })}>
      <div>
        <img
          src={useStaticAsset('dash_logo.svg')}
          alt={'Platform Explorer'}
          className={'w-[2.25rem] h-[1.75rem] object-contain'}
        />
      </div>

      {right && (
        right.variant === 'image'
          ? (() => {
            const { src, alt, imgClasses, containerClasses } = IMAGE_VARIANTS[right.imageType]
            return (
              <div className={containerClasses}>
                <img
                  src={useStaticAsset(src)}
                  alt={alt}
                  className={`relative ${imgClasses} max-w-[348px] max-h-[327px]`}
              />
              </div>
            )
          })()
          : <Button onClick={handleBack}>
            <ArrowIcon className={'mr-[0.625rem] h-[0.875rem] w-auto'}/>
            Back
          </Button>
      )}
    </header>
  )
}
