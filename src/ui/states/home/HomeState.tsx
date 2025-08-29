import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import NoWallets from './NoWallets'
import SelectIdentityDialog from '../../components/Identities/SelectIdentityDialog'
import { Button, Text, Identifier, NotActive, BigNumber, ChevronIcon, ValueCard, Tabs } from 'dash-ui/react'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { usePlatformExplorerClient, type TransactionData, type NetworkType } from '../../hooks/usePlatformExplorerApi'
import { type TokenData } from '../../../types'
import { useAsyncState } from '../../hooks/useAsyncState'
import { useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types/OutletContext'
import { TransactionsList } from '../../components/transactions'
import { TokensList } from '../../components/tokens'
import { BalanceInfo } from '../../components/data'

function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformClient = usePlatformExplorerClient()
  const { selectedNetwork, selectedWallet, currentIdentity, setCurrentIdentity, allWallets } = useOutletContext<OutletContext>()
  const [identities, setIdentities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [transactionsState, loadTransactions] = useAsyncState<TransactionData[]>()
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [balanceState, loadBalance] = useAsyncState<bigint>()
  const [rateState, loadRate] = useAsyncState<number>()

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
  }, [selectedNetwork, selectedWallet, extensionAPI])

  // Load Balance and Transactions by Identity
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (currentIdentity === null || currentIdentity === '') return

      const sdkNetwork = sdk.getNetwork()
      if (selectedNetwork !== sdkNetwork) {
        return
      }

      const currentWallet = allWallets.find(wallet => wallet.walletId === selectedWallet)
      if ((currentWallet != null) && currentWallet.network !== selectedNetwork) {
        return
      }

      const storageIdentities = await extensionAPI.getIdentities()
      const currentIdentityExists = storageIdentities.some(identity => identity.identifier === currentIdentity)
      if (!currentIdentityExists) {
        return
      }

      void loadBalance(async () => {
        const balance = await sdk.identities.getIdentityBalance(currentIdentity)
        return balance
      })

      void loadTransactions(async () => {
        const result = await platformClient.fetchTransactions(currentIdentity, selectedNetwork as NetworkType, 'desc')
        if (result.data !== null && result.data !== undefined) {
          return result.data
        }
        throw new Error(result.error ?? 'Failed to load transactions')
      })

      void loadTokens(async () => {
        const result = await platformClient.fetchTokens(currentIdentity, selectedNetwork as NetworkType, 100, 1)
        if (result.data !== null && result.data !== undefined) {
          return result.data
        }
        throw new Error(result.error ?? 'Failed to load tokens')
      })
    }

    void loadData()
  }, [
    currentIdentity,
    selectedNetwork,
    selectedWallet,
    platformClient,
    sdk,
    loadBalance,
    loadTransactions,
    loadTokens,
    identities.length,
    allWallets.length
  ])

  // load rate
  useEffect(() => {
    void loadRate(async () => {
      const result = await platformClient.fetchRate(selectedNetwork as NetworkType)
      if (result.data !== null && result.data !== undefined) {
        return result.data
      }
      throw new Error(result.error ?? 'Failed to load rate')
    })
  }, [selectedNetwork, platformClient, loadRate])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  // Check if there are wallets available in the selected network
  const availableWallets = allWallets.filter(wallet => wallet.network === selectedNetwork)

  if (availableWallets.length === 0) {
    return <NoWallets />
  }

  if (identities.length === 0) {
    return <NoIdentities />
  }

  return (
    <div className='screen-content'>
      {currentIdentity !== null && currentIdentity !== '' && (
        <div className='flex items-center gap-3'>
          <SelectIdentityDialog
            identities={identities}
            currentIdentity={currentIdentity}
            onSelectIdentity={setCurrentIdentity}
            currentWallet={allWallets.find(wallet => wallet.walletId === selectedWallet) ?? null}
          >
            <div className='flex items-center gap-2 cursor-pointer'>
              <Identifier
                avatar
                ellipsis={false}
                highlight='both'
              >
                {currentIdentity}
              </Identifier>

              <div className='flex items-center gap-2'>
                <ChevronIcon direction='down' size={12} className='text-gray-800' />
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
                    <span className='text-gray-500'>...</span>
                  </Text>
                  )
                : (balanceState.error != null && balanceState.error !== '')
                    ? (
                      <Text className='!text-[2.25rem] !leading-[100%]' weight='bold' monospace>
                        <span className='text-red-500'>Error</span>
                      </Text>
                      )
                    : balanceState.data !== null && balanceState.data !== undefined && !Number.isNaN(Number(balanceState.data))
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

          <BalanceInfo balanceState={balanceState} rateState={rateState} />
        </div>
      </div>

      <div className='flex gap-2'>
        <Button className='w-1/2' disabled>Send</Button>
        <Button className='w-1/2' disabled>Withdraw</Button>
      </div>

      <ValueCard
        border={false}
        className='relative z-5  flex flex-col flex-grow gap-6 -mx-[0.875rem] -mb-[0.875rem] !rounded-b-none p-4 dash-shadow-lg'
      >
        <Tabs
          defaultValue='transactions'
          items={[
            {
              value: 'transactions',
              label: 'Transactions',
              content: (
                <TransactionsList
                  transactions={transactionsState.data ?? []}
                  loading={transactionsState.loading}
                  error={transactionsState.error}
                  rate={rateState.data}
                  selectedNetwork={selectedNetwork as NetworkType}
                  getTransactionExplorerUrl={platformClient.getTransactionExplorerUrl}
                />
              )
            },
            {
              value: 'tokens',
              label: 'Tokens',
              content: (
                <TokensList
                  tokens={tokensState.data ?? []}
                  loading={tokensState.loading}
                  error={tokensState.error}
                  selectedNetwork={selectedNetwork as NetworkType}
                />
              )
            }
          ]}
        />
      </ValueCard>
    </div>
  )
}

export default withAccessControl(HomeState, { requireWallet: false })
