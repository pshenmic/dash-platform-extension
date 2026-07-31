import React, { useState } from 'react'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { Button, Text, Identifier, Accordion, CreditsIcon, BigNumber } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { TransactionInfoSection, TransactionDetailsCard } from '../../components/transactions'
import { TransferSummaryCard, Banner } from '../../components/cards'
import { PasswordField } from '../../components/forms'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks'
import type { OutletContext } from '../../types'
import { TRANSFER_FEE_CREDITS, SHIELDED_SPEND_FEE_CREDITS } from '../../../constants'
import { PROVING_WARNING, WITHDRAW_TO_CORE_WARNING, SHIELDED_WITHDRAW_WARNING } from '../../constants/transferWarnings'

// Stands in for a party that is the wallet's own shielded pool — it has no
// address the user chose, so there is nothing meaningful to render as an identifier.
const SHIELDED_PARTY_LABEL = 'Your shielded balance'

// 'send'             — platform address → platform address
// 'fund'             — identity → platform address
// 'topup'            — platform address → identity (recipient is an identity)
// 'withdraw'         — platform address → Core (L1) address
// 'shield'           — platform address → the wallet's own shielded pool
// 'unshield'         — shielded pool → platform address
// 'shieldedTransfer' — shielded pool → someone else's shielded address
// 'shieldedWithdraw' — shielded pool → Core (L1) address
const TRANSFER_DIRECTIONS = ['fund', 'send', 'topup', 'withdraw', 'shield', 'unshield', 'shieldedTransfer', 'shieldedWithdraw'] as const
type TransferDirection = typeof TRANSFER_DIRECTIONS[number]

interface DirectionDescriptor {
  // What the transfer spends from. 'shielded' has no identifier to display.
  senderType: 'address' | 'identity' | 'shielded'
  senderLabel: string
  recipientLabel: string
  // True when the recipient is the wallet's own pool rather than an address the
  // user chose — `shieldToPool` derives it from the seed.
  recipientIsSelf?: boolean
  transactionType: string
  // Extra caution shown on both the confirm and the success screen.
  warning?: string
  // Carries an Orchard (Halo2) proof: slow, and the popup must stay open.
  isSlow?: boolean
}

const DIRECTIONS: Record<TransferDirection, DirectionDescriptor> = {
  fund: {
    senderType: 'identity',
    senderLabel: 'Sender Identity',
    recipientLabel: 'Recipient Address',
    transactionType: 'Credit Transfer to Address'
  },
  send: {
    senderType: 'address',
    senderLabel: 'Sender Address',
    recipientLabel: 'Recipient Address',
    transactionType: 'Address Funds Transfer'
  },
  topup: {
    senderType: 'address',
    senderLabel: 'Sender Address',
    recipientLabel: 'Recipient Identity',
    transactionType: 'Identity Top-Up from Address'
  },
  withdraw: {
    senderType: 'address',
    senderLabel: 'Sender Address',
    recipientLabel: 'Recipient Core (L1) Address',
    transactionType: 'Withdrawal to Core',
    warning: WITHDRAW_TO_CORE_WARNING
  },
  shield: {
    senderType: 'address',
    senderLabel: 'Sender Address',
    recipientLabel: 'Recipient',
    recipientIsSelf: true,
    transactionType: 'Shield to Private Pool',
    isSlow: true
  },
  unshield: {
    senderType: 'shielded',
    senderLabel: 'Sender',
    recipientLabel: 'Recipient Address',
    transactionType: 'Unshield to Address',
    isSlow: true
  },
  shieldedTransfer: {
    senderType: 'shielded',
    senderLabel: 'Sender',
    recipientLabel: 'Recipient Shielded Address',
    transactionType: 'Private Transfer',
    isSlow: true
  },
  shieldedWithdraw: {
    senderType: 'shielded',
    senderLabel: 'Sender',
    recipientLabel: 'Recipient Core (L1) Address',
    transactionType: 'Private Withdrawal to Core',
    warning: SHIELDED_WITHDRAW_WARNING,
    isSlow: true
  }
}

