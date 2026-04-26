import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Text, CreditsIcon, Identifier } from 'dash-ui-kit/react'
import type { DecodedIdentityCreditWithdrawalTransition } from '../../../../types/DecodedStateTransition'
import { TransactionDetailsCard } from '../../../components/transactions'
import { usePlatformExplorerClient } from '../../../hooks/usePlatformExplorerClient'
import { creditsToDash } from '../../../../utils'
import type { OutletContext } from '../../../types'
import { useTransactionSigned } from './index'

interface IdentityCreditWithdrawalDetailsProps {
  data: DecodedIdentityCreditWithdrawalTransition
}

export function IdentityCreditWithdrawalDetails ({ data }: IdentityCreditWithdrawalDetailsProps): React.JSX.Element {
  const { currentNetwork } = useOutletContext<OutletContext>()
  const signed = useTransactionSigned()
  const platformClient = usePlatformExplorerClient()
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    const loadRate = async (): Promise<void> => {
      try {
        const fetched = await platformClient.fetchRate((currentNetwork ?? 'testnet') as 'testnet' | 'mainnet')
        setRate(fetched)
      } catch {}
    }
    void loadRate()
  }, [currentNetwork, platformClient])

  const dashAmount = creditsToDash(Number(data.amount))
  const usdAmount = rate != null ? dashAmount * rate : null

  return (
    <div className='flex flex-col gap-2.5'>
      {/* Amount */}
      <TransactionDetailsCard title='Amount:'>
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-2.5'>
            <div className='w-[1.875rem] h-[1.875rem] flex items-center justify-center bg-dash-primary-dark-blue/5 rounded-full'>
              <CreditsIcon />
            </div>
            <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
              Credits
            </Text>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <Text className='!text-[0.875rem] !font-extrabold'>
              <span className='text-dash-brand'>{BigInt(data.amount).toLocaleString()}</span>
              {' '}Credits
            </Text>
            {usdAmount != null && (
              <Text className='!text-[0.625rem] text-right text-dash-primary-dark-blue opacity-35'>
                ~ ${usdAmount.toFixed(2)}
              </Text>
            )}
          </div>
        </div>
      </TransactionDetailsCard>

      {/* Identity */}
      <TransactionDetailsCard title='Identity:'>
        <Identifier
          avatar
          copyButton
          middleEllipsis
          edgeChars={5}
          linesAdjustment={false}
          className='!text-[1.25rem]'
        >
          {data.identityId}
        </Identifier>
      </TransactionDetailsCard>

      {/* Identity Nonce + Pooling */}
      <div className='flex gap-2.5'>
        <TransactionDetailsCard className='flex-none' title='Identity Nonce:'>
          <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
            {data.identityNonce}
          </Text>
        </TransactionDetailsCard>
        <TransactionDetailsCard className='flex-1' title='Pooling:'>
          <Text className='!text-[0.875rem] !font-medium text-dash-primary-dark-blue'>
            {data.pooling}
          </Text>
        </TransactionDetailsCard>
      </div>

      {/* Signature Public Key Id — only when signed */}
      {signed && data.signaturePublicKeyId != null && (
        <TransactionDetailsCard title='Signature Public Key Id:'>
          <Text className='!text-[1.25rem] !font-medium text-dash-primary-dark-blue font-["Space_Grotesk"]'>
            {data.signaturePublicKeyId}
          </Text>
        </TransactionDetailsCard>
      )}

      {/* Output Script */}
      {data.outputScript != null && (
        <TransactionDetailsCard title='Output Script:'>
          <Identifier
            copyButton
            linesAdjustment={false}
            className='!text-[0.875rem] break-all'
          >
            {data.outputScript}
          </Identifier>
        </TransactionDetailsCard>
      )}
    </div>
  )
}
