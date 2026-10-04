import { useCallback, useMemo, useReducer } from 'react'
import { fallbackTargetType } from '../../../../utils'
import type { TransferCapabilities } from '../../../../utils'
import type { AssetId, CoinControlSelection, EndpointType, TransferDraft } from '../types'

export type TransferDraftAction =
  | { type: 'setFromType', endpointType: EndpointType, capabilities: TransferCapabilities }
  | { type: 'setFromIdentity', identityId: string }
  | { type: 'setToType', endpointType: EndpointType }
  | { type: 'setRecipient', recipient: string }
  | { type: 'setShieldToMyself', value: boolean }
  | { type: 'setAsset', asset: AssetId, capabilities: TransferCapabilities }
  | { type: 'setAmount', amount: string }
  | { type: 'setCoinControl', selection: CoinControlSelection, amount?: string }
  | { type: 'reset', draft: TransferDraft }

// Moves the To side to a supported type, clearing the recipient when the type changes.
const withTarget = (draft: TransferDraft, capabilities: TransferCapabilities): TransferDraft => {
  const toType = fallbackTargetType(draft.from.type, draft.to.type, draft.asset, capabilities) ?? draft.to.type
  if (toType === draft.to.type) return draft
  return { ...draft, to: { ...draft.to, type: toType, recipient: '' } }
}

// State transitions of the send wizard draft.
export const transferDraftReducer = (draft: TransferDraft, action: TransferDraftAction): TransferDraft => {
  switch (action.type) {
    case 'setFromType':
      if (action.endpointType === draft.from.type) return draft
      return withTarget({ ...draft, from: { ...draft.from, type: action.endpointType }, coinControl: { type: 'automatic' } }, action.capabilities)
    case 'setFromIdentity':
      return { ...draft, from: { ...draft.from, identityId: action.identityId } }
    case 'setToType':
      if (action.endpointType === draft.to.type) return draft
      return { ...draft, to: { ...draft.to, type: action.endpointType, recipient: '' } }
    case 'setRecipient':
      return { ...draft, to: { ...draft.to, recipient: action.recipient } }
    case 'setShieldToMyself':
      return { ...draft, to: { ...draft.to, shieldToMyself: action.value } }
    case 'setAsset': {
      const from = action.asset.type === 'token' ? { ...draft.from, type: 'identity' as const } : draft.from
      const coinControl = from.type === draft.from.type ? draft.coinControl : { type: 'automatic' as const }
      return withTarget({ ...draft, from, coinControl, asset: action.asset, amount: '' }, action.capabilities)
    }
    case 'setAmount':
      return { ...draft, amount: action.amount }
    case 'setCoinControl':
      return { ...draft, coinControl: action.selection, amount: action.amount ?? draft.amount }
    case 'reset':
      return action.draft
  }
}

export interface TransferDraftActions {
  setFromType: (type: EndpointType) => void
  setFromIdentity: (identityId: string) => void
  setToType: (type: EndpointType) => void
  setRecipient: (recipient: string) => void
  setShieldToMyself: (value: boolean) => void
  setAsset: (asset: AssetId) => void
  setAmount: (amount: string) => void
  setCoinControl: (selection: CoinControlSelection, amount?: string) => void
  reset: (draft: TransferDraft) => void
}

// Send wizard draft with typed setters.
export function useTransferDraft (initial: TransferDraft, capabilities: TransferCapabilities): { draft: TransferDraft, actions: TransferDraftActions } {
  const [draft, dispatch] = useReducer(transferDraftReducer, initial)

  const setFromType = useCallback((endpointType: EndpointType) => dispatch({ type: 'setFromType', endpointType, capabilities }), [capabilities])
  const setAsset = useCallback((asset: AssetId) => dispatch({ type: 'setAsset', asset, capabilities }), [capabilities])

  const actions = useMemo((): TransferDraftActions => ({
    setFromType,
    setAsset,
    setFromIdentity: (identityId) => dispatch({ type: 'setFromIdentity', identityId }),
    setToType: (endpointType) => dispatch({ type: 'setToType', endpointType }),
    setRecipient: (recipient) => dispatch({ type: 'setRecipient', recipient }),
    setShieldToMyself: (value) => dispatch({ type: 'setShieldToMyself', value }),
    setAmount: (amount) => dispatch({ type: 'setAmount', amount }),
    setCoinControl: (selection, amount) => dispatch({ type: 'setCoinControl', selection, amount }),
    reset: (next) => dispatch({ type: 'reset', draft: next })
  }), [setFromType, setAsset])

  return { draft, actions }
}
