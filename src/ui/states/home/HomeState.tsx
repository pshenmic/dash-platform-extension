import React, { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import NoIdentities from './NoIdentities'
import NoWallets from './NoWallets'
import SelectIdentityDialog from '../../components/Identities/SelectIdentityDialog'
import { Button, Text, Identifier, NotActive, BigNumber, ChevronIcon, ValueCard, Tabs } from 'dash-ui-kit/react'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { useExtensionAPI, useAsyncState, useSdk } from '../../hooks'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { usePlatformExplorerClient, type TransactionData, type NetworkType } from '../../hooks/usePlatformExplorerApi'
import { type TokenData } from '../../../types'
import type { OutletContext } from '../../types/OutletContext'
import { TransactionsList } from '../../components/transactions'
import { TokensList } from '../../components/tokens'
import { NamesList, type NameData } from '../../components/names'
import { BalanceInfo } from '../../components/data'
import { fetchNames } from '../../../utils'

function HomeState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentWallet, currentIdentity, setCurrentIdentity, allWallets } = useOutletContext<OutletContext>()
  const [identities, setIdentities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [transactionsState, loadTransactions] = useAsyncState<TransactionData[]>()
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [namesState, loadNames] = useAsyncState<NameData[]>()
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
        console.log('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadIdentities()
      .catch(e => console.log('loadIdentities error', e))
  }, [currentNetwork, currentWallet, extensionAPI])

  // Load Balance and Transactions by Identity
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (currentIdentity === null) return

      const sdkNetwork = sdk.getNetwork()
      if (currentNetwork !== sdkNetwork) {
        return
      }

      const currentWalletInfo = allWallets.find(wallet => wallet.walletId === currentWallet)
      if ((currentWalletInfo != null) && currentWalletInfo.network !== currentNetwork) {
        return
      }

      const storageIdentities = await extensionAPI.getIdentities()
      const currentIdentityExists = storageIdentities.some(identity => identity.identifier === currentIdentity)
      if (!currentIdentityExists) {
        return
      }

      loadBalance(async () => {
        return await sdk.identities.getIdentityBalance(currentIdentity)
      }).catch(e => console.log('loadBalance error', e))

      loadTransactions(async () => {
        return await platformExplorerClient.fetchTransactions(currentIdentity, currentNetwork as NetworkType, 'desc')
      }).catch(e => console.log('loadTransactions error', e))

      loadTokens(async () => {
        return await platformExplorerClient.fetchTokens(currentIdentity, currentNetwork as NetworkType, 100, 1)
      }).catch(e => console.log('loadTokens error:', e))

      loadNames(async () => {
        return await fetchNames(sdk, platformExplorerClient, currentIdentity, currentNetwork as NetworkType)
      }).catch(e => console.log('loadNames error:', e))
    }

    loadData().catch(e => console.log('loadData error:', e))
  }, [
    currentIdentity,
    currentNetwork,
    currentWallet,
    platformExplorerClient,
    sdk,
    loadBalance,
    loadTransactions,
    loadTokens,
    loadNames,
    identities.length,
    allWallets.length
  ])

  // load rate
  useEffect(() => {
    loadRate(async () => {
      return await platformExplorerClient.fetchRate(currentNetwork as NetworkType)
    }).catch(e => console.log('loadRate error:', e))
  }, [currentNetwork, platformExplorerClient, loadRate])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  // Check if there are wallets available in the current network
  const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)

  if (availableWallets.length === 0) {
    return <NoWallets />
  }

  if (identities.length === 0) {
    const currentWalletInfo = allWallets.find(wallet => wallet.walletId === currentWallet)
    return <NoIdentities walletType={currentWalletInfo?.type} />
  }

  return (
    <div className='screen-content'>
      {currentIdentity !== null && (
        <div className='flex items-center gap-3'>
          <SelectIdentityDialog
            identities={identities}
            currentIdentity={currentIdentity}
            onSelectIdentity={setCurrentIdentity}
            currentWallet={allWallets.find(wallet => wallet.walletId === currentWallet) ?? null}
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
                <ChevronIcon size={12} className='text-gray-800' />
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
        <Button
          className='w-1/2'
          colorScheme='brand'
          onClick={() => { void navigate('/send-transaction') }}
          disabled={currentIdentity === null || balanceState.data === null}
        >
          Send
        </Button>
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
                  currentNetwork={currentNetwork as NetworkType}
                  getTransactionExplorerUrl={platformExplorerClient.getTransactionExplorerUrl}
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
                  currentNetwork={currentNetwork as NetworkType}
                />
              )
            },
            {
              value: 'names',
              label: 'Names',
              content: (
                <NamesList
                  names={namesState.data ?? []}
                  loading={namesState.loading}
                  error={namesState.error}
                  currentNetwork={currentNetwork as NetworkType}
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
