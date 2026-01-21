import React from 'react'
import { Button, DocumentIcon, CopyIcon, ExternalLinkIcon, ValueCard, Text, Identifier } from 'dash-ui-kit/react'
import { PLATFORM_EXPLORER_URLS } from '../../../constants'
import { copyToClipboard } from '../../../utils'
import type { NetworkType } from '../../../types'

interface TransactionHashBlockProps {
  hash: string
  network: NetworkType
  showHeader?: boolean
  showExplorerLink?: boolean
}

export default function TransactionHashBlock ({
  hash,
  network,
  showHeader = true,
  showExplorerLink = true
}: TransactionHashBlockProps): React.JSX.Element {
  const openExplorer = (): void => {
    const explorerUrl = PLATFORM_EXPLORER_URLS[network].explorer
    const url = `${explorerUrl}/transaction/${hash}`
    window.open(url, '_blank')
  }

  return (
    <ValueCard colorScheme='white' border={false} size='xl' className='dash-shadow-lg flex-col gap-4 items-start'>
      {showHeader && (
        <div className='flex items-center gap-2'>
          <div className='flex items-center justify-center h-[1.875rem] w-[1.875rem] rounded-full bg-dash-primary-dark-blue/[0.03]'>
            <DocumentIcon size={16} className='!text-dash-brand' />
          </div>
          <Text size='sm'>Hash</Text>
        </div>
      )}
      <div className='flex justify-between gap-2'>
        <Identifier
          highlight='both'
          linesAdjustment
          className='font-medium flex-grow'
        >
          {hash}
        </Identifier>
        {/* Buttons */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          {showExplorerLink && (
            <Button
              colorScheme='lightGray'
              size='sm'
              className='!min-h-0 !p-1 w-[1.25rem] h-[1.25rem] rounded-[0.25rem]'
              onClick={openExplorer}
            >
              <ExternalLinkIcon size={14} className='!text-dash-primary-dark-blue/70 flex-shrink-0' />
            </Button>
          )}
          <Button
            colorScheme='lightGray'
            size='sm'
            className='!min-h-0 !p-1 w-[1.25rem] h-[1.25rem] rounded-[0.25rem]'
            onClick={() => { copyToClipboard(hash) }}
          >
            <CopyIcon size={14} className='!text-dash-primary-dark-blue/70 flex-shrink-0 -mr-1' />
          </Button>
        </div>
      </div>
    </ValueCard>
  )
}
