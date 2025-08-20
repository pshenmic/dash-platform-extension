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
import { creditsToDash } from '../../../utils'
import './home.state.css'

interface OutletContext {
  selectedNetwork: string | null
  selectedWallet: string | null
  currentIdentity: string | null
  setCurrentIdentity: (identity: string | null) => void
}

function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformClient = usePlatformExplorerClient()
  const { selectedNetwork, selectedWallet, currentIdentity, setCurrentIdentity } = useOutletContext<OutletContext>()
  const [identities, setIdentities] = useState<string[]>([])
  const [balance, setBalance] = useState<bigint>(0n)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Unified state for transactions
  const [transactionsState, setTransactionsState] = useState<ApiState<TransactionData[]>>({
    data: null,
    loading: false,
    error: null
  })

  const [rateState, setRateState] = useState<ApiState<number>>({
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

        // Set identities
        const availableIdentities = identitiesData.map(identity => identity.identifier)
        setIdentities(availableIdentities ?? [])
      } catch (error) {
        console.warn('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadIdentities()
  }, [selectedWallet, extensionAPI])

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

  useEffect(() => {
    const loadRate = async (): Promise<void> => {
      setRateState({ data: null, loading: true, error: null })
      try {
        const result = await platformClient.fetchRate(selectedNetwork as NetworkType)
        console.log('result', result)
        setRateState(result)
      } catch (error) {
        setRateState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load rate'
        })
      }
    }

    void loadRate()
  }, [selectedNetwork, platformClient])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  if (identities.length === 0) {
    return <NoIdentities />
  }

  return (
    <div className='screen-content'>
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
                middleEllipsis
                edgeChars={6}
                avatar
                ellipsis={true}
              >
                {currentIdentity}
              </Identifier>

              <div className='flex items-center gap-2'>
                <ChevronIcon direction='down' size={12} className='text-gray-800'/>
              </div>
            </div>
          </SelectIdentityDialog>
        </div>
      )}

      <div className='flex flex-col gap-4 w-full'>
        <div className='flex flex-col gap-[0.625rem]'>
          <div className='flex flex-col'>
            <Text className='!text-[2.25rem] text-dash-primary-dark-blue !leading-[100%]'>
              Balance:
            </Text>
            <span>
              {!Number.isNaN(Number(balance))
                ? (
                  <Text className='!text-[2.25rem] !leading-[100%]' weight='bold' monospace>
                    <BigNumber className='!text-dash-brand gap-2'>
                      {balance.toString()}
                    </BigNumber>
                  </Text>
                )
                : <NotActive>N/A</NotActive>}
            </span>
          </div>

          {!Number.isNaN(Number(balance)) && (
            <div className='flex items-center gap-2.5 bg-[rgba(76,126,255,0.1)] rounded-[5px] px-2 py-1.5 w-fit'>
              <Text className='!text-dash-brand font-medium text-sm'>
                {rateState.loading && '~ ... USD'}
                {!rateState.loading && rateState.error && '~ - USD'}
                {!rateState.loading && !rateState.error && rateState.data == null && '~ - USD'}
                {!rateState.loading && !rateState.error && rateState.data != null && rateState.data > 0 && (() => {
                  const dashAmount = creditsToDash(balance)
                  const usdAmount = dashAmount * rateState.data
                  return `~ $${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                })()}
                {!rateState.loading && !rateState.error && rateState.data != null && rateState.data <= 0 && '~ - USD'}
              </Text>
              
              <div className='w-px h-4 bg-[rgba(76,126,255,0.25)]'></div>
              
              <Text className='!text-dash-brand  font-medium text-sm'>
                {(() => {
                  const dashAmount = creditsToDash(balance)
                  return `${dashAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Dash`
                })()}
              </Text>
            </div>
          )}
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
