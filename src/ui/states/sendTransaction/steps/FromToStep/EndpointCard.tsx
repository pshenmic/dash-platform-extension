import React, { useId } from 'react'
import { ChevronIcon, Text } from 'dash-ui-kit/react'

// Bulge outline from its right edge to the left one, shared by the fill and the stroke.
const BULGE_CURVE = 'C121.895 0.5 110.303 3.852 100.296 10.169C79.873 23.062 53.855 23.062 33.432 10.169C23.425 3.852 11.833 0.5 0 0.5'

interface EndpointCardProps {
  label: string
  position: 'top' | 'bottom'
  headerAction?: React.ReactNode
  children: React.ReactNode
}

// White section of the From / To card with a label row; the top one has a bulge with arrows at the bottom center.
export function EndpointCard ({ label, position, headerAction, children }: EndpointCardProps): React.JSX.Element {
  const isTop = position === 'top'
  const strokeGradientId = useId()

  return (
    <div className={`relative drop-shadow-[0_0_16px_rgba(12,28,51,0.08)] ${isTop ? 'z-10' : ''}`}>
      <div className={`relative flex flex-col gap-3 px-3 py-4 bg-white dark:bg-gray-900 ${isTop ? 'dash-gradient-border rounded-t-3xl rounded-b-xl' : 'rounded-t-xl rounded-b-3xl'}`}>
        <div className='flex items-center justify-between gap-2'>
          <Text size='sm' weight='medium' dim>{label}</Text>
          {headerAction}
        </div>
        {children}
      </div>

      {isTop && (
        <>
          <svg
            className='absolute left-1/2 top-full -translate-x-1/2 -mt-px'
            width='133.728'
            height='21'
            viewBox='0 0 133.728 21'
            fill='none'
            aria-hidden='true'
          >
            <path d={`M0 0H133.728V0.5${BULGE_CURVE}Z`} className='fill-white dark:fill-gray-900' />
            <g className='text-dash-primary-dark-blue dark:text-white'>
              <defs>
                <linearGradient id={strokeGradientId} x1='0' y1='0.5' x2='0' y2='20' gradientUnits='userSpaceOnUse'>
                  <stop stopColor='currentColor' stopOpacity='0.04' />
                  <stop offset='1' stopColor='currentColor' stopOpacity='0.06' />
                </linearGradient>
              </defs>
              <path d={`M133.728 0.5${BULGE_CURVE}`} stroke={`url(#${strokeGradientId})`} />
            </g>
          </svg>
          <div className='absolute left-1/2 top-full -translate-x-1/2 -mt-[5px] flex flex-col items-center gap-1 text-dash-primary-dark-blue/24 dark:text-white/24'>
            <ChevronIcon className='w-[10.6px] h-1.5' />
            <ChevronIcon className='w-[10.6px] h-1.5' />
          </div>
        </>
      )}
    </div>
  )
}
