import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Identifier, Text, CreditsIcon, BigNumber } from 'dash-ui-kit/react'
import type { DecodedIdentityCreditTransferTransition } from '../../../../types/DecodedStateTransition'
import { TransactionDetailsCard } from '../../../components/transactions'
import { usePlatformExplorerClient } from '../../../hooks/usePlatformExplorerClient'
import { creditsToDash } from '../../../../utils'
import type { OutletContext } from '../../../types'
import { useTransactionSigned } from './index'

interface IdentityCreditTransferDetailsProps {
  data: DecodedIdentityCreditTransferTransition
}

export function IdentityCreditTransferDetails ({ data }: IdentityCreditTransferDetailsProps): React.JSX.Element {
  const { currentNetwork } = useOutletContext<OutletContext>()
  const signed = useTransactionSigned()
  const platformClient = usePlatformExplorerClient()
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    const loadRate = async (): Promise<void> => {
      try {
        const fetchedRate = await platformClient.fetchRate((currentNetwork ?? 'testnet') as 'testnet' | 'mainnet')
        setRate(fetchedRate)
      } catch (error) {
        console.error('Failed to fetch rate:', error)
      }
    }

    void loadRate()
  }, [currentNetwork, platformClient])

  const dashAmount = creditsToDash(Number(data.amount))
  const usdAmount = rate != null ? dashAmount * rate : null
  return (
    <div className='flex flex-col gap-2.5'>
      <TransactionDetailsCard title='Amount'>
        <div className='flex items-center justify-between gap-2.5 w-full'>
          <div className='flex items-center gap-2.5'>
            <div className='w-[30px] h-[30px] flex items-center justify-center bg-dash-primary-dark-blue/5 rounded-full'>
              <CreditsIcon />
            </div>
            <Text size='sm'>
              Credits
            </Text>
          </div>
          <div className='flex flex-col justify-end'>
            <BigNumber className='!text-[0.875rem] !font-bold !text-dash-brand'>
              {data.amount}
            </BigNumber>
            {usdAmount != null && (
              <Text size='xs' className='text-right' dim>
                ~ ${usdAmount.toFixed(2)}
              </Text>
            )}
          </div>
        </div>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Sender Identity'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.senderId}
        </Identifier>
      </TransactionDetailsCard>

      <TransactionDetailsCard title='Recipient Identity'>
        <Identifier className='!text-[1.25rem]' avatar copyButton middleEllipsis edgeChars={5}>
          {data.recipientId}
        </Identifier>
      </TransactionDetailsCard>

      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-1' title='Identity Nonce'>
          <Text size='lg'>
            {data.identityNonce}
          </Text>
        </TransactionDetailsCard>
        {signed && data.signaturePublicKeyId != null && (
          <TransactionDetailsCard className='flex-1' title='Public Key ID'>
            <Text size='lg'>
              {data.signaturePublicKeyId}
            </Text>
          </TransactionDetailsCard>
        )}
      </div>
    </div>
  )
}
