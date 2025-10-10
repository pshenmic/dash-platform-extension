import React, { useEffect, useState } from 'react'
import { Avatar, BigNumber, Button, Dialog, Identifier, PlusIcon, Text, NotActive } from 'dash-ui-kit/react'
import { type ApiState, WalletType } from '../../../types'
import { useSdk } from '../../hooks'
import { useNavigate } from 'react-router-dom'
import { WalletAccountInfo } from '../../../types/messages/response/GetAllWalletsResponse'

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
        <div className='flex flex-col gap-4 -mx-6'>
          <div className='flex flex-col gap-2'>
            {identities.map((identity) => (
              <div
                key={identity}
                className={`flex items-center gap-3 p-3 border-dash-brand cursor-pointer hover:bg-gray-50 ${
                  identity === currentIdentity ? 'bg-gray-100 border-l-2' : ''
                }`}
                onClick={() => {
                  handleSelectIdentity(identity)
                }}
              >
                <div className='w-10 h-10'>
                  <Avatar username={identity} />
                </div>

                <div className='flex flex-1 items-center gap-2'>
                  <Identifier
                    highlight='both'
                    className='text-sm font-light'
                    copyButton
                  >
                    {identity}
                  </Identifier>
                </div>

                <div className='flex flex-col items-end gap-1 text-right shrink-0'>
                  <Text weight='semibold' size='sm'>
                    {balancesState.loading
                      ? 'Loading...'
                      : (
                        <>
                          {((balancesState.error !== null && balancesState.error !== '') || balancesState.data?.[identity] == null)
                            ? <NotActive>n/a</NotActive>
                            : <BigNumber>{balancesState.data[identity].toString()}</BigNumber>}
                          Credits
                        </>
                        )}
                  </Text>
                  <Text size='xs' className='text-gray-500'>
                    ~ $0.00
                  </Text>
                </div>
              </div>
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
                  void navigate('/import-keystore')
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
