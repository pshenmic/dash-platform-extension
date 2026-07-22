import React, { useState } from 'react'
import { Identifier, CopyIcon, Tooltip } from 'dash-ui-kit/react'

interface ShieldedAddressItemProps {
  address: string
}

const ICON_CLASS = 'flex items-center justify-center p-[3px] bg-[rgba(12,28,51,0.05)] rounded-[5px] shrink-0 hover:bg-[rgba(12,28,51,0.1)] transition-colors cursor-pointer'
const ICON_COLOR = 'text-[rgba(12,28,51,0.5)]'

// Shielded addresses are note-based: there is no per-address balance, so the
// row only shows the address and a copy button.
export const ShieldedAddressItem: React.FC<ShieldedAddressItemProps> = ({ address }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    navigator.clipboard.writeText(address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className='rounded-[15px] p-3 flex flex-row items-center gap-2 bg-[rgba(12,28,51,0.03)]'>
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
    </div>
  )
}
