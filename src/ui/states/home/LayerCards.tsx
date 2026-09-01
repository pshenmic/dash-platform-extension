import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { useStaticAsset } from '../../hooks'
import { DashAmount, FiatChip } from './DashAmount'
import { DASHBOARD_MOCK } from './mock'

interface LayerCardProps {
  title: string
  whole: string
  fraction: string
  fiat: string
  hide: boolean
  image: string
  toneClassName: string
  imageClassName: string
  contentClassName: string
}

function LayerCard ({
  title,
  whole,
  fraction,
  fiat,
  hide,
  image,
  toneClassName,
  imageClassName,
  contentClassName
}: LayerCardProps): React.JSX.Element {
  return (
    <div className={`relative flex-1 min-w-0 overflow-hidden rounded-[14px] ${toneClassName}`}>
      <img
        src={image}
        alt=''
        className={`pointer-events-none absolute max-w-none select-none ${imageClassName}`}
      />
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
              className='!text-white !text-base !leading-none !tracking-[-0.03em]'
            />
            <FiatChip
              label={fiat}
              hide={hide}
              className='w-fit bg-white/12 px-2 py-[5px]'
              textClassName='!text-white'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface LayerCardsProps {
  hide: boolean
}

export function LayerCards ({ hide }: LayerCardsProps): React.JSX.Element {
  const coreImage = useStaticAsset('3d-triangles-circle.png')
  const platformImage = useStaticAsset('asset-chain.png')

  return (
    <div className='flex gap-2 w-full'>
      <LayerCard
        title='Core'
        whole={DASHBOARD_MOCK.coreDashWhole}
        fraction={DASHBOARD_MOCK.coreDashFraction}
        fiat={DASHBOARD_MOCK.coreFiat}
        hide={hide}
        image={coreImage}
        toneClassName='bg-[#4C7EFF]'
        imageClassName='right-[-26%] top-[-46%] w-[170px] h-auto opacity-30'
        contentClassName='p-4 pr-8'
      />
      <LayerCard
        title='Platform'
        whole={DASHBOARD_MOCK.platformDashWhole}
        fraction={DASHBOARD_MOCK.platformDashFraction}
        fiat={DASHBOARD_MOCK.platformFiat}
        hide={hide}
        image={platformImage}
        toneClassName='bg-[#0C1C33]'
        imageClassName='right-[-18%] top-[-32%] w-[115px] h-auto rotate-[-46deg]'
        contentClassName='p-4'
      />
    </div>
  )
}
