import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { base64 } from '@scure/base'
import { useSdk, useExtensionAPI, useSendTransactionForm } from '../../../hooks'
import { toBaseUnit, parseCreditsAmount } from '../../../../utils'
import { MIN_CREDIT_TRANSFER } from '../../../constants/transaction'
import { MIN_OUTPUT_CREDITS, MIN_WITHDRAWAL_CREDITS, MAX_WITHDRAWAL_CREDITS, WITHDRAWAL_POOLING } from '../../../../constants'
import type { TokenData } from '../../../../types'
import type { TransferMode } from '../types'
import { SHIELDED_MODES } from '../types'

type FormState = ReturnType<typeof useSendTransactionForm>

interface UseSendSubmitParams {
  currentIdentity: string | null
  selectedIdentity: string | null
  formState: FormState
  transferMode: TransferMode
  isSameParty: boolean
  selectedPlatformAddress: string | null
  selectedShieldedAddress: string | null
  token: TokenData | undefined
}

interface UseSendSubmitResult {
  isLoading: boolean
  handleSend: () => Promise<void>
}

// Modes signed + broadcast directly via /platform-transfer-confirm (password),
// rather than producing a state transition for the /approve screen.
const DIRECT_BROADCAST_MODES: TransferMode[] = [
  'fund', 'send', 'topup', 'withdraw', ...SHIELDED_MODES
]

// Of those, the ones spending a transparent platform address.
const SPENDS_FROM_ADDRESS_MODES: TransferMode[] = ['send', 'topup', 'withdraw', 'shield']

// Navigation options shared by both approval flows.
const APPROVE_NAV_STATE = {
  disableIdentitySelect: true,
  showBackButton: true,
  returnToHome: true
}

/**
 * Builds and dispatches the transfer for the current form: platform-address
 * transfers go to the dedicated confirmation screen, while credit/token
 * transfers create a state transition and route to the approval screen.
 */
