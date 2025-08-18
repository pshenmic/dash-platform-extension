import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import SelectIdentityDialog from '../../components/Identities/SelectIdentityDialog'
import { Button, Text, Identifier, NotActive, ValueCard, DateBlock, BigNumber, TransactionStatusIcon, ChevronIcon } from 'dash-ui/react'
import { TransactionTypes } from '../../../enums/TransactionTypes'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { usePlatformExplorerClient, type TransactionData, type NetworkType, type ApiState } from '../../hooks/usePlatformExplorerApi'
import { useOutletContext } from 'react-router-dom'
import './home.state.css'

interface OutletContext {
  selectedNetwork: string | null
  selectedWallet: string | null
}

function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformClient = usePlatformExplorerClient()
  const { selectedNetwork, selectedWallet } = useOutletContext<OutletContext>()
  const [identities, setIdentities] = useState<string[]>([])
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint>(0n)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Unified state for transactions
  const [transactionsState, setTransactionsState] = useState<ApiState<TransactionData[]>>({
    data: null,
    loading: false,
    error: null
  })

  // load identities
  useEffect(() => {
    const loadIdentities = async (): Promise<void> => {
      try {
        setIsLoading(true)

        // Load identities
        const identitiesData = await extensionAPI.getIdentities()
        const currentIdentityFromApi = await extensionAPI.getCurrentIdentity()

        // Set identities
        const availableIdentities = identitiesData.map(identity => identity.identifier)
        setIdentities(availableIdentities ?? [])

        // sett current Identity if it doesnt set
        if (currentIdentityFromApi != null && currentIdentityFromApi !== '') {
          setCurrentIdentity(currentIdentityFromApi)
        } else if ((availableIdentities?.length ?? 0) > 0) {
          setCurrentIdentity(availableIdentities[0])
          await extensionAPI.switchIdentity(availableIdentities[0]).catch(error => {
            console.warn('Failed to set current identity:', error)
          })
        }
      } catch (error) {
        console.warn('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadIdentities()
  }, [selectedWallet])

  // Load Balance and Transactions by Identity
  useEffect(() => {
    if (currentIdentity == null || currentIdentity === '') return

    const loadBalance = async (): Promise<void> => {
      try {
        const balance = await sdk.identities.getIdentityBalance(currentIdentity)
        setBalance(balance)
      } catch (error) {
        console.warn('Failed to load balance:', error)
        setBalance(0n) // Set default value on error
      }
    }

    const loadTransactions = async (): Promise<void> => {
      setTransactionsState({ data: null, loading: true, error: null })

      try {
        const result = await platformClient.fetchTransactions(currentIdentity, selectedNetwork as NetworkType, 'desc')
        setTransactionsState(result)
      } catch (error) {
        console.warn('Failed to load transactions:', error)
        setTransactionsState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load transactions'
        })
      }
    }

    void loadBalance()
    void loadTransactions()
  }, [currentIdentity, selectedNetwork, selectedWallet, platformClient, sdk])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  if (identities.length === 0) {
    return <NoIdentities />
  }

  return (
    <div className='screen-content'>
      <code>
        debug<br/>
        network: {selectedNetwork}<br/>
        wallet: {selectedWallet}
      </code>

      {currentIdentity && (
        <div className='flex items-center gap-3'>
          <SelectIdentityDialog
            identities={identities}
            currentIdentity={currentIdentity}
            onSelectIdentity={async (identity) => {
              setCurrentIdentity(identity)
              await extensionAPI.switchIdentity(identity).catch(error => {
                console.warn('Failed to switch identity:', error)
              })
            }}
          >
            <div className='flex items-center gap-2 cursor-pointer'>
              <Identifier
                avatar
                // edgeChars={4}
                // middleEllipsis
                ellipsis={true}
              >
                {currentIdentity}
              </Identifier>

              <div className='flex items-center gap-2'>
                <ChevronIcon direction='down' size={12} className='text-gray-400'/>
              </div>
            </div>
          </SelectIdentityDialog>
        </div>
      )}

      <div className='flex flex-col gap-4 w-full'>
        <div className='flex flex-col gap-[0.125rem]'>
          <Text dim>Balance</Text>
          <span>
            {!Number.isNaN(Number(balance))
              ? (
                <Text size='xl' weight='bold' monospace>
                  <BigNumber>
                    {balance.toString()}
                  </BigNumber>
                </Text>
              )
              : <NotActive>N/A</NotActive>}
            <Text
              size='lg'
              className='ml-2'
            >
              Credits
            </Text>
          </span>
        </div>
      </div>

      <div className='flex gap-2'>
        <Button className='w-1/2' disabled>Send</Button>
        <Button className='w-1/2' disabled>Withdraw</Button>
      </div>

      <div>
        <Text size='lg' weight='bold'>Transactions:</Text>

        {transactionsState.loading &&
          <div>
            Loading transactions...
          </div>}

        {transactionsState.error &&
          <div>
            Error during loading transactions: {transactionsState.error}
          </div>}

        {!transactionsState.loading && !transactionsState.error && (!transactionsState.data || transactionsState.data.length === 0) &&
          <div>
            No transactions found
          </div>}

        {/* Transactions list */}
        <div className='flex flex-col gap-3 mt-3'>
          {transactionsState.data && transactionsState.data.length > 0 && transactionsState.data.map((transaction: TransactionData) => {
            // Handle nullable fields safely
            const hash = transaction.hash ?? 'unknown'
            const status = transaction.status ?? 'unknown'
            const type = transaction.type ?? 'unknown'
            const timestamp = transaction.timestamp ? parseInt(transaction.timestamp, 10) : Date.now() / 1000

            return (
              <a
                target='_blank'
                href={platformClient.getTransactionExplorerUrl(hash, selectedNetwork as NetworkType)}
                key={hash} rel='noreferrer'
              >
                <ValueCard clickable className='flex gap-2'>
                  <TransactionStatusIcon size={16} status={status} className='shrink-0'/>

                  <div className='flex flex-col gap-1 justify-between grow'>
                    <Text size='sm'>{TransactionTypes[type as keyof typeof TransactionTypes] ?? type}</Text>
                    <DateBlock timestamp={timestamp} format='dateOnly'/>
                  </div>

                  <div className='flex flex-col gap-1 overflow-hidden max-w-full'>
                    <Identifier
                      highlight='dim'
                      maxLines={2}
                      className='overflow-hidden max-w-full w-[8rem]'
                    >
                      {hash}
                    </Identifier>
                  </div>
                </ValueCard>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(HomeState)
