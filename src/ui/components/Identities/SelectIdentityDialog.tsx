import React, { useEffect, useState } from 'react'
import { Dialog, Identifier, Text, BigNumber, Avatar, Button, PlusIcon } from 'dash-ui-kit/react'
import { usePlatformExplorerClient, type IdentityApiData, type NetworkType, type ApiState } from '../../hooks/usePlatformExplorerApi'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useNavigate } from 'react-router-dom'
import { WalletType } from '../../../types'
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
  const platformClient = usePlatformExplorerClient()
  const extensionAPI = useExtensionAPI()
  const navigate = useNavigate()

  const [identitiesState, setIdentitiesState] = useState<ApiState<Record<string, IdentityApiData>>>({
    data: null,
    loading: false,
    error: null
  })

  useEffect(() => {
    if (open && identities.length > 0) {
      const fetchIdentitiesData = async (): Promise<void> => {
        setIdentitiesState({ data: null, loading: true, error: null })

        try {
          const status = await extensionAPI.getStatus()
          const network = status.network as NetworkType
          const result = await platformClient.fetchMultipleIdentities(identities, network)
          setIdentitiesState(result)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setIdentitiesState({ data: null, loading: false, error: errorMessage })
        }
      }

      void fetchIdentitiesData()
    }
  }, [open, identities, platformClient, extensionAPI])

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
                    {identitiesState.loading
                      ? 'Loading...'
                      : identitiesState.error !== null && identitiesState.error !== ''
                        ? 'Error'
                        : (
                          <>
                            <BigNumber>{identitiesState.data?.[identity]?.balance ?? '0'}</BigNumber> Credits
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
