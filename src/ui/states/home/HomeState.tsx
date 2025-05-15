import React, { useEffect, useState } from 'react'
import NoIdentities from './NoIdentities'
import { useIdentitiesStore } from '../../../stores/identitiesStore'
import { Button } from '../../components/controls/buttons'
import ValueCard from '../../components/containers/ValueCard'
import Text from '../../text/Text'
import BigNumber from '../../components/data/BigNumber'
import { NotActive } from '../../components/data/NotActive'
import Identifier from "../../components/data/Indetifier";
import StatusIcon from "../../components/icons/StatusIcon";
import { TransactionTypes } from '../../../enums/TransactionTypes'
import DateBlock from "../../components/data/DateBlock";
import './home.state.css'

export default function () {
  const currentIdentity = useIdentitiesStore((state) => state.currentIdentity)
  const identities = useIdentitiesStore((state) => state.identities)
  const [transactionsLoadError, setTransactionsLoadError] = useState(null)
  const [transactions, setTransactions] = useState(null)

  if (!identities?.length) {
    return <NoIdentities/>
  }

  const [identity] = identities.filter(identity => identity.identifier === currentIdentity)

  useEffect(() => {
    fetch(`https://testnet.platform-explorer.pshenmic.dev/identity/${currentIdentity}/transactions`)
      .then(response => {
          if (response.status === 200) {
            return response.json()
          } else {
            setTransactionsLoadError(true)
          }
        }
      )
      .then((data) => {
        if (data.error) {
          setTransactionsLoadError(true)
        }

        setTransactions(data.resultSet)
      })
      .catch(() => setTransactionsLoadError(true))
  }, [])

  console.log('transactions', transactions)

  return (
    <div className={'flex flex-col gap-4'}>
      <ValueCard colorScheme={'lightBlue'}>
        <div className={'flex flex-col gap-1'}>
          <select className={'HomeState__Identity__Select'}>
            {identities.map((identity) => <option
              key={identity.identifier}
              value={identity.identifier}>
              {identity.identifier}
            </option>)}
          </select>

          <div className={'flex flex-col gap-[0.125rem]'}>
            <Text dim>Balance</Text>
            <span>
              {!Number.isNaN(Number(identity?.balance))
                ? <Text size={'xl'} weight={'bold'} monospace>
                  <BigNumber>
                    {identity.balance}
                  </BigNumber>
                </Text>
                : <NotActive>N/A</NotActive>
              }
              <Text
                size={'lg'}
                className={'ml-2'}
              >
                Credits
              </Text>
            </span>
          </div>
        </div>
      </ValueCard>

      <div className={'flex gap-2'}>
        <Button className={'w-1/2'} disabled>Send</Button>
        <Button color={'gray'} variant={'outline'} className={'w-1/2'} disabled>Withdraw</Button>
      </div>

      <div>
        <Text size={'lg'} weight={'bold'}>Transactions:</Text>

        {transactionsLoadError &&
          <div>
            Error during loading transactions, please try again later
          </div>
        }

        <div className={'HomeState__Transactions__Container'}>
          {transactions?.length && transactions.map((transaction) =>
            <div key={transaction.hash} className={'HomeState__Transactions__Item'}>
              <a
                target={'_blank'}
                href={`https://testnet.platform-explorer.com/transaction/${transaction.hash}`}
              >
                <ValueCard clickable className={'flex gap-2'}>
                  <StatusIcon size={16} status={transaction.status} className={'shrink-0'}/>

                  <div className={'flex flex-col gap-1 justify-between grow'}>
                    <Text size={'sm'}>{TransactionTypes[transaction.type]}</Text>
                    <DateBlock timestamp={transaction.timestamp} format={'dateOnly'}/>
                  </div>

                  <div className={'flex flex-col gap-1 overflow-hidden max-w-full'}>
                    <Identifier
                      highlight={'both'}
                      // ellipsis
                      className={'overflow-hidden max-w-full'}
                    >
                    {transaction.hash}
                    </Identifier>
                  </div>
                </ValueCard>
              </a>
            </div>)}
        </div>
      </div>
    </div>)
}
