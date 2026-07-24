import React from 'react'
import { Identifier, CopyButton } from 'dash-ui-kit/react'

interface ShieldedAddressItemProps {
  address: string
}

// Shielded addresses are note-based: there is no per-address balance, so the
// row only shows the address and a copy button.
export const ShieldedAddressItem: React.FC<ShieldedAddressItemProps> = ({ address }) => {
  return (
    <div className='rounded-[15px] p-3 flex flex-row items-center gap-2 bg-[rgba(12,28,51,0.03)]'>
      <Identifier highlight='both' linesAdjustment={false}>
        {address}
      </Identifier>

      <CopyButton text={address} className='shrink-0' />
    </div>
  )
}
