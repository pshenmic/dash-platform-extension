import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import { DashAmount, FiatChip } from './DashAmount'
import { duffsToDashParts, duffsToFiatLabel } from './amount'

interface LayerCardProps {
  title: string
  /** Null while the balance is unknown. */
  whole: string | null
  fraction: string
  fiat: string | null
  hide: boolean
  loading: boolean
  image: string
  toneClassName: string
  imageClassName: string
  contentClassName: string
  onClick: () => void
}

function LayerCard ({
  title,
  whole,
  fraction,
  fiat,
  hide,
  loading,
  image,
  toneClassName,
  imageClassName,
  contentClassName,
  onClick
}: LayerCardProps): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={`${title} layer`}
      className={`group relative flex-1 min-w-0 overflow-hidden rounded-[14px] text-left cursor-pointer border-0 p-0 ${toneClassName}`}
    >
      <img
        src={image}
        alt=''
        className={`pointer-events-none absolute max-w-none select-none transition-transform duration-300 ease-out group-hover:scale-110 ${imageClassName}`}
      />
      <div className='pointer-events-none absolute inset-0 bg-white/0 transition-colors duration-200 ease-out group-hover:bg-white/12' />
      <div className={`relative z-10 flex flex-col gap-5 ${contentClassName}`}>
        <Text size='sm' weight='medium' className='!text-white !tracking-[-0.03em] !leading-none'>
          {title}
        </Text>
        <div className='flex flex-col gap-2'>
          <Text size='xs' weight='medium' className='!text-white/50 !tracking-[-0.03em] !leading-none'>
            Balance:
          </Text>
          <div className='flex flex-col gap-2'>
            <DashAmount
              whole={whole}
              fraction={fraction}
              hide={hide}
              loading={loading}
              className='!text-white !text-base !leading-none !tracking-[-0.03em]'
              spinnerClassName='w-4 h-4 text-white'
            />
            {/* The amount already carries a spinner, so the chip only appears once it has a value. */}
            {(hide || fiat != null) && (
              <FiatChip
                label={fiat}
                hide={hide}
                className='w-fit bg-white/12 px-2 py-[5px]'
                textClassName='!text-white'
              />
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

interface LayerCardsProps {
  hide: boolean
  /** Core balance in duffs, null until it loads. */
  coreDuffs: bigint | null
  /** Identity credits converted to duffs, null until they load. */
  platformDuffs: bigint | null
  coreLoading: boolean
  platformLoading: boolean
  rate: number | null
}

export function LayerCards ({
  hide,
  coreDuffs,
  platformDuffs,
  coreLoading,
  platformLoading,
  rate
}: LayerCardsProps): React.JSX.Element {
  const navigate = useNavigate()
  const coreImage = useStaticAsset('3d-triangles-circle.png')
  const platformImage = useStaticAsset('asset-chain.png')

  const coreParts = coreDuffs != null ? duffsToDashParts(coreDuffs) : null
  const platformParts = platformDuffs != null ? duffsToDashParts(platformDuffs) : null

  return (
    <div className='flex gap-2 w-full'>
      <LayerCard
        title='Core'
        whole={coreParts?.whole ?? null}
        fraction={coreParts?.fraction ?? ''}
        fiat={coreDuffs != null ? duffsToFiatLabel(coreDuffs, rate) : null}
        hide={hide}
        loading={coreLoading}
        image={coreImage}
        toneClassName='bg-[#4C7EFF]'
        imageClassName='right-[-26%] top-[-46%] w-[170px] h-auto opacity-30'
        contentClassName='p-4 pr-8'
        onClick={() => { void navigate('/core') }}
      />
      <LayerCard
        title='Platform'
        whole={platformParts?.whole ?? null}
        fraction={platformParts?.fraction ?? ''}
        fiat={platformDuffs != null ? duffsToFiatLabel(platformDuffs, rate) : null}
        hide={hide}
        loading={platformLoading}
        image={platformImage}
        toneClassName='bg-[#0C1C33]'
        imageClassName='right-[-18%] top-[-32%] w-[115px] h-auto rotate-[-46deg]'
        contentClassName='p-4'
        onClick={() => { void navigate('/platform') }}
      />
    </div>
  )
}
