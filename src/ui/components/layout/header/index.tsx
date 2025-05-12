import React from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../../hooks/useStaticAsset'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    positionClasses: 'max-w -mt-[22%]'
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
  'relative flex items-start justify-between'
)

const backButtonStyles = cva(
  'p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-gray-100'
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
    <header className={headerStyles()}>
      <div>
        <img
          src={useStaticAsset('dash_logo.svg')}
          alt={'Platform Explorer'}
          className={'w-[2.25rem] h-[1.75rem] object-contain'}
        />
      </div>

      {right && (
        <div className={'w-[120%] -mr-[55%]'}>
          {right.variant === 'image'
            ? (() => {
              const { src, alt, positionClasses } = IMAGE_VARIANTS[right.imageType]
              return (
                <img
                  src={useStaticAsset(src)}
                  alt={alt}
                  className={`relative ${positionClasses} max-w-[348px] max-h-[327px]`}
                />
              )
            })()
            : <button
              onClick={handleBack}
              className={backButtonStyles()}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
            </button>
          }
        </div>
      )}
    </header>
  )
}
