import React, { useEffect, useState } from 'react'
import { Button, Dialog, PlusIcon } from 'dash-ui-kit/react'
import { type ApiState, WalletType } from '../../../types'
import { useSdk } from '../../hooks'
import { useNavigate } from 'react-router-dom'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'
import { IdentityOption } from '../identity'

interface SelectIdentityDialogProps {
  identities: string[]
  currentIdentity: string | null
  onSelectIdentity: (identity: string) => void
  currentWallet?: WalletAccountInfo | null
  children: React.ReactNode
}

function SelectIdentityDialog ({ identities, currentIdentity, onSelectIdentity, currentWallet, children }: SelectIdentityDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const sdk = useSdk()
  const navigate = useNavigate()

  const [balancesState, setBalancesState] = useState<ApiState<Record<string, bigint>>>({
    data: null,
    loading: false,
    error: null
  })

  useEffect(() => {
    if (open && identities.length > 0) {
      const fetchIdentitiesData = async (): Promise<void> => {
        setBalancesState({ data: null, loading: true, error: null })

        try {
          const balanceEntries = await Promise.all(
            identities.map(async (identity) => [
              identity,
              await sdk.identities.getIdentityBalance(identity)
            ] as const)
          )

          setBalancesState({ data: Object.fromEntries(balanceEntries), loading: false, error: null })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setBalancesState({ data: null, loading: false, error: errorMessage })
        }
      }

      void fetchIdentitiesData()
    }
  }, [open, identities, sdk])

  const handleSelectIdentity = (identity: string): void => {
    onSelectIdentity(identity)
    setOpen(false)
  }

  return (
    <>
      <div className='w-full' onClick={() => setOpen(true)}>
        {children}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        className='w-[390px] max-w-[390px] max-h-[500px] border-0'
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
                balance={balancesState.data?.[identity] ?? null}
                loading={balancesState.loading}
                error={(balancesState.error !== null && balancesState.error !== '') || balancesState.data?.[identity] == null}
                onClick={() => {
                  handleSelectIdentity(identity)
                }}
              />
            ))}
          </div>

          {currentWallet?.type === WalletType.keystore && (
            <div className='px-6 pb-2'>
              <Button
                variant='outline'
                size='md'
                className='w-full h-[3.625rem] gap-4'
                onClick={() => {
                  setOpen(false)
                  void navigate('/select-import-type')
                }}
              >
                <PlusIcon />
                <div>Add an identity</div>
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </>
  )
}

export default SelectIdentityDialog
