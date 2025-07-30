import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import { Button, Text, Select, Identifier, NotActive, ValueCard, DateBlock, BigNumber, TransactionStatusIcon } from 'dash-ui/react'
import { TransactionTypes } from '../../../enums/TransactionTypes'
import LoadingScreen from '../../components/layout/LoadingScreen'
import './home.state.css'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { withAuthCheck } from '../../components/auth/withAuthCheck'
import {Identity} from "../../../types/Identity";

function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()

  const [identities, setIdentities] = useState<string[]>([])
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null)
  const [transactionsLoadError, setTransactionsLoadError] = useState<boolean>(false)
  const [transactions, setTransactions] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsLoading(true)

        const availableIdentities = (await extensionAPI.getIdentities())
          .map(identity => identity.identifier)

        const current = await extensionAPI.getCurrentIdentity()

        if (currentIdentity == null && availableIdentities.length > 0) {
          await extensionAPI.switchIdentity(availableIdentities[0])

          setCurrentIdentity(currentIdentity)
        }

        setIdentities(availableIdentities)

        // Load transactions for current identity
        if (currentIdentity != null) {
          try {
            const response = await fetch(`https://testnet.platform-explorer.pshenmic.dev/identity/${currentIdentity.identifier}/transactions?order=desc`)
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
          } catch {
            setTransactionsLoadError(true)
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [])

  if (isLoading) {
    return <LoadingScreen message='Loading wallet data...' />
  }

  if (currentIdentity == null || identities.length === 0) {
    return <NoIdentities />
  }

  return (
    <div className='screen-content'>
      <ValueCard colorScheme='lightBlue' size='xl'>
        <div className='flex flex-col gap-4 w-full'>
          <Select
            value={identities?.[0]}
            // onChange={(e) => setCurrentIdentity(e.target.value)}
            options={identities?.map((identifier) => ({
              value: identifier,
              content: (
                <Identifier
                  middleEllipsis={true}
                  edgeChars={6}
                  avatar={true}
                >
                  {identifier}
                </Identifier>
              )
            }))}
            border={true}
            showArrow
            size='md'
          />

          <div className='flex flex-col gap-[0.125rem]'>
            <Text dim>Balance</Text>
            <span>
                (
                  <Text size='xl' weight='bold' monospace>
                    <BigNumber>
                      {currentIdentity.balance.toString()}
                    </BigNumber>
                  </Text>
                  )
              <Text
                size='lg'
                className='ml-2'
              >
                Credits
              </Text>
            </span>
          </div>
        </div>
      </ValueCard>

      <div className='flex gap-5'>
        <Button className='w-1/2' disabled>Send</Button>
        <Button colorScheme='gray' variant='outline' className='w-1/2' disabled>Withdraw</Button>
      </div>

      <div>
        <Text size='lg' weight='bold'>Transactions:</Text>

        {transactionsLoadError &&
          <div>
            Error during loading transactions, please try again later
          </div>}

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

export default withAuthCheck(HomeState)
