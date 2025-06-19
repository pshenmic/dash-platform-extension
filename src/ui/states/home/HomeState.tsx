import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import { Button } from '../../components/controls/buttons'
import ValueCard from '../../components/containers/ValueCard'
import Text from '../../text/Text'
import BigNumber from '../../components/data/BigNumber'
import { NotActive } from '../../components/data/NotActive'
import Identifier from '../../components/data/Identifier'
import StatusIcon from '../../components/icons/StatusIcon'
import { TransactionTypes } from '../../../enums/TransactionTypes'
import DateBlock from '../../components/data/DateBlock'
import './home.state.css'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
// import { Identity } from '../../../types/Identity'
// import { IdentifierWASM } from 'pshenmic-dpp'

export default function HomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const [identities, setIdentities] = useState<string[]>([])
  const [currentIdentity, setCurrentIdentity] = useState<string | null>(null)
  const [transactionsLoadError, setTransactionsLoadError] = useState<boolean>(false)
  const [transactions, setTransactions] = useState<any[] | null>(null)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        // Load all identities and current identity
        const [availableIdentities, current] = await Promise.all([
          extensionAPI.getAvailableIdentities(),
          extensionAPI.getCurrentIdentity()
        ])

        setIdentities(availableIdentities)
        setCurrentIdentity(current)

        console.log('availableIdentities', availableIdentities)
        console.log('current', current)

        // Auto-set first identity as current if no current identity is set
        if ((current == null || current === '') && availableIdentities.length > 0) {
          console.log('Setting first identity as current:', availableIdentities[0])
          try {
            await extensionAPI.switchIdentity(availableIdentities[0])
            setCurrentIdentity(availableIdentities[0])
          } catch (error) {
            console.error('Failed to set current identity:', error)
          }
        }

        // Load transactions for current identity (use updated currentIdentity)
        const activeIdentity = (currentIdentity != null && currentIdentity !== '') ? currentIdentity : current
        if (activeIdentity != null && activeIdentity !== '') {
          try {
            const response = await fetch(`https://testnet.platform-explorer.pshenmic.dev/identity/${activeIdentity}/transactions`)
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
      }
    }

    void loadData()
  }, [])

  if (identities.length === 0) {
    return <NoIdentities />
  }

  // TODO implement retrieving balance
  const balance = 0

  return (
    <div className='screen-content'>
      <ValueCard colorScheme='lightBlue'>
        <div className='flex flex-col gap-1'>
          <select>
            {identities.map((identifier) =>
              <option
                key={identifier}
                value={identifier}
              >
                {identifier}
              </option>)}
          </select>

          <div className='flex flex-col gap-[0.125rem]'>
            <Text dim>Balance</Text>
            <span>
              {!Number.isNaN(Number(balance))
                ? (
                  <Text size='xl' weight='bold' monospace>
                    <BigNumber>
                      {balance}
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
                <StatusIcon size={16} status={transaction.status} className='shrink-0' />

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
