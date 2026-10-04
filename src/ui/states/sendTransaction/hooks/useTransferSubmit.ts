import { useCallback, useRef, useState } from 'react'
import { SHIELDED_MODES } from '../types'
import type { NetworkType } from '../../../../types'
import type { TransferApi, TransferTxResult } from '../transferApi'
import type { TransferDraft, TransferMode } from '../types'

export type TransferSubmitOutcome =
  | { type: 'success', txHash: string }
  | { type: 'invalidPassword' }
  | { type: 'error', message: string }

interface TransferSubmitParams {
  api: TransferApi
  mode: TransferMode | null
  draft: TransferDraft
  amount: bigint | null
  sourceAddress: string | null
  walletId: string | null
  network: NetworkType
}

// Calls the API method of the resolved transfer mode.
const runTransfer = async (api: TransferApi, mode: TransferMode, draft: TransferDraft, amount: bigint, sourceAddress: string | null, password: string): Promise<TransferTxResult> => {
  const identityId = draft.from.identityId ?? ''
  const recipient = draft.to.recipient
  const fromAddress = sourceAddress ?? undefined

  switch (mode) {
    case 'creditTransfer':
      return await api.creditTransfer(identityId, recipient, amount, password)
    case 'tokenTransfer':
      if (draft.asset.type !== 'token') throw new Error('No token selected')
      return await api.tokenTransfer(identityId, draft.asset.tokenId, recipient, amount, password)
    case 'identityWithdraw':
      return await api.identityWithdraw(identityId, recipient, amount, password)
    case 'fund':
      return await api.fund(identityId, recipient, amount, password)
    case 'send':
      return await api.send(recipient, amount, password, fromAddress)
    case 'topup':
      return await api.topup(recipient, amount, password, fromAddress)
    case 'withdraw':
      return await api.withdraw(recipient, amount, password, fromAddress)
    case 'shield':
      return await api.shield(amount, password, fromAddress)
    case 'unshield':
      return await api.unshield(recipient, amount, password)
    case 'shieldedTransfer':
      return await api.shieldedTransfer(recipient, amount, password)
    case 'shieldedWithdraw':
      return await api.shieldedWithdraw(recipient, amount, password)
    default:
      throw new Error('This transfer is not available yet')
  }
}

// Checks the password and sends the transfer of the current draft.
export function useTransferSubmit ({ api, mode, draft, amount, sourceAddress, walletId, network }: TransferSubmitParams): {
  isSubmitting: boolean
  submit: (password: string) => Promise<TransferSubmitOutcome>
} {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inFlightRef = useRef(false)

  const submit = useCallback(async (password: string): Promise<TransferSubmitOutcome> => {
    if (mode == null || amount == null) return { type: 'error', message: 'The transfer is incomplete' }
    if (inFlightRef.current) return { type: 'error', message: 'The transfer is already being sent' }

    inFlightRef.current = true
    setIsSubmitting(true)

    const outcome = await api.checkPassword(password)
      .then(async (valid): Promise<TransferSubmitOutcome> => {
        if (!valid) return { type: 'invalidPassword' }
        const { txHash } = await runTransfer(api, mode, draft, amount, sourceAddress, password)
        return { type: 'success', txHash }
      })
      .catch((e): TransferSubmitOutcome => ({ type: 'error', message: e instanceof Error ? e.message : String(e) }))

    inFlightRef.current = false
    setIsSubmitting(false)

    if (outcome.type === 'success' && SHIELDED_MODES.includes(mode)) {
      api.syncShieldedNotes(password, walletId ?? undefined, network).catch(e => console.log('syncShieldedNotes error', e))
    }

    return outcome
  }, [api, mode, draft, amount, sourceAddress, walletId, network])

  return { isSubmitting, submit }
}
