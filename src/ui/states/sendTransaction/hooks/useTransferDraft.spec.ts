import { transferDraftReducer } from './useTransferDraft'
import type { TransferCapabilities } from '../../../../utils'
import type { TransferDraft } from '../types'

const SEED: TransferCapabilities = { hasCoreLayer: true, hasAddressLayer: true, hasPlatformAddresses: true }

const DRAFT: TransferDraft = {
  from: { type: 'identity', identityId: 'X' },
  to: { type: 'core', recipient: 'yAddress', shieldToMyself: true },
  asset: { type: 'dash' },
  amount: '1',
  isAdvanced: false,
  coinControl: { type: 'automatic' },
  recipients: [],
  changeAddress: null
}

describe('transferDraftReducer', () => {
  it('keeps a supported To type and its recipient when From changes', () => {
    const next = transferDraftReducer(DRAFT, { type: 'setFromType', endpointType: 'platformAddress', capabilities: SEED })

    expect(next.to).toEqual(DRAFT.to)
    expect(next.from.type).toBe('platformAddress')
  })

  it('moves To to the first supported type and clears the recipient', () => {
    const shielded = transferDraftReducer(DRAFT, { type: 'setFromType', endpointType: 'shielded', capabilities: SEED })
    const toIdentity = transferDraftReducer({ ...shielded, to: { ...shielded.to, type: 'shielded' } }, { type: 'setFromType', endpointType: 'identity', capabilities: SEED })

    expect(toIdentity.to.type).toBe('core')
    expect(toIdentity.to.recipient).toBe('')
  })

  it('clears the recipient when the To type changes', () => {
    expect(transferDraftReducer(DRAFT, { type: 'setToType', endpointType: 'identity' }).to.recipient).toBe('')
  })

  it('locks a token to identity -> identity and resets the amount', () => {
    const draft = { ...DRAFT, from: { ...DRAFT.from, type: 'platformAddress' as const } }
    const next = transferDraftReducer(draft, { type: 'setAsset', asset: { type: 'token', tokenId: 't' }, capabilities: SEED })

    expect([next.from.type, next.to.type]).toEqual(['identity', 'identity'])
    expect(next.amount).toBe('')
  })
})
