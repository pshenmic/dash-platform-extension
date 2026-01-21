import React from 'react'
import { Button } from 'dash-ui-kit/react'
import { TitleBlock } from './TitleBlock'
import { TransactionHashBlock } from '../transactions'

interface TransactionSuccessScreenProps {
  txHash: string
  network: 'testnet' | 'mainnet'
  onClose: () => void
  title?: React.ReactNode
  description?: string
}

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = ({
  txHash,
  network,
  onClose,
  title,
  description
}) => {
  return (
    <div className='screen-content'>
      <TitleBlock
        title={
          title ?? (
            <>
              <span className='font-normal'>Transaction was</span><br />
              <span className='font-bold'>successfully broadcasted</span>
            </>
          )
        }
        description={description ?? 'You can check the transaction hash below'}
      />

      <TransactionHashBlock
        hash={txHash}
        network={network}
        showHeader
      />

      <div>
        <Button
          className='w-full'
          onClick={onClose}
          colorScheme='lightBlue'
        >
          Close
        </Button>
      </div>
    </div>
  )
}
