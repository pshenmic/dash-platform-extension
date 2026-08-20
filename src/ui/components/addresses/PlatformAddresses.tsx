import React from 'react'
import { Text, Button, ValueCard } from 'dash-ui-kit/react'
import { PasswordGate } from '../forms'
import { AddressItem } from './AddressItem'
import { usePlatformAddresses } from '../../hooks/usePlatformAddresses'
import { getAddressExplorerUrl } from '../../../utils'
import type { NetworkType } from '../../../types'

interface PlatformAddressesProps {
  currentNetwork?: NetworkType | null
}

export const PlatformAddresses: React.FC<PlatformAddressesProps> = ({ currentNetwork }) => {
  const {
    addresses,
    isLoading,
    isGenerating,
    hasLoaded,
    error,
    needsPassword,
    generate,
    generateWithPassword,
    cancelPassword
  } = usePlatformAddresses(currentNetwork)

  return (
    <div className='flex flex-col gap-4 pt-4'>
      <Text size='sm' dim>
        Your Platform Addresses. It is recommended to use different addresses for each transaction.
      </Text>

      {error != null && (
        <ValueCard colorScheme='red' size='xl'>
          <Text size='sm' color='red'>{error}</Text>
        </ValueCard>
      )}

      {hasLoaded && !isLoading && addresses.length === 0 && (
        <ValueCard colorScheme='lightGray' size='xl'>
          <Text size='sm' dim>No addresses yet. Create your first one below.</Text>
        </ValueCard>
      )}

      {addresses.length > 0 && (
        <div className='flex flex-col gap-2'>
          {addresses.map((item) => (
            <AddressItem
              key={`${item.index}-${item.address}`}
              item={item}
              explorerUrl={getAddressExplorerUrl(item.address, currentNetwork ?? 'testnet')}
            />
          ))}
        </div>
      )}

      {needsPassword
        ? (
          <PasswordGate
            description='Enter your password once to enable platform addresses for this wallet.'
            submitLabel='Create address'
            pendingLabel='Creating...'
            isPending={isGenerating}
            onSubmit={generateWithPassword}
            onCancel={cancelPassword}
          />
          )
        : (
          <Button
            colorScheme='brand'
            onClick={() => { void generate() }}
            disabled={isLoading || isGenerating}
          >
            {isGenerating ? 'Loading...' : 'Add one more address'}
          </Button>
          )}
    </div>
  )
}
