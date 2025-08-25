import React from 'react'
import { Dialog, Button, Identifier, Text, BigNumber, Avatar } from 'dash-ui/react'
import { usePlatformExplorerClient, type IdentityApiData, type NetworkType, type ApiState } from '../../hooks/usePlatformExplorerApi'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

interface SelectIdentityDialogProps {
  identities: string[]
  currentIdentity: string | null
  onSelectIdentity: (identity: string) => void
  children: React.ReactNode
}

function SelectIdentityDialog ({ identities, currentIdentity, onSelectIdentity, children }: SelectIdentityDialogProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false)
  const platformClient = usePlatformExplorerClient()
  const extensionAPI = useExtensionAPI()

  // Unified state for multiple identities data
  const [identitiesState, setIdentitiesState] = React.useState<ApiState<Record<string, IdentityApiData>>>({
    data: null,
    loading: false,
    error: null
  })
  const [currentNetwork, setCurrentNetwork] = React.useState<NetworkType>('testnet')

  React.useEffect(() => {
    if (open && identities.length > 0) {
      const fetchIdentitiesData = async () => {
        setIdentitiesState({ data: null, loading: true, error: null })

        try {
          // Get current network first
          const status = await extensionAPI.getStatus()
          const network = status.network as NetworkType
          setCurrentNetwork(network)

          // Then fetch identities data
          const result = await platformClient.fetchMultipleIdentities(identities, network)

          console.log('data', result)
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
                      ? (
                          'Loading...'
                        )
                      : identitiesState.error
                        ? (
                            'Error'
                          )
                        : (
                          <>
                            <BigNumber>{identitiesState.data?.[identity]?.balance || '0'}</BigNumber> Credits
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
        </div>
      </Dialog>
    </>
  )
}

export default SelectIdentityDialog
