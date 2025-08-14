import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import SelectIdentityDialog from '../../components/Identities/SelectIdentityDialog'
import { Button, Text, Identifier, NotActive, ValueCard, DateBlock, BigNumber, TransactionStatusIcon } from 'dash-ui/react'
import { TransactionTypes } from '../../../enums/TransactionTypes'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useSdk } from '../../hooks/useSdk'
import { withAccessControl } from '../../components/auth/withAccessControl'
import './home.state.css'

function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()

  const [identities, setIdentities] = useState<string[]>([])
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [balance, setBalance] = useState<bigint>(0n)
  const [transactionsLoadError, setTransactionsLoadError] = useState<boolean>(false)
  const [transactions, setTransactions] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsLoading(true)

        const availableIdentities = (await extensionAPI.getIdentities())
          .map(identity => identity.identifier)

        setIdentities(availableIdentities ?? [])

        const currentIdentityFromApi = await extensionAPI.getCurrentIdentity()

        if (currentIdentityFromApi != null && currentIdentityFromApi !== '') {
          setCurrentIdentity(currentIdentityFromApi)
        } else if ((availableIdentities?.length ?? 0) > 0) {
          setCurrentIdentity(availableIdentities[0])

          try {
            console.log('try to extensionAPI.switchIdentity', availableIdentities[0])
            await extensionAPI.switchIdentity(availableIdentities[0])
          } catch (error) {
            console.warn('Failed to set current identity:', error)
          }
        }
      } catch (error) {
        console.warn('Failed to load data:', error)
      } finally {
        console.log('finaly set isLoading false')
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    console.log('currentIdentity', currentIdentity)
    if (currentIdentity == null || currentIdentity === '') return

    const loadTransactions = async (): Promise<void> => {
      try {
        const response = await fetch(`https://testnet.platform-explorer.pshenmic.dev/identity/${currentIdentity}/transactions?order=desc`)
        console.log('Fetch response status:', response.status)
        if (response.status === 200) {
          const data = await response.json()
          if (data.error == null) {
            setTransactions(data.resultSet)
          } else {
            setTransactionsLoadError(true)
          }
        } else {
          setTransactionsLoadError(true)
        }
      } catch (fetchError) {
        console.warn('Error fetching transactions:', fetchError)
        setTransactionsLoadError(true)
      }
    }

    const loadBalance = async (): Promise<void> => {
      console.log('About to get balance...')
      const balance = await sdk.identities.getIdentityBalance(currentIdentity)
      console.log('Got balance:', balance)
      setBalance(balance)
    }

    void loadTransactions()
    void loadBalance()
  }, [currentIdentity])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  if (identities.length === 0) {
    return <NoIdentities />
  }

  console.log('currentIdentity', currentIdentity)
  console.log('identities', identities)
  console.log('identities.length', identities.length)

  return (
    <div className='screen-content'>
      {currentIdentity && (
        <SelectIdentityDialog
          identities={identities}
          currentIdentity={currentIdentity}
          onSelectIdentity={async (identity) => {
            setCurrentIdentity(identity)
            try {
              await extensionAPI.switchIdentity(identity)
            } catch (error) {
              console.warn('Failed to switch identity:', error)
            }
          }}
        >
          <div className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <Identifier avatar>
              {currentIdentity}
            </Identifier>
            
            <div className="flex items-center gap-2">
              <Identifier
                middleEllipsis
                edgeChars={6}
                className="text-sm font-medium"
              >
                {currentIdentity}
              </Identifier>
              
              <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400">
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            <div className="h-4 w-px bg-gray-300 mx-1" />
            
            <Text size="sm" className="text-gray-500">
              Main_account
            </Text>
          </div>
        </SelectIdentityDialog>
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

        {transactionsLoadError &&
          <div>
            Error during loading transactions, please try again later
          </div>}

        {transactions == null &&
          <div>
            No transactions found
          </div>}

        {/* Transactions list */}
        <div className='flex flex-col gap-3 mt-3'>
          {(transactions != null && transactions.length > 0) && transactions.map((transaction) =>
            <a
              target='_blank'
              href={`https://testnet.platform-explorer.com/transaction/${String(transaction.hash)}`}
              key={transaction.hash} rel='noreferrer'
            >
              <ValueCard clickable className='flex gap-2'>
                <TransactionStatusIcon size={16} status={transaction.status} className='shrink-0' />

                <div className='flex flex-col gap-1 justify-between grow'>
                  <Text size='sm'>{TransactionTypes[transaction.type]}</Text>
                  <DateBlock timestamp={transaction.timestamp} format='dateOnly' />
                </div>

                <div className='flex flex-col gap-1 overflow-hidden max-w-full'>
                  <Identifier
                    highlight='dim'
                    maxLines={2}
                    className='overflow-hidden max-w-full w-[8rem]'
                  >
                    {transaction.hash}
                  </Identifier>
                </div>
              </ValueCard>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(HomeState)
