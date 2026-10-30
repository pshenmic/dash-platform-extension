import React from 'react'
import { Identifier, OverlayMenu, Text } from 'dash-ui-kit/react'

interface ChangeAddressSelectProps {
  addresses: string[]
  value: string | null
  onChange: (address: string) => void
  error: string | null
}

const AddressRow = ({ address }: { address: string }): React.JSX.Element => (
  <Identifier weight='light' highlight='both' middleEllipsis='auto' className='min-w-0 flex-1'>{address}</Identifier>
)

// Dropdown of the wallet Core addresses that receive the change of an Advanced Core transfer.
export function ChangeAddressSelect ({ addresses, value, onChange, error }: ChangeAddressSelectProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1.5'>
      <OverlayMenu
        triggerContent={(
          <div className='flex items-center min-w-0 w-full'>
            {value != null && value !== ''
              ? <AddressRow address={value} />
              : <Text size='sm' dim>Select change address</Text>}
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
        error={error != null}
        arrowClassName='text-dash-primary-dark-blue/48 dark:text-white/48'
        className='!w-full'
        contentClassName='!w-full'
        triggerClassName='gap-2 !px-4 !py-3 !rounded-2xl !bg-dash-primary-dark-blue/[0.03] dark:!bg-white/5'
      />
      {error != null && <Text size='xs' className='!text-red-500'>{error}</Text>}
    </div>
  )
}
