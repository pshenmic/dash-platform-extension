import React from 'react'
import { ChevronIcon, Identifier, OverlayMenu, Text } from 'dash-ui-kit/react'

interface ChangeAddressSelectProps {
  addresses: string[]
  value: string | null
  onChange: (address: string) => void
  error: string | null
}

const AddressRow = ({ address }: { address: string }): React.JSX.Element => (
  <Identifier highlight='both' ellipsis className='min-w-0 flex-1 !text-sm !font-light'>{address}</Identifier>
)

// Dropdown of the wallet Core addresses that receive the change of an Advanced Core transfer.
export function ChangeAddressSelect ({ addresses, value, onChange, error }: ChangeAddressSelectProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1.5'>
      <OverlayMenu
        triggerContent={(
          <div className='flex items-center justify-between gap-2 min-w-0 w-full'>
            {value != null && value !== ''
              ? <AddressRow address={value} />
              : <Text size='sm' dim>Select change address</Text>}
            <ChevronIcon size={14} color='currentColor' className='shrink-0 text-dash-primary-dark-blue/48 dark:text-white/48' />
          </div>
        )}
        items={addresses.map(address => ({
          id: address,
          content: <AddressRow address={address} />,
          onClick: () => { onChange(address) },
          className: '[&>*]:w-full'
        }))}
        size='md'
        border={false}
        showArrow={false}
        className='!w-full'
        contentClassName='!w-full'
        triggerClassName={`!px-4 !py-3 !rounded-2xl !bg-dash-primary-dark-blue/[0.03] dark:!bg-white/5 [&>div]:min-w-0 ${error != null ? 'border border-red-500' : ''}`}
      />
      {error != null && <Text size='xs' className='!text-red-500'>{error}</Text>}
    </div>
  )
}
