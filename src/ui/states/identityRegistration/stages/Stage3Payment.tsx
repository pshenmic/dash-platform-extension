import React from 'react'
import { Button, Input, Text, CopyButton, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { FieldLabel } from '../../../components/typography'
import { QRCodeSVG } from 'qrcode.react'

interface Stage3PaymentProps {
  stage: number
  isLoadingAddress: boolean
  fundingAddress: string | null
  addressError: string | null
  showManualEntry: boolean
  transactionHash: string
  onShowManualEntry: () => void
  onTransactionHashChange: (value: string) => void
  onConfirmPayment: () => void
}

export function Stage3Payment ({
  stage,
  isLoadingAddress,
  fundingAddress,
  addressError,
  showManualEntry,
  transactionHash,
  onShowManualEntry,
  onTransactionHashChange,
  onConfirmPayment
}: Stage3PaymentProps): React.JSX.Element {
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Waiting for Payment'
        description='Send any desired amount (over 0.1 Dash) to the address below. Your private keys are stored securely and never leave this device.'
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      <div className='mt-6'>
        <div className='bg-dash-primary-dark-blue/[0.04] rounded-3xl p-6 flex gap-6 items-center'>
          <div className='flex-shrink-0'>
            {isLoadingAddress
              ? (
                <div className='w-[100px] h-[100px] flex items-center justify-center'>
                  <Text size='xs' dim>Loading...</Text>
                </div>
                )
              : (
                <QRCodeSVG
                  value={fundingAddress ?? ''}
                  fgColor='#4C7EFF'
                  bgColor='transparent'
                  size={100}
                />
                )}
          </div>
          <div className='flex flex-col gap-1 flex-1 min-w-0'>
            {addressError != null
              ? (
                <Text size='sm' className='text-red-500 break-all'>{addressError}</Text>
                )
              : (
                <>
                  <div className='flex items-center gap-2'>
                    <Text
                      size='sm'
                      weight='medium'
                      className='text-dash-primary-dark-blue leading-[1.366em] tracking-[-0.01em] break-all'
                    >
                      {isLoadingAddress ? 'Generating address…' : (fundingAddress ?? '')}
                    </Text>
                    {fundingAddress != null && !isLoadingAddress && (
                      <div className='flex-shrink-0'>
                        <CopyButton text={fundingAddress} />
                      </div>
                    )}
                  </div>
                  <Text className='text-xs' dim>
                    You can send any amount convenient for you (over 0.1 Dash). We are ready to accept a transfer at any time!
                  </Text>
                </>
                )}
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-4 mt-6'>
        {!showManualEntry
          ? (
            <Button
              colorScheme='lightBlue'
              className='w-full'
              onClick={onShowManualEntry}
            >
              I made a payment
            </Button>
            )
          : (
            <div className='flex flex-col gap-2'>
              <FieldLabel>Transaction ID (txid)</FieldLabel>
              <Input
                placeholder='64-character transaction hash'
                value={transactionHash}
                onChange={(e) => onTransactionHashChange(e.target.value)}
              />
              <Button
                colorScheme='brand'
                className='w-full'
                disabled={
                  transactionHash.trim().length !== 64 ||
                  fundingAddress == null
                }
                onClick={onConfirmPayment}
              >
                Confirm
              </Button>
            </div>
            )}
        <ProgressStepBar totalSteps={5} currentStep={stage} />
      </div>
    </div>
  )
}
