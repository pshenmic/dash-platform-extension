import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  useAsyncState,
  usePlatformAddresses,
  usePlatformExplorerClient,
  useSdk,
  useShieldedAddresses,
  type UsePlatformAddressesResult,
  type UseShieldedAddressesResult
} from '../../hooks'
import type { OutletContext } from '../../types'
import type { NetworkType } from '../../../types'
import { getIdentityExplorerUrl, getPlatformAddressExplorerUrl } from '../../../utils'
import { RECEIVE_CORE_MOCK } from './mock'
import {
  DEFAULT_TARGET_TYPE_BY_SCOPE,
  RECEIVE_LAYER_BY_TARGET,
  type ReceiveScope,
  type ReceiveTarget,
  type ReceiveTargetType
} from './types'

interface UseReceiveTargetsParams {
  scope: ReceiveScope
  type: ReceiveTargetType | null
  value: string | null
}

export interface UseReceiveTargetsResult {
  showPicker: boolean
  activeType: ReceiveTargetType
  targets: ReceiveTarget[]
  selected: ReceiveTarget | null
  rate: number | null
  platform: UsePlatformAddressesResult
  shielded: UseShieldedAddressesResult
  loading: boolean
}

function buildTarget (
  type: ReceiveTargetType,
  value: string,
  balance: string | null,
  explorerUrl: string | null,
  isMock = false
): ReceiveTarget {
  return {
    type,
    value,
    layer: RECEIVE_LAYER_BY_TARGET[type],
    unit: type === 'core' ? 'Dash' : 'Credits',
    balance,
    explorerUrl,
    isMock
  }
}

/**
 * Candidate receive destinations for a scope, plus the one currently selected.
 * Shielded addresses stay behind their password gate until that type is picked,
 * so opening Receive never greets the user with a password prompt.
 */
export function useReceiveTargets ({ scope, type, value }: UseReceiveTargetsParams): UseReceiveTargetsResult {
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { availableIdentities, currentNetwork } = useOutletContext<OutletContext>()
  const network: NetworkType = currentNetwork ?? 'testnet'
  const platform = usePlatformAddresses(network)
  const shielded = useShieldedAddresses(network)
  const [rate, setRate] = useState<number | null>(null)
  const [identityBalanceState, loadIdentityBalance] = useAsyncState<bigint>()

  // An identity dashboard pins its own destination; every other entry point only picks where the picker starts.
  const showPicker = scope !== 'identity'
  const activeType = showPicker && type != null ? type : DEFAULT_TARGET_TYPE_BY_SCOPE[scope]

  useEffect(() => {
    platformExplorerClient.fetchRate(network)
      .then(setRate)
      .catch(e => console.log('fetchRate error', e))
  }, [network, platformExplorerClient])

  const identityValue = activeType === 'identity'
    ? value ?? availableIdentities[0]?.identifier ?? null
    : null

  useEffect(() => {
    if (identityValue == null || identityValue === '') return
    if (sdk.getNetwork() !== network) return

    loadIdentityBalance(async () => await sdk.identities.getIdentityBalance(identityValue))
      .catch(e => console.log('loadIdentityBalance error', e))
  }, [identityValue, network, sdk, loadIdentityBalance])

  const targets = useMemo((): ReceiveTarget[] => {
    if (activeType === 'core') {
      return [buildTarget('core', RECEIVE_CORE_MOCK.address, RECEIVE_CORE_MOCK.balance, null, true)]
    }

    if (activeType === 'platformAddress') {
      return platform.addresses.map(item => buildTarget(
        'platformAddress',
        item.address,
        item.balance,
        getPlatformAddressExplorerUrl(item.address, network)
      ))
    }

    if (activeType === 'shielded') {
      return shielded.rows.map(item => buildTarget('shielded', item.address, item.balance, null))
    }

    // Arriving from an identity dashboard means that identity, not a list to choose from again.
    const identities = showPicker
      ? availableIdentities.map(identity => identity.identifier)
      : identityValue != null ? [identityValue] : []

    return identities.map(identifier => buildTarget(
      'identity',
      identifier,
      identifier === identityValue && identityBalanceState.data != null
        ? identityBalanceState.data.toString()
        : null,
      getIdentityExplorerUrl(identifier, network)
    ))
  }, [activeType, platform.addresses, shielded.rows, availableIdentities, network, identityValue, identityBalanceState.data, showPicker])

  const selected = useMemo((): ReceiveTarget | null => {
    if (targets.length === 0) return null

    return targets.find(target => target.value === value) ?? targets[0]
  }, [targets, value])

  const loading = activeType === 'platformAddress'
    ? platform.isLoading
    : activeType === 'shielded' ? shielded.isLoading : false

  return { showPicker, activeType, targets, selected, rate, platform, shielded, loading }
}