export function useSendSubmit ({
  currentIdentity,
  selectedIdentity,
  formState,
  transferMode,
  isSameParty,
  selectedPlatformAddress,
  selectedShieldedAddress,
  token
}: UseSendSubmitParams): UseSendSubmitResult {
  const navigate = useNavigate()
  const sdk = useSdk()
  const extensionAPI = useExtensionAPI()
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (): Promise<void> => {
    if (currentIdentity === null || currentIdentity === undefined) {
      formState.setError('No identity selected')
      return
    }

    const sender = selectedIdentity ?? currentIdentity

    // Validate that recipient is selected from search results
    if (formState.selectedRecipient === null) {
      formState.setError('Please select a recipient from search results')
      return
    }

    if (isSameParty) {
      formState.setError('Recipient must be different from the sender')
      return
    }

    if (transferMode === 'unsupported') {
      formState.setError('This sender cannot pay this recipient')
      return
    }

    // These sign + broadcast directly (password) -> dedicated confirm screen, not /approve.
    if (DIRECT_BROADCAST_MODES.includes(transferMode)) {
      const amountCredits = parseCreditsAmount(formState.formData.amount)

      if (amountCredits === null) {
        formState.setError('Please enter a valid amount')
        return
      }

      const isWithdrawal = transferMode === 'withdraw' || transferMode === 'shieldedWithdraw'

      if (isWithdrawal && amountCredits < MIN_WITHDRAWAL_CREDITS) {
        formState.setError(`Minimum withdrawal amount is ${MIN_WITHDRAWAL_CREDITS.toLocaleString()} credits`)
        return
      }

      if (isWithdrawal && amountCredits > MAX_WITHDRAWAL_CREDITS) {
        formState.setError(`Maximum withdrawal amount is ${MAX_WITHDRAWAL_CREDITS.toLocaleString()} credits`)
        return
      }

      if (!isWithdrawal && amountCredits < MIN_OUTPUT_CREDITS) {
        formState.setError(`Minimum platform transfer amount is ${MIN_OUTPUT_CREDITS.toLocaleString()} credits`)
        return
      }

      const spendsFromAddress = SPENDS_FROM_ADDRESS_MODES.includes(transferMode)
      if (spendsFromAddress && selectedPlatformAddress === null) {
        formState.setError('Please select a source platform address')
        return
      }

      // Only a private transfer can scope the spend to source notes; the other
      // shielded modes have no `fromAddresses` and draw from the whole account.
      const shieldedSources = transferMode === 'shieldedTransfer' && selectedShieldedAddress !== null
        ? [selectedShieldedAddress]
        : undefined

      void navigate('/platform-transfer-confirm', {
        state: {
          direction: transferMode,
          toAddress: formState.selectedRecipient.identifier,
          fromAddress: spendsFromAddress ? selectedPlatformAddress : undefined,
          fromShieldedAddresses: shieldedSources,
          amountCredits: amountCredits.toString(),
          fromIdentity: transferMode === 'fund' ? sender : undefined
        }
      })
      return
    }

    setIsLoading(true)
    formState.setError(null)

    try {
      if (transferMode === 'identityWithdraw') {
        const amountInCredits = parseCreditsAmount(formState.formData.amount)

        if (amountInCredits === null) {
          formState.setError('Please enter a valid amount')
          return
        }

        if (amountInCredits < MIN_WITHDRAWAL_CREDITS) {
          formState.setError(`Minimum withdrawal amount is ${MIN_WITHDRAWAL_CREDITS.toLocaleString()} credits`)
          return
        }

        if (amountInCredits > MAX_WITHDRAWAL_CREDITS) {
          formState.setError(`Maximum withdrawal amount is ${MAX_WITHDRAWAL_CREDITS.toLocaleString()} credits`)
          return
        }

        const identityNonce = await sdk.identities.getIdentityNonce(sender)

        const stateTransition = sdk.identities.createStateTransition('withdrawal', {
          identityId: sender,
          amount: amountInCredits,
          withdrawalAddress: formState.selectedRecipient.identifier,
          identityNonce: identityNonce + 1n,
          pooling: WITHDRAWAL_POOLING
        })

        const stateTransitionBase64 = base64.encode(stateTransition.bytes())
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        void navigate(`/approve/${response.stateTransition.unsignedHash}`, { state: APPROVE_NAV_STATE })
      } else if (transferMode === 'creditTransfer') {
        const amountInCredits = parseCreditsAmount(formState.formData.amount)

        if (amountInCredits === null) {
          formState.setError('Please enter a valid amount')
          return
        }

        // Validate minimum credit transfer amount
        if (amountInCredits < MIN_CREDIT_TRANSFER) {
          formState.setError(`Minimum credit transfer amount is ${MIN_CREDIT_TRANSFER.toLocaleString()} credits`)
          return
        }

        const identityNonce = await sdk.identities.getIdentityNonce(sender)

        // Create unsigned identity credit transfer state transition
        const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
          identityId: sender,
          amount: amountInCredits,
          recipientId: formState.selectedRecipient.identifier,
          identityNonce: identityNonce + 1n
        })

        const stateTransitionBase64 = base64.encode(stateTransition.bytes())
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        void navigate(`/approve/${response.stateTransition.unsignedHash}`, { state: APPROVE_NAV_STATE })
      } else {
        // Token transfer
        if (token == null) {
          formState.setError('Selected token not found')
          return
        }

        const amountInBaseUnits = toBaseUnit(formState.formData.amount, token.decimals, true) as bigint

        // Check if the converted amount is 0
        if (amountInBaseUnits === 0n) {
          formState.setError('Amount is too small')
          return
        }

        // Create token base transition first
        const baseTransition = await sdk.tokens.createBaseTransition(token.identifier, currentIdentity)

        const stateTransition = sdk.tokens.createStateTransition(
          baseTransition,
          currentIdentity,
          'transfer',
          {
            identityId: formState.selectedRecipient.identifier,
            amount: amountInBaseUnits
          }
        )

        const stateTransitionBase64 = base64.encode(stateTransition.bytes())
        const response = await extensionAPI.createStateTransition(stateTransitionBase64)

        void navigate(`/approve/${response.stateTransition.unsignedHash}`, { state: APPROVE_NAV_STATE })
      }
    } catch (err) {
      console.error('Transaction creation failed:', err)
      formState.setError(err instanceof Error ? err.message : 'Transaction creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, handleSend }
}
