import React from 'react'
import { Text, TransactionStatusIcon, Identifier, BigNumber } from 'dash-ui-kit/react'
import { TransactionData, NetworkType } from '../../../types'
import { TransactionTypesInfo, BatchActions } from '../../../enums'
import { creditsToDash } from '../../../utils'
import EntityList from '../common/EntityList'

interface TransactionsListProps {
  transactions: TransactionData[]
  loading: boolean
  error: string | null
  rate: number | null
  currentNetwork: NetworkType
  getTransactionExplorerUrl: (hash: string, network: NetworkType) => string
}

interface GroupedTransaction {
  date: string
  transactions: TransactionData[]
}

function TransactionsList ({
  transactions,
  loading,
  error,
  rate,
  currentNetwork,
  getTransactionExplorerUrl
}: TransactionsListProps): React.JSX.Element {
  const groupTransactionsByDate = (transactions: TransactionData[]): GroupedTransaction[] => {
    const groups: Record<string, TransactionData[]> = {}

    transactions.forEach(transaction => {
      const date = transaction.timestamp != null && transaction.timestamp !== ''
        ? new Date(transaction.timestamp)
        : new Date()

      const dateKey = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

      if (groups[dateKey] === undefined) {
        groups[dateKey] = []
      }
      groups[dateKey].push(transaction)
    })

    return Object.entries(groups).map(([date, transactions]) => ({
      date,
      transactions
    }))
  }

  const groupedTransactions = groupTransactionsByDate(transactions)

  return (
    <EntityList
      loading={loading}
      error={error}
      isEmpty={transactions?.length === 0 || transactions?.length === undefined}
      variant='spaced'
      loadingText='Loading transactions...'
      errorText={error != null && error !== '' ? `Error loading transactions: ${error}` : undefined}
      emptyText='No transactions found'
    >
      {groupedTransactions.map((group) => (
        <div key={group.date} className='flex flex-col gap-4'>
          <div className='flex items-center'>
            <Text weight='medium' size='sm' className='text-dash-primary-dark-blue'>
              {group.date}
            </Text>
          </div>

          <div className='flex flex-col gap-[10px]'>
            {group.transactions.map((transaction) => {
              const hash = transaction.hash ?? 'unknown'
              const { type, batchType } = transaction

              const typeDisplay = (batchType != null && batchType !== '' && batchType in BatchActions)
                ? BatchActions[batchType as keyof typeof BatchActions].title
                : batchType ?? ((type != null && type !== '' && type in TransactionTypesInfo)
                  ? TransactionTypesInfo[type as keyof typeof TransactionTypesInfo].title
                  : type ?? 'Unknown Transaction')

              const gasUsedNumber = Number(transaction.gasUsed)
              const gasAmount = Number.isNaN(gasUsedNumber) ? 0 : gasUsedNumber
              const dashAmount = gasAmount > 0 ? creditsToDash(gasAmount) : 0
              const usdAmount = rate != null && dashAmount > 0 ? dashAmount * rate : 0

              return (
                <div
                  key={hash}
                  className='flex items-center justify-between bg-[rgba(12,28,51,0.03)] rounded-[15px] p-[10px_15px] cursor-pointer hover:bg-[rgba(12,28,51,0.05)] transition-colors'
                  onClick={() => window.open(getTransactionExplorerUrl(hash, currentNetwork), '_blank')}
                >
                  <div className='flex items-center gap-3.5'>
                    <TransactionStatusIcon className='w-6 h-6 opacity-80' status={(transaction.status?.toUpperCase() ?? 'QUEUED') as 'SUCCESS' | 'FAIL' | 'QUEUED' | 'POOLED' | 'BROADCASTED'} />

                    <div className='flex flex-col gap-1'>
                      <Text weight='medium' size='sm' className='text-dash-primary-dark-blue'>
                        {typeDisplay}
                      </Text>
                      {hash !== '' && hash != null && (
                        <span className='flex items-center gap-1'>
                          <Text size='xs' className='text-gray-500'>Hash:</Text>
                          <Identifier
                            middleEllipsis
                            edgeChars={4}
                            highlight='both'
                            className='!text-[0.625rem] !font-light'
                          >
                            {hash}
                          </Identifier>
                        </span>
                      )}
                    </div>
                  </div>

                  {gasAmount > 0 && (
                    <div className='flex flex-col items-end gap-[5px]'>
                      <div className='flex items-center gap-1 text-dash-primary-dark-blue'>
                        <BigNumber className='!font-bold text-[0.875rem]'>
                          {gasAmount}
                        </BigNumber>
                        <Text size='sm'>
                          Credits
                        </Text>
                      </div>
                      <Text size='xs' className='text-[rgba(12,28,51,0.35)] opacity-50 text-right'>
                        {usdAmount > 0 && <>~ ${usdAmount.toFixed(3)}</>} (Gas)
                      </Text>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </EntityList>
  )
}

export default TransactionsList
