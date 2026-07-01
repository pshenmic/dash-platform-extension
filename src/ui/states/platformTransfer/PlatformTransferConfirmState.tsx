import React, { useState } from 'react'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { Button, Text, Identifier } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { TransactionSuccessScreen } from '../../components/layout/TransactionSuccessScreen'
import { TransferSummaryCard } from '../../components/cards'
import { PasswordField } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks'
import type { OutletContext } from '../../types'
import { TRANSFER_FEE_CREDITS } from '../../../constants'

// Router state passed from the Transfer screen. `direction` selects the API
// method; platform-address transfers sign and broadcast directly here (with the
// password entered on this screen) rather than going through /approve.
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
  const { currentNetwork } = useOutletContext<OutletContext>()

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

  // Success view — reuse the shared broadcast success screen.
  if (txHash != null) {
    return (
      <TransactionSuccessScreen
        txHash={txHash}
        network={(currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'}
        onClose={() => { void navigate('/') }}
      />
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
          <Identifier highlight='both'>{senderValue}</Identifier>
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
