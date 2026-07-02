import React, { useState } from 'react'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { Button, Text, Identifier, Accordion, CreditsIcon, BigNumber } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { TransactionInfoSection, TransactionDetailsCard } from '../../components/transactions'
import { TransferSummaryCard } from '../../components/cards'
import { PasswordField } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks'
import type { OutletContext } from '../../types'
import { TRANSFER_FEE_CREDITS } from '../../../constants'

interface PlatformTransferConfirmLocationState {
  direction: 'fund' | 'send'
  toAddress: string
  fromAddress?: string
  amountCredits: string
  fromIdentity?: string
}

function PlatformTransferConfirmState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const { currentNetwork, setCurrentIdentity } = useOutletContext<OutletContext>()

  const state = location.state as PlatformTransferConfirmLocationState | null

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  // No valid transfer payload — nothing to confirm.
  if (state == null || (state.direction !== 'fund' && state.direction !== 'send')) {
    return (
      <div className='screen-content'>
        <div className='flex flex-col gap-6'>
          <TitleBlock title='Nothing to confirm' showLogo={false} />
          <Button className='w-full' colorScheme='brand' onClick={() => { void navigate('/') }}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  const { direction, toAddress, fromAddress, amountCredits } = state
  const amountBig = BigInt(amountCredits)
  const senderValue = direction === 'send' ? (fromAddress ?? '') : (state.fromIdentity ?? '')

  const handleConfirm = async (): Promise<void> => {
    if (password === '') {
      setError('Password must be provided')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (direction === 'send') {
        const response = await extensionAPI.sendPlatformTransfer(toAddress, amountCredits, password, fromAddress)
        setTxHash(response.stHash)
      } else {
        if (state.fromIdentity != null) {
          await extensionAPI.switchIdentity(state.fromIdentity)
          setCurrentIdentity(state.fromIdentity)
        }
        const response = await extensionAPI.fundPlatformAddress(toAddress, amountCredits, password)
        setTxHash(response.stHash)
      }
    } catch (err) {
      console.error('Platform transfer failed:', err)
      setError(err instanceof Error ? err.message : 'Platform transfer failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (txHash != null) {
    const network = (currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'

    return (
      <div className='screen-content'>
        <TitleBlock
          title={
            <>
              <span className='font-normal'>Transaction was</span><br />
              <span className='font-bold'>successfully broadcasted</span>
            </>
          }
          description='You can check the transaction details below'
        />

        <TransactionInfoSection
          transactionHash={txHash}
          network={network}
          transactionType={direction === 'send' ? 'Address Funds Transfer' : 'Credit Transfer to Address'}
        />

        <Accordion title='Details' showSeparator={false}>
          <div className='flex flex-col gap-2.5'>
            <TransactionDetailsCard title='Amount'>
              <div className='flex items-center justify-between gap-2.5 w-full'>
                <div className='flex items-center gap-2.5'>
                  <div className='w-[30px] h-[30px] flex items-center justify-center bg-dash-primary-dark-blue/5 rounded-full'>
                    <CreditsIcon />
                  </div>
                  <Text size='sm'>Credits</Text>
                </div>
                <BigNumber className='!text-[0.875rem] !font-bold !text-dash-brand'>
                  {amountCredits}
                </BigNumber>
              </div>
            </TransactionDetailsCard>

            <TransactionDetailsCard title={direction === 'send' ? 'Sender Address' : 'Sender Identity'}>
              <Identifier className='!text-[1.25rem]' copyButton middleEllipsis edgeChars={5} linesAdjustment={false}>
                {senderValue}
              </Identifier>
            </TransactionDetailsCard>

            <TransactionDetailsCard title='Recipient Address'>
              <Identifier className='!text-[1.25rem]' copyButton middleEllipsis edgeChars={5} linesAdjustment={false}>
                {toAddress}
              </Identifier>
            </TransactionDetailsCard>

            <TransactionDetailsCard title='Fee (estimated)'>
              <BigNumber className='!text-[0.875rem] !font-medium'>
                {TRANSFER_FEE_CREDITS.toString()}
              </BigNumber>
            </TransactionDetailsCard>
          </div>
        </Accordion>

        <div>
          <Button className='w-full' colorScheme='lightBlue' onClick={() => { void navigate('/') }}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='screen-content'>
      <div className='flex flex-col gap-6'>
        <TitleBlock
          title={<>Confirm transfer</>}
          description='Carefully check the transfer details before confirming'
          showLogo={false}
        />

        {/* Recipient */}
        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>Recipient</Text>
          <Identifier highlight='both' linesAdjustment={false}>{toAddress}</Identifier>
        </div>

        {/* Sender */}
        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>Sender</Text>
          <Identifier highlight='both' linesAdjustment={false}>{senderValue}</Identifier>
        </div>

        {/* Summary */}
        <TransferSummaryCard
          fees={`~${TRANSFER_FEE_CREDITS.toLocaleString()}`}
          willBeSent={amountBig.toLocaleString()}
          total={(amountBig + TRANSFER_FEE_CREDITS).toLocaleString()}
          unit='Credits'
          selectedAsset='credits'
        />

        {/* Password */}
        <PasswordField
          value={password}
          onChange={(value) => { setPassword(value); setError(null) }}
          placeholder='Your Password'
          error={error}
          variant='outlined'
        />

        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='brand'
            size='xl'
            className='w-full'
            onClick={() => { handleConfirm().catch(e => console.log('handleConfirm error', e)) }}
            disabled={isSubmitting || password === ''}
          >
            {isSubmitting ? 'Broadcasting...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(PlatformTransferConfirmState, { requireWallet: true })
