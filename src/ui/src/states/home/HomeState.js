import React, { useEffect, useState } from 'react'
import './home.state.css'
import NoIdentities from './NoIdentities'
import { useIdentitiesStore } from '../../stores/identitiesStore'

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

  return (
    <div className={'HomeState__Container'}>
      <select className={'HomeState__Identity__Select'}>
        {identities.map((identity) => <option
          key={identity.identifier}
          value={identity.identifier}>
          {identity.identifier}
        </option>)}
      </select>
      <span className={'HomeState__Identity__Balance'}>Balance: {identity.balance}</span>

      <div className={'HomeState__Identity__Buttons'}>
        <div className={'HomeState__Identity__Buttons__Send'}>Send</div>
        <div className={'HomeState__Identity__Buttons__Withdraw'}>Withdraw</div>

      </div>

      <div className={'HomeState__Transactions'}>
        <span className={'HomeState__Transactions__Title'}>Transactions:</span>

        {transactionsLoadError &&
          <div className={'HomeState__Transactions__Error'}>Error during loading transactions, please try again
            later</div>}

        <div className={'HomeState__Transactions__Container'}>
          {transactions?.length && transactions.map((transaction) => <div key={transaction.hash}
                                                                          className={'HomeState__Transactions__Item'}>
            <a target={'_blank'}
               href={`https://testnet.platform-explorer.com/transaction/${transaction.hash}`}>{transaction.hash}</a>
          </div>)}
        </div>
      </div>
    </div>)
}
