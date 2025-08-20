import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import SelectIdentityDialog from '../../components/Identities/SelectIdentityDialog'
import { Button, Text, Identifier, NotActive, BigNumber, ChevronIcon, ValueCard } from 'dash-ui/react'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { usePlatformExplorerClient, type TransactionData, type NetworkType } from '../../hooks/usePlatformExplorerApi'
import { useAsyncState } from '../../hooks/useAsyncState'
import { useOutletContext } from 'react-router-dom'
import { creditsToDash } from '../../../utils'
import { TransactionsList } from '../../components/transactions'
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
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [transactionsState, loadTransactions] = useAsyncState<TransactionData[]>()
  const [balanceState, loadBalance] = useAsyncState<bigint>()
  const [rateState, loadRate] = useAsyncState<number>()

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

    void loadBalance(async () => {
      const balance = await sdk.identities.getIdentityBalance(currentIdentity)
      return balance
    })

    void loadTransactions(async () => {
      const result = await platformClient.fetchTransactions(currentIdentity, selectedNetwork as NetworkType, 'desc')
      if (result.data) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load transactions')
    })
  }, [currentIdentity, selectedNetwork, selectedWallet, platformClient, sdk, loadBalance, loadTransactions])

  useEffect(() => {
    void loadRate(async () => {
      const result = await platformClient.fetchRate(selectedNetwork as NetworkType)
      if (result.data != null) {
        return result.data
      }
      throw new Error(result.error || 'Failed to load rate')
    })
  }, [selectedNetwork, platformClient, loadRate])

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
              {balanceState.loading
                ? (
                  <Text className='!text-[2.25rem] !leading-[100%]' weight='bold' monospace>
                    <span className='text-gray-500'>Loading...</span>
                  </Text>
                )
                : balanceState.error
                ? (
                  <Text className='!text-[2.25rem] !leading-[100%]' weight='bold' monospace>
                    <span className='text-red-500'>Error</span>
                  </Text>
                )
                : balanceState.data != null && !Number.isNaN(Number(balanceState.data))
                ? (
                  <Text className='!text-[2.25rem] !leading-[100%]' weight='bold' monospace>
                    <BigNumber className='!text-dash-brand gap-2'>
                      {balanceState.data.toString()}
                    </BigNumber>
                  </Text>
                )
                : <NotActive>N/A</NotActive>}
            </span>
          </div>

          {(balanceState.loading || (balanceState.data != null && !Number.isNaN(Number(balanceState.data)))) && (
            <div className='flex items-center gap-2.5 bg-[rgba(76,126,255,0.1)] rounded-[5px] px-2 py-1.5 w-fit'>
              <Text className='!text-dash-brand font-medium text-sm'>
                {balanceState.loading && '~ Loading...'}
                {!balanceState.loading && balanceState.error && '~ Error'}
                {!balanceState.loading && !balanceState.error && rateState.loading && '~ ... USD'}
                {!balanceState.loading && !balanceState.error && !rateState.loading && rateState.error && '~ - USD'}
                {!balanceState.loading && !balanceState.error && !rateState.loading && !rateState.error && rateState.data == null && '~ - USD'}
                {!balanceState.loading && !balanceState.error && !rateState.loading && !rateState.error && rateState.data != null && rateState.data > 0 && balanceState.data != null && (() => {
                  const dashAmount = creditsToDash(balanceState.data)
                  const usdAmount = dashAmount * rateState.data
                  return `~ $${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                })()}
                {!balanceState.loading && !balanceState.error && !rateState.loading && !rateState.error && rateState.data != null && rateState.data <= 0 && '~ - USD'}
              </Text>
              
              <div className='w-px h-4 bg-[rgba(76,126,255,0.25)]'></div>
              
              <Text className='!text-dash-brand  font-medium text-sm'>
                {balanceState.loading 
                  ? 'Loading...'
                  : balanceState.error
                  ? 'Error'
                  : balanceState.data != null && (() => {
                    const dashAmount = creditsToDash(balanceState.data)
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

      <ValueCard className='-mx-[0.875rem] -mb-[0.875rem] !rounded-b-none'>
        <TransactionsList
          transactions={transactionsState.data || []}
          loading={transactionsState.loading}
          error={transactionsState.error}
          rate={rateState.data}
          selectedNetwork={selectedNetwork as NetworkType}
          getTransactionExplorerUrl={platformClient.getTransactionExplorerUrl}
        />
      </ValueCard>
    </div>
  )
}

export default withAccessControl(HomeState)
