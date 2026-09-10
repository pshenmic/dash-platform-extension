import React, { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Button, Heading, Text, ValueCard } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { PasswordGate } from '../../components/forms'
import { useHideBalance } from '../../hooks'
import type { OutletContext } from '../../types'
import { buildTopUpUrl } from '../../utils/topUpTabUrl'
import { parseReceiveScope, parseReceiveTargetType, receivePath } from '../../utils/receivePath'
import { ReceiveCard } from './ReceiveCard'
import { ReceiveDetails } from './ReceiveDetails'
import { ReceiveNotice } from './ReceiveNotice'
import { TargetSwitch } from './TargetSwitch'
import { useReceiveTargets } from './useReceiveTargets'
import { RECEIVE_TYPE_FULL_LABELS, type ReceiveScope, type ReceiveTarget, type ReceiveTargetType } from './types'

const SCOPE_LABELS: Record<ReceiveScope, string> = {
  all: 'Core and Platform',
  core: 'Core',
  platform: 'Platform',
  identity: 'Identity'
}

/**
 * Wallet-wide receive screen. One screen for every dashboard, the destination
 * it shows comes from the scope and target in the URL.
 */
function ReceiveState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { currentWallet, currentNetwork } = useOutletContext<OutletContext>()

  const scope = parseReceiveScope(searchParams.get('scope'))
  const type = parseReceiveTargetType(searchParams.get('type'))
  const value = searchParams.get('value')
  const { hideBalance } = useHideBalance()

  const { showPicker, activeType, targets, selected, rate, platform, shielded, loading } =
    useReceiveTargets({ scope, type, value })

  // A picked identity belongs to the wallet it was picked in, so switching
  // wallets widens the screen back to the whole Platform layer.
  const previousWalletRef = useRef(currentWallet)

  useEffect(() => {
    const previous = previousWalletRef.current
    previousWalletRef.current = currentWallet

    if (previous === currentWallet || previous == null || currentWallet == null) return
    if (scope !== 'identity') return

    void navigate(receivePath('platform'), { replace: true, state: location.state })
  }, [currentWallet, scope, navigate, location.state])

  // Keep the origin so the header back button still returns to the right dashboard.
  const changeType = useCallback((next: ReceiveTargetType): void => {
    void navigate(receivePath(scope, { type: next }), { replace: true, state: location.state })
  }, [navigate, scope, location.state])

  const changeTarget = useCallback((next: ReceiveTarget): void => {
    void navigate(receivePath(scope, { type: next.type, value: next.value }), {
      replace: true,
      state: location.state
    })
  }, [navigate, scope, location.state])

  const openTopUp = useCallback((): void => {
    if (selected == null) return

    void navigate(buildTopUpUrl(
      { identityId: selected.value, walletId: currentWallet, network: currentNetwork },
      1
    ))
  }, [navigate, selected, currentWallet, currentNetwork])

  const handleShieldedLoad = useCallback(async (password: string): Promise<string | null> => {
    return await shielded.load(password)
  }, [shielded])

  const handlePlatformPassword = useCallback(async (password: string): Promise<string | null> => {
    return await platform.generateWithPassword(password)
  }, [platform])

  const handlePlatformPasswordCancel = useCallback((): void => {
    platform.cancelPassword()
  }, [platform])

  const needsShieldedPassword = activeType === 'shielded' && !shielded.hasLoaded
  const needsPlatformPassword = activeType === 'platformAddress' && platform.needsPassword

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <Heading as='h1' size='2xl'>Receive</Heading>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
          {SCOPE_LABELS[scope]} - {RECEIVE_TYPE_FULL_LABELS[activeType]}
        </Text>
        {selected?.isMock === true && (
          <Text size='xs' weight='medium' className='!text-dash-primary-dark-blue/35'>
            The Core address is mock data
          </Text>
        )}
      </div>

      <TargetSwitch
        showPicker={showPicker}
        activeType={activeType}
        targets={targets}
        selected={selected}
        onTypeChange={changeType}
        onTargetChange={changeTarget}
      />

      {needsShieldedPassword && (
        <PasswordGate
          description='Enter your password to view shielded addresses.'
          submitLabel='Show Shielded Addresses'
          isPending={shielded.isLoading}
          onSubmit={handleShieldedLoad}
        />
      )}

      {needsPlatformPassword && (
        <PasswordGate
          description='Enter your password once to enable platform addresses for this wallet.'
          submitLabel='Show addresses'
          pendingLabel='Loading...'
          isPending={platform.isGenerating}
          onSubmit={handlePlatformPassword}
          onCancel={handlePlatformPasswordCancel}
        />
      )}

      {platform.error != null && activeType === 'platformAddress' && (
        <ValueCard colorScheme='red' size='xl'>
          <Text size='sm' color='red'>{platform.error}</Text>
        </ValueCard>
      )}

      {shielded.error != null && activeType === 'shielded' && (
        <ValueCard colorScheme='red' size='xl'>
          <Text size='sm' color='red'>{shielded.error}</Text>
        </ValueCard>
      )}

      {loading && selected == null && <Text size='sm' dim>Loading destinations…</Text>}

      {!loading && selected == null && !needsShieldedPassword && !needsPlatformPassword && (
        <Text size='sm' dim>
          {activeType === 'platformAddress'
            ? 'No platform addresses yet. Create one on the Platform Addresses tab.'
            : 'Nothing to receive into on this layer yet.'}
        </Text>
      )}

      {selected != null && (
        <>
          <ReceiveNotice target={selected} />
          <ReceiveCard target={selected} />
          <ReceiveDetails target={selected} hide={hideBalance} rate={rate} />
          {selected.type === 'identity' && (
            <Button
              type='button'
              colorScheme='lightBlue'
              className='!h-auto !min-h-0 !rounded-xl !py-3 w-full'
              onClick={openTopUp}
            >
              <Text size='sm' weight='medium' className='!text-dash-brand'>
                Top up from Dash
              </Text>
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export default withAccessControl(ReceiveState, { requireWallet: true })
