import { useCallback, useRef, useState } from 'react'
import { CORE_DASH_DECIMALS, parseDashAmount, PLATFORM_DASH_DECIMALS } from '../../../../utils'
import { SHIELDED_MODES } from '../types'
import type { NetworkType } from '../../../../types'
import type { TransferApi } from '../transferApi'
import type { TransferDraft, TransferMode } from '../types'
import type { TransferProgress, TransferResume, TransferStart } from './useTransferOperation'

interface TransferSubmitParams {
  api: TransferApi
  mode: TransferMode | null
  draft: TransferDraft
  amount: bigint | null
  sourceAddress: string | null
  walletId: string | null
  network: NetworkType
  track: (start: (progress: TransferProgress) => Promise<TransferStart>, resume?: TransferResume | null) => void
}

const done = async (call: Promise<{ txHash: string }>): Promise<TransferStart> => {
  const { txHash } = await call
  return { type: 'done', hashes: { single: txHash, platform: txHash } }
}

const operation = async (call: Promise<{ operationId: string }>): Promise<TransferStart> => {
  const { operationId } = await call
  return { type: 'operation', operationId }
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
  progress: TransferProgress
}

// Pays an address from the wallet, then locks that payment into Platform with `lock`; `funding` skips the payment.
const fundFromCore = async (
  { api, amount, password, progress }: TransferContext,
  requestAddress: () => Promise<string>,
  lock: (address: string, txid: string) => Promise<{ txHash: string }>,
  funding: Extract<TransferResume, { type: 'funding' }> | null
): Promise<TransferStart> => {
  let paid = funding
  let fee: bigint | undefined

  if (paid == null) {
    const address = await requestAddress()
    const payment = await api.sendCoreTransfer(address, amount, password)
    paid = { type: 'funding', address, txid: payment.txHash }
    fee = payment.feeDuffs
    progress.setResume(paid)
  }

  const { txHash } = await lock(paid.address, paid.txid)
  return { type: 'done', hashes: { core: paid.txid, platform: txHash }, fee: fee != null ? { amount: fee, decimals: CORE_DASH_DECIMALS } : undefined }
}

// Sends one transfer to every Advanced recipient; both multi-output methods are mocks.
const startAdvancedTransfer = async ({ api, mode, draft, amount, sourceAddress, password }: TransferContext): Promise<TransferStart> => {
  const decimals = mode === 'coreSend' ? CORE_DASH_DECIMALS : PLATFORM_DASH_DECIMALS
  const outputs = draft.recipients.map(recipient => ({ address: recipient.address, amount: (parseDashAmount(recipient.amount, decimals) ?? 0n).toString() }))

  if (mode === 'coreSend') {
    const { txid, fee } = await api.sendCoreTransaction({ outputs, changeAddress: draft.changeAddress ?? undefined }, password)
    return { type: 'done', hashes: { single: txid }, fee: { amount: BigInt(fee), decimals: CORE_DASH_DECIMALS } }
  }

  if (mode === 'send') {
    if (sourceAddress == null) throw new Error('No platform address holds enough funds')
    const inputs = [{ address: sourceAddress, amount: amount.toString() }]
    return await done(api.sendPlatformTransferFromInputs({ inputs, outputs }, password).then(({ stHash }) => ({ txHash: stHash })))
  }

  throw new Error('Several recipients are not supported for this transfer')
}

// Starts the API call of the resolved transfer mode, or continues it from `resume`.
const startTransfer = async (context: TransferContext, resume: TransferResume | null): Promise<TransferStart> => {
  const { api, mode, draft, amount, sourceAddress, password, walletId, network } = context
  const identityId = draft.from.identityId ?? ''
  const recipient = draft.to.recipient
  const fromAddress = sourceAddress ?? undefined
  const funding = resume?.type === 'funding' ? resume : null

  if (resume?.type === 'operation') return await operation(api.retryTransferOperation(resume.operationId, password))

  if (draft.isAdvanced) return await startAdvancedTransfer(context)

  switch (mode) {
    case 'coreSend': {
      const { txHash, feeDuffs } = await api.sendCoreTransfer(recipient, amount, password)
      return { type: 'done', hashes: { single: txHash }, fee: { amount: feeDuffs, decimals: CORE_DASH_DECIMALS } }
    }
    case 'coreTopUp':
      return await fundFromCore(
        context,
        async () => await api.getCoreReceiveAddress(),
        async (address, txid) => await api.topUpIdentityFromFunding(recipient, address, txid, password, walletId, network),
        funding
      )
    case 'coreFund':
      return await fundFromCore(
        context,
        async () => await api.requestAssetLockFundingAddress(),
        async (address, txid) => await api.fundPlatformAddressFromFunding(recipient, address, txid, password),
        funding
      )
    case 'coreShield':
      return await operation(api.shieldFromCore(amount.toString(), password))
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

// Checks the password and starts the transfer of the current draft, or resumes a failed operation.
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

    const shielded = SHIELDED_MODES.includes(mode)

    track(async (progress) => {
      const result = await startTransfer({ api, mode, draft, amount, sourceAddress, password, walletId: walletId ?? undefined, network, progress }, resume ?? null)
      if (shielded) api.syncShieldedNotes(password, walletId ?? undefined, network).catch(e => console.log('syncShieldedNotes error', e))
      return result
    }, resume)
    return 'started'
  }, [api, mode, draft, amount, sourceAddress, walletId, network, track])

  return { isChecking, submit }
}
