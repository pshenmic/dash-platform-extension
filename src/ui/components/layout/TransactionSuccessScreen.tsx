import React from 'react'
import { Text, Button, ValueCard, Identifier } from 'dash-ui-kit/react'

interface TransactionSuccessScreenProps {
  txHash: string
  title?: string
  description?: string
  onClose: () => void
  closeButtonText?: string
}

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = ({
  txHash,
  title = 'Transaction Successfully Broadcasted',
  description = 'Your transaction has been successfully broadcasted to the network',
  onClose,
  closeButtonText = 'Close'
}) => {
  return (
    <div className='flex flex-col h-full gap-2.5'>
      <div className='flex flex-col gap-4 w-full'>
        <Text size='lg' weight='bold'>
          {title}
        </Text>
        <Text size='sm' dim>
          {description}
        </Text>
      </div>

      <div className='flex flex-col gap-2.5 w-full'>
        <Text size='md' dim>Transaction Hash</Text>
        <ValueCard colorScheme='lightBlue' size='xl'>
          <Identifier
            highlight='both'
            copyButton
            ellipsis={false}
            className='w-full justify-between'
          >
            {txHash}
          </Identifier>
        </ValueCard>
      </div>

      <div className='w-full mt-auto'>
        <Button
          className='w-full'
          onClick={onClose}
          colorScheme='brand'
        >
          {closeButtonText}
        </Button>
      </div>
    </div>
  )
}
