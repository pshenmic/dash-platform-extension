import React, { useEffect, useState } from 'react'
import { Button, Dialog, PlusIcon } from 'dash-ui-kit/react'
import { useNavigate } from 'react-router-dom'
import { WalletType, type NetworkType } from '../../../types'
import type { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { getSdkPromise } from '../../../utils/sdkLoader'
import { useDashRate } from '../../hooks'
import { IdentityOption } from '../identity'

interface SelectIdentityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  identities: string[]
  currentIdentity: string | null
  onSelectIdentity: (identity: string) => void
  currentWallet?: WalletAccountInfo | null
}

interface BalancesState {
  data: Record<string, bigint> | null
  loading: boolean
  error: boolean
}

const fetchBalances = async (identities: string[]): Promise<Record<string, bigint>> => {
  const sdk = await getSdkPromise()
  const entries = await Promise.all(
    identities.map(async (identity) => [identity, await sdk.identities.getIdentityBalance(identity)] as const)
  )
  return Object.fromEntries(entries)
}

// Dialog listing the wallet identities with balances to pick the active one.
export function SelectIdentityDialog ({ open, onOpenChange, identities, currentIdentity, onSelectIdentity, currentWallet }: SelectIdentityDialogProps): React.JSX.Element {
  const navigate = useNavigate()
  const { rate } = useDashRate(currentWallet?.network as NetworkType | undefined)
  const [balances, setBalances] = useState<BalancesState>({ data: null, loading: false, error: false })

  useEffect(() => {
    if (!open || identities.length === 0) return

    let cancelled = false
    setBalances({ data: null, loading: true, error: false })

    fetchBalances(identities)
      .then(data => { if (!cancelled) setBalances({ data, loading: false, error: false }) })
      .catch(() => { if (!cancelled) setBalances({ data: null, loading: false, error: true }) })

    return () => { cancelled = true }
  }, [open, identities])

  const goTo = (path: string): void => {
    onOpenChange(false)
    void navigate(path)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className='w-[390px] max-w-[390px] max-h-[500px] border-0 [&_h2]:!text-xl'
      title='Your identity'
      size='xl'
      showCloseButton
    >
      <div className='flex flex-col gap-4 -mx-6 overflow-y-auto'>
        <div className='flex flex-col gap-2'>
          {identities.map((identity) => (
            <IdentityOption
              key={identity}
              identity={identity}
              variant='full'
              selected={identity === currentIdentity}
              balance={balances.data?.[identity] ?? null}
              rate={rate}
              loading={balances.loading}
              error={balances.error || balances.data?.[identity] == null}
              onClick={() => {
                onSelectIdentity(identity)
                onOpenChange(false)
              }}
            />
          ))}
        </div>

        <div className='px-6 pb-2'>
          {currentWallet?.type === WalletType.keystore && (
            <Button variant='outline' size='xl' className='w-full h-[3.625rem] gap-4' onClick={() => goTo('/select-import-type')}>
              <PlusIcon />
              <div>Import identity</div>
            </Button>
          )}

          {currentWallet?.type === WalletType.seedphrase && (
            <Button variant='outline' size='xl' className='w-full h-[3.625rem] gap-4' onClick={() => goTo('/register-identity')}>
              <PlusIcon />
              <div>Register identity</div>
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
