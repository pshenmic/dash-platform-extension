import { useEffect, useState } from 'react'
import { CORE_DUST_THRESHOLD } from '../../../../constants'
import { coreRecipientOutputs } from '../../../../utils'
import type { DirectionConfig } from '../directions/directionConfig'
import type { CoreOutput, TransferApi } from '../transferApi'
import type { TransferDraft } from '../types'

interface CoreTransferEstimateParams {
  api: TransferApi
  config: DirectionConfig | null
  draft: TransferDraft
  amount: bigint | null
  recipientsValid: boolean
  // Changes whenever the Core balance does, so Max is priced again.
  balanceKey: string | null
}

// Fee in duffs of the typed Core payment and the most one output can get; null while unknown.
export interface CoreTransferEstimate {
  feeDuffs: bigint | null
  maxSendableDuffs: bigint | null
}

interface Keyed {
  key: string
  value: bigint
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
export function useCoreTransferEstimate ({ api, config, draft, amount, recipientsValid, balanceKey }: CoreTransferEstimateParams): CoreTransferEstimate {
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

  const maxKey = enabled && ownAddress != null ? `${ownAddress}|${balanceKey ?? ''}` : null

  // Prices sending everything to one output, again whenever the balance changes.
  useEffect(() => {
    if (maxKey == null || ownAddress == null) return
    let active = true
    api.estimateCoreTransfer([{ address: ownAddress, amountDuffs: 0n }], undefined, true)
      .then(estimate => { if (active) setMax({ key: maxKey, value: estimate.maxSendableDuffs }) })
      .catch(e => console.log('estimateCoreTransfer max error', e))
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
        .catch(e => console.log('estimateCoreTransfer error', e))
    }, DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [api, feeKey])

  return {
    feeDuffs: fee != null && fee.key === feeKey ? fee.value : null,
    maxSendableDuffs: max != null && max.key === maxKey ? max.value : null
  }
}
