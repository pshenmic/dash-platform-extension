import React, { useState } from 'react'
import { Text, Identifier, BigNumber, NotActive, ExternalLinkIcon, CopyIcon, Tooltip } from 'dash-ui-kit/react'

const ICON_CLASS = 'flex items-center justify-center p-[3px] bg-[rgba(12,28,51,0.05)] rounded-[5px] shrink-0 hover:bg-[rgba(12,28,51,0.1)] transition-colors cursor-pointer'
const ICON_COLOR = 'text-[rgba(12,28,51,0.5)]'

interface AddressCardProps {
  address: string
  explorerUrl?: string | null
  children?: React.ReactNode
}

export const AddressCard: React.FC<AddressCardProps> = ({ address, explorerUrl, children }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    navigator.clipboard.writeText(address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className='rounded-[15px] p-3 flex flex-col gap-2 bg-[rgba(12,28,51,0.03)]'>
      {/* Top: full-width address */}
      <div className='flex items-center gap-2 min-w-0'>
        <Identifier highlight='both' linesAdjustment={false}>
          {address}
        </Identifier>

        <Tooltip
          content='Copied!'
          side='top'
          sideOffset={4}
          open={copied}
          onOpenChange={(open) => { if (!open) setCopied(false) }}
        >
          <button
            onClick={handleCopy}
            className={ICON_CLASS}
            aria-label='Copy address'
          >
            <span className='w-[14px] h-[14px] flex items-center justify-center overflow-hidden'>
              <CopyIcon size={14} className={ICON_COLOR} />
            </span>
          </button>
        </Tooltip>

        {explorerUrl != null && explorerUrl !== '' && (
          <a
            href={explorerUrl}
            target='_blank'
            rel='noreferrer'
            className={ICON_CLASS}
            aria-label='View in explorer'
          >
            <ExternalLinkIcon size={14} className={ICON_COLOR} />
          </a>
        )}
      </div>

      {children}
    </div>
  )
}

interface AddressCardBalanceProps {
  balance: string | null
  loading?: boolean
}

// Credits amount shown on the right-hand side of an address row.
export const AddressCardBalance: React.FC<AddressCardBalanceProps> = ({ balance, loading = false }) => (
  <div className='flex items-end gap-0.5 shrink-0'>
    {loading
      ? <Text size='sm' dim>...</Text>
      : balance != null
        ? (
          <>
            <Text size='sm' weight='medium' monospace className='text-dash-primary-dark-blue'>
              <BigNumber className='!text-[0.75rem] gap-1'>
                {balance}
              </BigNumber>
            </Text>
            <Text className='!text-[0.7rem]' dim>Credits</Text>
          </>
          )
        : <NotActive>n/a</NotActive>}
  </div>
)
