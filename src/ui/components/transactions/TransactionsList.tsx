import React from 'react'
import { Text, TransactionStatusIcon, Identifier, Button } from 'dash-ui/react'
import { TransactionData, NetworkType } from '../../hooks/usePlatformExplorerApi'
import { TransactionTypesInfo, BatchActions } from '../../../enums'
import { creditsToDash } from '../../../utils'

interface TransactionsListProps {
  transactions: TransactionData[]
  loading: boolean
  error: string | null
  rate: number | null
  selectedNetwork: NetworkType
  getTransactionExplorerUrl: (hash: string, network: NetworkType) => string
}

interface GroupedTransaction {
  date: string
  transactions: TransactionData[]
}

function TransactionsList({ 
  transactions, 
  loading, 
  error, 
  rate, 
  selectedNetwork, 
  getTransactionExplorerUrl 
}: TransactionsListProps): React.JSX.Element {
  const groupTransactionsByDate = (transactions: TransactionData[]): GroupedTransaction[] => {
    const groups: Record<string, TransactionData[]> = {}
    
    transactions.forEach(transaction => {
      let date: Date
      if (transaction.timestamp) {
        // Check if timestamp is ISO string or numeric
        if (typeof transaction.timestamp === 'string' && transaction.timestamp.includes('T')) {
          date = new Date(transaction.timestamp)
        } else {
          // Numeric timestamp (seconds or milliseconds)
          const numericTimestamp = parseInt(transaction.timestamp, 10)
          // If less than a certain threshold, assume it's in seconds, otherwise milliseconds
          date = new Date(numericTimestamp < 1e12 ? numericTimestamp * 1000 : numericTimestamp)
        }
      } else {
        date = new Date()
      }
      
      const dateKey = date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(transaction)
    })
    
    return Object.entries(groups).map(([date, transactions]) => ({
      date,
      transactions
        }))
  }

  const getTransactionTypeDisplay = (transaction: TransactionData): string => {
    const { type, batchType } = transaction
    
    // If batchType exists, use it instead of type
    if (batchType) {
      if (batchType in BatchActions) {
        return BatchActions[batchType as keyof typeof BatchActions].title
      }
      return batchType // fallback to raw batchType if not found in BatchActions
    }
    
    // If no batchType, use regular type
    if (type && type in TransactionTypesInfo) {
      return TransactionTypesInfo[type as keyof typeof TransactionTypesInfo].title
    }
    
    return type || 'Unknown Transaction'
  }

  const getTransactionSubtext = (transaction: TransactionData): string => {
    const hash = transaction.hash ?? 'unknown'
    
    // For transfers, we would need additional data to show From/To
    // For now, showing hash as fallback
    if (transaction.type === 'IDENTITY_CREDIT_TRANSFER') {
      return `Hash: ${hash.substring(0, 5)}...${hash.substring(hash.length - 4)}`
    }
    
    return `Hash: ${hash.substring(0, 5)}...${hash.substring(hash.length - 4)}`
  }

  const formatAmount = (transaction: TransactionData): { display: string; usd: string; isPositive: boolean } => {
    // This would need actual amount data from the transaction
    // For now, using placeholder logic
    const isTopUp = transaction.type === 'IDENTITY_TOP_UP'
    const isWithdrawal = transaction.type === 'IDENTITY_CREDIT_WITHDRAWAL' || 
                        transaction.type === 'IDENTITY_CREDIT_TRANSFER'
    
    // Placeholder amounts - in a real app, this would come from transaction data
    const creditsAmount = 204278360 // This should come from transaction.data or similar
    const dashAmount = creditsToDash(creditsAmount)
    const usdAmount = rate ? dashAmount * rate : 0
    
    const sign = isTopUp ? '+' : isWithdrawal ? '-' : ''
    const display = `${sign} ${creditsAmount.toLocaleString()} Credits`
    const usd = `~ $${usdAmount.toFixed(3)}`
    
    return {
      display,
      usd,
      isPositive: isTopUp
    }
  }

  const groupedTransactions = groupTransactionsByDate(transactions)

  return (
    <div className='w-full flex flex-col gap-5'>
      {loading && (
        <div className='text-center py-4'>
          <Text className='text-gray-500'>Loading transactions...</Text>
        </div>
      )}

      {error && (
        <div className='text-center py-4'>
          <Text className='text-red-500'>Error loading transactions: {error}</Text>
        </div>
      )}

      {!loading && !error && (!transactions || transactions.length === 0) && (
        <div className='text-center py-4'>
          <Text className='text-gray-500'>No transactions found</Text>
        </div>
      )}

      {!loading && !error && transactions && transactions.length > 0 && (
        <>
          {groupedTransactions.map((group) => (
            <div key={group.date} className='flex flex-col gap-4'>
              {/* Date Header */}
              <div className='flex items-center'>
                <Text weight='medium' size='sm' className='text-dash-primary-dark-blue'>
                  {group.date}
                </Text>
              </div>

              {/* Transactions for this date */}
              <div className='flex flex-col gap-2.5'>
                {group.transactions.map((transaction) => {
                  const hash = transaction.hash ?? 'unknown'
                  const status = transaction.status ?? 'unknown'
                  const typeDisplay = getTransactionTypeDisplay(transaction)
                  const subtext = getTransactionSubtext(transaction)
                  const amount = formatAmount(transaction)

                  return (
                    <a
                      key={hash}
                      target='_blank'
                      href={getTransactionExplorerUrl(hash, selectedNetwork)}
                      rel='noreferrer'
                      className='block'
                    >
                      <div className='flex items-center justify-between gap-4 p-4 bg-dash-primary-die-subdued rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer'>
                        {/* Left side */}
                        <div className='flex items-center gap-4'>
                          {/* Status Icon */}
                          <div className='flex items-center justify-center w-6 h-6 bg-dash-primary-die-subdued rounded-full'>
                            <TransactionStatusIcon size={12} status={status} />
                          </div>

                          {/* Transaction Info */}
                          <div className='flex flex-col gap-1'>
                            <Text weight='medium' size='sm' className='text-dash-primary-dark-blue'>
                              {typeDisplay}
                            </Text>
                            <Text size='xs' className='text-gray-500 font-mono'>
                              {subtext}
                            </Text>
                          </div>
                        </div>

                        {/* Right side - Amount */}
                        <div className='flex flex-col items-end gap-1'>
                          <Text 
                            weight='medium' 
                            size='sm' 
                            className={`text-dash-primary-dark-blue ${amount.isPositive ? 'text-green-600' : 'text-dash-primary-dark-blue'}`}
                          >
                            {amount.display}
                          </Text>
                          <Text size='xs' className='text-gray-400'>
                            {amount.usd}
                          </Text>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default TransactionsList