interface PlatformTransferConfirmLocationState {
  direction: TransferDirection
  toAddress: string
  fromAddress?: string
  fromShieldedAddresses?: string[]
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
  if (state == null || !TRANSFER_DIRECTIONS.includes(state.direction)) {
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

  const { direction, toAddress, fromAddress, fromShieldedAddresses, amountCredits } = state
  const amountBig = BigInt(amountCredits)
  const descriptor = DIRECTIONS[direction]
  const shieldedSource = fromShieldedAddresses?.[0] ?? null
  const senderValue = descriptor.senderType === 'address'
    ? (fromAddress ?? '')
    : descriptor.senderType === 'identity'
      ? (state.fromIdentity ?? '')
      : (shieldedSource ?? '')
  const senderIsPool = descriptor.senderType === 'shielded' && shieldedSource === null
  const senderLabel = descriptor.senderType === 'shielded' && shieldedSource !== null
    ? 'Sender Shielded Address'
    : descriptor.senderLabel
  const feeCredits = descriptor.senderType === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS

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
      } else if (direction === 'topup') {
        const response = await extensionAPI.topUpIdentityFromAddress(toAddress, amountCredits, password, fromAddress)
        setTxHash(response.stHash)
      } else if (direction === 'withdraw') {
        const response = await extensionAPI.withdrawPlatformAddressToCore(toAddress, amountCredits, password, fromAddress)
        setTxHash(response.stHash)
      } else if (direction === 'shield') {
        const response = await extensionAPI.shieldToPool(amountCredits, password, fromAddress)
        setTxHash(response.stHash)
      } else if (direction === 'unshield') {
        const response = await extensionAPI.unshieldToAddress(toAddress, amountCredits, password)
        setTxHash(response.stHash)
      } else if (direction === 'shieldedTransfer') {
        const response = await extensionAPI.sendShieldedTransfer(
          toAddress, amountCredits, password, undefined, undefined,
          (fromShieldedAddresses != null && fromShieldedAddresses.length > 0) ? fromShieldedAddresses : undefined
        )
        setTxHash(response.stHash)
      } else if (direction === 'shieldedWithdraw') {
        const response = await extensionAPI.withdrawShieldedToCore(toAddress, amountCredits, password)
        setTxHash(response.stHash)
      } else {
        if (state.fromIdentity != null) {
          await extensionAPI.switchIdentity(state.fromIdentity)
          setCurrentIdentity(state.fromIdentity)
        }
        const response = await extensionAPI.identityCreditTransferToAddresses(toAddress, amountCredits, password)
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
          transactionType={descriptor.transactionType}
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

            <TransactionDetailsCard title={senderLabel}>
              {senderIsPool
                ? <Text size='sm'>{SHIELDED_PARTY_LABEL}</Text>
                : (
                  <Identifier className='!text-[1.25rem]' copyButton middleEllipsis edgeChars={5} linesAdjustment={false}>
                    {senderValue}
                  </Identifier>
                  )}
            </TransactionDetailsCard>

            <TransactionDetailsCard title={descriptor.recipientLabel}>
              {descriptor.recipientIsSelf === true
                ? <Text size='sm'>{SHIELDED_PARTY_LABEL}</Text>
                : (
                  <Identifier className='!text-[1.25rem]' copyButton middleEllipsis edgeChars={5} linesAdjustment={false}>
                    {toAddress}
                  </Identifier>
                  )}
            </TransactionDetailsCard>

            <TransactionDetailsCard title='Fee (estimated)'>
              <BigNumber className='!text-[0.875rem] !font-medium'>
                {feeCredits.toString()}
              </BigNumber>
            </TransactionDetailsCard>
          </div>
        </Accordion>

        {/* Informational caution (irreversibility, loss of privacy) — below the
            details; never the proving text (the proof is already built by now). */}
        <Banner variant='warning' message={descriptor.warning ?? null} />

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

        <Banner variant='warning' message={descriptor.warning ?? null} />

        {/* Recipient */}
        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>{descriptor.recipientLabel}</Text>
          {descriptor.recipientIsSelf === true
            ? <Text size='sm'>{SHIELDED_PARTY_LABEL}</Text>
            : <Identifier highlight='both' linesAdjustment={false}>{toAddress}</Identifier>}
        </div>

        {/* Sender */}
        <div className='flex flex-col gap-2.5'>
          <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>{senderLabel}</Text>
          {senderIsPool
            ? <Text size='sm'>{SHIELDED_PARTY_LABEL}</Text>
            : <Identifier highlight='both' linesAdjustment={false}>{senderValue}</Identifier>}
        </div>

        {/* Summary */}
        <TransferSummaryCard
          fees={`~${feeCredits.toLocaleString()}`}
          willBeSent={amountBig.toLocaleString()}
          total={(amountBig + feeCredits).toLocaleString()}
          unit='Credits'
          selectedAsset='credits'
        />

        {/* Proving blocks this window — warn once, up front, for slow modes. */}
        {descriptor.isSlow === true && (
          <Banner variant='warning' message={PROVING_WARNING} />
        )}

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
            {isSubmitting
              ? (descriptor.isSlow === true ? 'Building proof — keep this open...' : 'Broadcasting...')
              : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(PlatformTransferConfirmState, { requireWallet: true })
