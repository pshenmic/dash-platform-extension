import { useEffect, useState } from 'react'
import { CORE_DUST_THRESHOLD } from '../../../../constants'
import { coreFallbackFeeDuffs, coreFallbackMaxDuffs, coreRecipientOutputs } from '../../../../utils'
import type { DirectionConfig } from '../directions/directionConfig'
import type { CoreOutput, TransferApi } from '../transferApi'
import type { TransferDraft } from '../types'
import { useEstimateGrace } from './useEstimateGrace'
import { recipientCount } from './useTransferFee'

interface CoreTransferEstimateParams {
  api: TransferApi
  config: DirectionConfig | null
  draft: TransferDraft
  amount: bigint | null
  recipientsValid: boolean
  // A change prices Max again, which also retries a failed estimate.
  balance: bigint | null
}

// Fee in duffs of the typed Core payment and the most one output can get after the fee, the fallbacks while unknown; null for other sources.
export interface CoreTransferEstimate {
  feeDuffs: bigint | null
  maxAmountDuffs: bigint | null
  isFeeFallback: boolean
  // Fee request still inside its grace period.
  isFeeLoading: boolean
}

interface Keyed {
  key: string
  // Null when the request failed.
  value: bigint | null
}

const DEBOUNCE_MS = 400

// Outputs the transfer pays; an empty address stands for the wallet's own receive address.
const paidOutputs = (config: DirectionConfig, draft: TransferDraft, amount: bigint | null, recipientsValid: boolean): CoreOutput[] | null => {
  if (draft.isAdvanced) return recipientsValid ? coreRecipientOutputs(draft.recipients) : null
  if (amount == null) return null
  // Core -> Platform deposits price as a plain one-output payment of the deposit.
  return [{ address: config.mode === 'coreSend' ? draft.to.recipient : '', amountDuffs: amount }]
}

const outputsKey = (outputs: CoreOutput[], changeAddress: string | null): string =>
  JSON.stringify([outputs.map(output => [output.address, output.amountDuffs.toString()]), changeAddress])

// Prices a Core payment with the same coin selection the send runs; no password needed.
export function useCoreTransferEstimate ({ api, config, draft, amount, recipientsValid, balance }: CoreTransferEstimateParams): CoreTransferEstimate {
  const enabled = config?.feeSource === 'coreEstimate'
  const [ownAddress, setOwnAddress] = useState<string | null>(null)
  const [max, setMax] = useState<Keyed | null>(null)
  const [fee, setFee] = useState<Keyed | null>(null)

  // Own receive address priced as the recipient until one is typed; reading it does not use it up.
  useEffect(() => {
    if (!enabled || ownAddress != null) return
    let active = true
    api.getCoreReceiveAddress()
      .then(address => { if (active) setOwnAddress(address) })
      .catch(e => console.log('getCoreReceiveAddress error', e))
    return () => { active = false }
  }, [api, enabled, ownAddress])

  const maxKey = enabled && ownAddress != null ? `${ownAddress}|${balance?.toString() ?? ''}` : null

  // Prices sending everything to one output, again whenever the balance changes; the amount is ignored under send-max.
  useEffect(() => {
    if (maxKey == null || ownAddress == null) return
    let active = true
    api.estimateCoreTransfer([{ address: ownAddress, amountDuffs: 1n }], undefined, true)
      .then(estimate => { if (active) setMax({ key: maxKey, value: estimate.amountDuffs }) })
      .catch(e => {
        console.log('estimateCoreTransfer max error', e)
        if (active) setMax({ key: maxKey, value: null })
      })
    return () => { active = false }
  }, [api, maxKey, ownAddress])

  const outputs = enabled && config != null && ownAddress != null
    ? paidOutputs(config, draft, amount, recipientsValid)?.map(output => ({ ...output, address: output.address === '' ? ownAddress : output.address })) ?? null
    : null
  const changeAddress = draft.isAdvanced && draft.changeAddress !== '' ? draft.changeAddress : null
  const feeKey = outputs != null && outputs.length > 0 && outputs.every(output => output.amountDuffs > CORE_DUST_THRESHOLD)
    ? outputsKey(outputs, changeAddress)
    : null

  // Prices the typed outputs once typing pauses; a stale answer is dropped.
  useEffect(() => {
    if (feeKey == null || outputs == null) return
    let active = true
    const timer = setTimeout(() => {
      api.estimateCoreTransfer(outputs, changeAddress ?? undefined)
        .then(estimate => { if (active) setFee({ key: feeKey, value: estimate.feeDuffs }) })
        .catch(e => {
          console.log('estimateCoreTransfer error', e)
          if (active) setFee({ key: feeKey, value: null })
        })
    }, DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [api, feeKey])

  const feeSettled = fee != null && fee.key === feeKey
  const isFeeLoading = useEstimateGrace(feeKey != null && !feeSettled ? feeKey : null)
  if (!enabled) return { feeDuffs: null, maxAmountDuffs: null, isFeeFallback: false, isFeeLoading: false }

  const feeDuffs = feeSettled ? fee.value : null
  const maxDuffs = max != null && max.key === maxKey ? max.value : null
  return {
    feeDuffs: feeDuffs ?? coreFallbackFeeDuffs(recipientCount(draft)),
    maxAmountDuffs: maxDuffs ?? (balance != null ? coreFallbackMaxDuffs(balance) : null),
    isFeeFallback: feeDuffs == null,
    isFeeLoading
  }
}
