import React, { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Button, Heading, Text, ValueCard } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { PasswordGate } from '../../components/forms'
import { TopUpBusyDialog } from '../../components/topup'
import { useHideBalance, useOpenTopUp, useWalletCapabilities } from '../../hooks'
import type { OutletContext } from '../../types'
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
  const { currentWallet } = useOutletContext<OutletContext>()

  const scope = parseReceiveScope(searchParams.get('scope'))
  const type = parseReceiveTargetType(searchParams.get('type'))
  const value = searchParams.get('value')
  const { hideBalance } = useHideBalance()
  const { hasAddressLayer } = useWalletCapabilities()
  const { canTopUp, openTopUp, busyTab, dismissBusyTab, focusBusyTab } = useOpenTopUp()

  const { showTypeSwitch, activeType, targets, selected, rate, platform, shielded, loading } =
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

  const handleTopUp = useCallback((): void => {
    if (selected == null) return

    openTopUp(selected.value)
  }, [openTopUp, selected])

  const handleShieldedLoad = useCallback(async (password: string): Promise<string | null> => {
    return await shielded.load(password)
  }, [shielded])

  const handlePlatformPassword = useCallback(async (password: string): Promise<string | null> => {
    return await platform.generateWithPassword(password)
  }, [platform])

  const handlePlatformPasswordCancel = useCallback((): void => {
    platform.cancelPassword()
  }, [platform])

  // A wallet with no address layer only ever reaches Platform, whatever scope it
  // was opened with, so naming Core in the subtitle would be a lie.
  const scopeLabel = !hasAddressLayer && scope === 'all' ? SCOPE_LABELS.platform : SCOPE_LABELS[scope]

  const needsShieldedPassword = activeType === 'shielded' && !shielded.hasLoaded
  const needsPlatformPassword = activeType === 'platformAddress' && platform.needsPassword

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <Heading as='h1' size='2xl'>Receive</Heading>
        <Text size='sm' weight='medium' className='!text-dash-primary-dark-blue/48 !tracking-[-0.03em]'>
          {scopeLabel} - {RECEIVE_TYPE_FULL_LABELS[activeType]}
        </Text>
      </div>

      <TargetSwitch
        showTypeSwitch={showTypeSwitch}
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
          {selected.type === 'identity' && canTopUp && (
            <Button
              type='button'
              colorScheme='lightBlue'
              className='!h-auto !min-h-0 !rounded-xl !py-3 w-full'
              onClick={handleTopUp}
            >
              <Text size='sm' weight='medium' className='!text-dash-brand'>
                Top up from Dash
              </Text>
            </Button>
          )}
        </>
      )}

      <TopUpBusyDialog tab={busyTab} onDismiss={dismissBusyTab} onFocus={focusBusyTab} />
    </div>
  )
}

export default withAccessControl(ReceiveState, { requireWallet: true })
