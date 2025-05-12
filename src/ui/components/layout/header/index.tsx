import React, { FC } from 'react'
import { cva } from 'class-variance-authority'
import { useNavigate, useMatches } from 'react-router-dom'
import { useStaticAsset } from '../../../../hooks/useStaticAsset'

const IMAGE_VARIANTS = {
  coins: {
    src: 'coin_bagel.png',
    alt: 'Badge',
    positionClasses: '-top-18 -right-36'
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

export interface HeaderProps {
  right?: RightProps
}

const headerStyles = cva(
  'flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200'
)

const backButtonStyles = cva(
  'p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-gray-100'
)

export default function Header ({ right }) {
  const matches = useMatches();

  const navigate = useNavigate()

  const handleBack = () => {
    if (right?.variant === 'back') {
      right.onClick
        ? right.onClick()
        : navigate(-1)
    }
  }

  return (
    <header className={headerStyles()}>
      <div>
        <img
          src={useStaticAsset('dash_logo.png')}
          alt={'Platform Explorer'}
          className={'h-10 w-auto object-contain'}
        />
      </div>

      {right && (
        <div>
          {right.variant === 'image'
            ? (() => {
              const { src, alt, positionClasses } =
                IMAGE_VARIANTS[right.imageType]
              return (
                <img
                  src={useStaticAsset(src)}
                  alt={alt}
                  className={`fixed ${positionClasses}`}
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
