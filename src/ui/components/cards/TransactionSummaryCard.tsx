import React from 'react'
import { Text } from 'dash-ui-kit/react'

interface TransactionSummaryCardProps {
  fees: string
  willBeSent?: string
  total: string
  unit: string
  selectedAsset: string
  showWillBeSent?: boolean
}

export function TransactionSummaryCard ({
  fees,
  willBeSent,
  total,
  unit,
  selectedAsset,
  showWillBeSent = true
}: TransactionSummaryCardProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 p-3 bg-white rounded-[0.9375rem] shadow-[0px_0px_35px_0px_rgba(0,0,0,0.1)]'>
      {/* Fees Row */}
      <div className='flex items-center justify-between w-full'>
        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50' dim>
          Fees:
        </Text>
        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50 text-right'>
          {fees} Credits
        </Text>
      </div>

      {/* Will be sent Row - Only for Credits */}
      {showWillBeSent && selectedAsset === 'credits' && willBeSent != null && (
        <div className='flex items-center justify-between w-full'>
          <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50' dim>
            Will be sent:
          </Text>
          <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50 text-right'>
            {willBeSent} {unit}
          </Text>
        </div>
      )}

      {/* Total Amount Row */}
      <div className='flex items-center justify-between w-full'>
        <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
          Total Amount:
        </Text>
        <Text size='sm' className='text-dash-primary-dark-blue text-right font-extrabold'>
          {selectedAsset === 'credits' ? '~' : ''}{total} {unit}
        </Text>
      </div>
    </div>
  )
}
