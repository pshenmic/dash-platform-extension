import React, { useState } from 'react'
import { LockIcon, Text } from 'dash-ui-kit/react'
import { getFaviconUrl } from '../../../utils'
import { useStaticAsset } from '../../hooks'

interface AppConnectHeroProps {
  url: string
  title: string
  description?: React.ReactNode
}

const parseUrl = (url: string): { host: string, secure: boolean } => {
  try {
    const parsed = new URL(url)
    return { host: parsed.host, secure: parsed.protocol === 'https:' }
  } catch {
    return { host: url, secure: false }
  }
}

// 3D chain, title and a host chip with the site favicon at the top of the connect screen.
export function AppConnectHero ({ url, title, description }: AppConnectHeroProps): React.JSX.Element {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const { host, secure } = parseUrl(url)
  const chainImage = useStaticAsset('asset-chain.png')

  return (
    <div className='flex flex-col items-center gap-3 text-center'>
      <div className='relative w-[4.5rem] h-[5.375rem]'>
        <img src={chainImage} alt='' className='absolute inset-0 size-full object-contain pointer-events-none select-none -rotate-25' />
      </div>

      <div className='flex flex-col items-center gap-2'>
        <Text className='text-dash-primary-dark-blue !text-[1.75rem] !font-medium !leading-[1.2] tracking-[-0.03em]'>
          {title}
        </Text>
        <div className='inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-full bg-dash-primary-dark-blue/5'>
          {!faviconFailed && (
            <img src={getFaviconUrl(url, 32)} alt='' className='size-4 shrink-0 rounded-sm' onError={() => setFaviconFailed(true)} />
          )}
          <Text size='sm' weight='medium' className='truncate'>{host}</Text>
          {secure && <LockIcon size={12} className='shrink-0 text-dash-brand' />}
        </div>
      </div>

      {description != null && (
        <Text size='xs' weight='medium' dim className='max-w-[18rem]'>
          {description}
        </Text>
      )}
    </div>
  )
}
