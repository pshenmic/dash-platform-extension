import { useCallback, useRef, useState } from 'react'
import { CORE_DASH_DECIMALS, coreRecipientOutputs, isShieldToMyself } from '../../../../utils'
import { SHIELDED_MODES } from '../types'
import type { NetworkType } from '../../../../types'
import type { CoreFundingResult, CorePaymentResult, TransferApi } from '../transferApi'
import type { TransferDraft, TransferMode } from '../types'
import type { TransferResult, TransferResume } from './useTransferOperation'

interface TransferSubmitParams {
  api: TransferApi
  mode: TransferMode | null
  draft: TransferDraft
  amount: bigint | null
  sourceAddress: string | null
  walletId: string | null
  network: NetworkType
  track: (start: () => Promise<TransferResult>) => void
}

const done = async (call: Promise<{ txHash: string }>): Promise<TransferResult> => {
  const { txHash } = await call
  return { hashes: { single: txHash, platform: txHash } }
}

const corePayment = async (call: Promise<CorePaymentResult>): Promise<TransferResult> => {
  const { txHash, feeDuffs } = await call
  return { hashes: { single: txHash }, fee: { amount: feeDuffs, decimals: CORE_DASH_DECIMALS } }
}

// Wallet payment locked into Platform; a zero fee means an earlier payment was reused.
const coreFunding = async (call: Promise<CoreFundingResult>): Promise<TransferResult> => {
  const { txHash, coreTxHash, feeDuffs } = await call
  const hashes = { core: coreTxHash, platform: txHash }
  return feeDuffs > 0n ? { hashes, fee: { amount: feeDuffs, decimals: CORE_DASH_DECIMALS } } : { hashes, prepaid: true }
}

// Locks a Core payment made earlier into Platform.
const prepaidFunding = async (resume: TransferResume, call: Promise<{ txHash: string }>): Promise<TransferResult> => {
  const { txHash } = await call
  return { hashes: { core: resume.txid, platform: txHash }, prepaid: true }
}

interface TransferContext {
  api: TransferApi
  mode: TransferMode
  draft: TransferDraft
  amount: bigint
  sourceAddress: string | null
  password: string
  walletId?: string
  network: NetworkType
}

// Sends one Core transaction to every Advanced recipient.
const startAdvancedTransfer = async ({ api, mode, draft, password }: TransferContext): Promise<TransferResult> => {
  if (mode !== 'coreSend') throw new Error('Several recipients are not supported for this transfer')
  return await corePayment(api.sendCoreTransaction(coreRecipientOutputs(draft.recipients), password, draft.changeAddress ?? undefined))
}

// Starts the API call of the resolved transfer mode, or locks the earlier payment of `resume`.
const startTransfer = async (context: TransferContext, resume: TransferResume | null): Promise<TransferResult> => {
  const { api, mode, draft, amount, sourceAddress, password, walletId, network } = context
  const identityId = draft.from.identityId ?? ''
  const recipient = draft.to.recipient
  const fromAddress = sourceAddress ?? undefined

  if (draft.isAdvanced) return await startAdvancedTransfer(context)

  switch (mode) {
    case 'coreSend':
      return await corePayment(api.sendCoreTransfer(recipient, amount, password))
    case 'coreTopUp':
      return resume != null
        ? await prepaidFunding(resume, api.topUpIdentityFromFunding(recipient, resume.address, resume.txid, password, walletId, network))
        : await coreFunding(api.topUpIdentityFromWallet(recipient, amount, password, walletId, network))
    case 'coreFund':
      return resume != null
        ? await prepaidFunding(resume, api.fundPlatformAddressFromFunding(recipient, resume.address, resume.txid, password))
        : await coreFunding(api.fundPlatformAddressFromWallet(recipient, amount, password))
    case 'coreShield':
      return await coreFunding(api.shieldFromWallet(amount, password, isShieldToMyself(draft) ? undefined : recipient))
    case 'creditTransfer':
      return await done(api.creditTransfer(identityId, recipient, amount, password))
    case 'tokenTransfer':
      if (draft.asset.type !== 'token') throw new Error('No token selected')
      return await done(api.tokenTransfer(identityId, draft.asset.tokenId, recipient, amount, password))
    case 'identityWithdraw':
      return await done(api.identityWithdraw(identityId, recipient, amount, password))
    case 'fund':
      return await done(api.fund(identityId, recipient, amount, password))
    case 'send':
      return await done(api.send(recipient, amount, password, fromAddress))
    case 'topup':
      return await done(api.topup(recipient, amount, password, fromAddress))
    case 'withdraw':
      return await done(api.withdraw(recipient, amount, password, fromAddress))
    case 'shield':
      return await done(api.shield(amount, password, fromAddress))
    case 'unshield':
      return await done(api.unshield(recipient, amount, password))
    case 'shieldedTransfer':
      return await done(api.shieldedTransfer(recipient, amount, password))
    case 'shieldedWithdraw':
      return await done(api.shieldedWithdraw(recipient, amount, password))
    default:
      throw new Error('This transfer is not supported')
  }
}

// Checks the password and starts the transfer of the current draft, or finishes a paid one from `resume`.
export function useTransferSubmit ({ api, mode, draft, amount, sourceAddress, walletId, network, track }: TransferSubmitParams): {
  isChecking: boolean
  submit: (password: string, resume?: TransferResume | null) => Promise<'started' | 'invalidPassword' | 'ignored'>
} {
  const [isChecking, setIsChecking] = useState(false)
  const inFlightRef = useRef(false)

  const submit = useCallback(async (password: string, resume?: TransferResume | null): Promise<'started' | 'invalidPassword' | 'ignored'> => {
    if (mode == null || amount == null || inFlightRef.current) return 'ignored'

    inFlightRef.current = true
    setIsChecking(true)
    const valid = await api.checkPassword(password).catch(() => false)
    inFlightRef.current = false
    setIsChecking(false)

    if (!valid) return 'invalidPassword'

    const shielded = SHIELDED_MODES.includes(mode) || (mode === 'coreShield' && isShieldToMyself(draft))

    track(async () => {
      const result = await startTransfer({ api, mode, draft, amount, sourceAddress, password, walletId: walletId ?? undefined, network }, resume ?? null)
      if (shielded) api.syncShieldedNotes(password, walletId ?? undefined, network).catch(e => console.log('syncShieldedNotes error', e))
      return result
    })
    return 'started'
  }, [api, mode, draft, amount, sourceAddress, walletId, network, track])

  return { isChecking, submit }
}
