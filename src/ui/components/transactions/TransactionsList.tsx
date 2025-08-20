import React from 'react'
import { Text, TransactionStatusIcon, Identifier, Button } from 'dash-ui/react'
import { TransactionData, NetworkType } from '../../hooks/usePlatformExplorerApi'
import { TransactionTypes } from '../../../enums/TransactionTypes'
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
  
  // Group transactions by date
  const groupTransactionsByDate = (transactions: TransactionData[]): GroupedTransaction[] => {
    const groups: Record<string, TransactionData[]> = {}
    
    transactions.forEach(transaction => {
      const timestamp = transaction.timestamp ? parseInt(transaction.timestamp, 10) : Date.now() / 1000
      const date = new Date(timestamp * 1000)
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

  const getTransactionTypeDisplay = (type: string | null): string => {
    if (!type) return 'Unknown'
    const numericType = parseInt(type, 10)

    switch (numericType) {
      case TransactionTypes.IDENTITY_CREDIT_TRANSFER:
        return 'Send'
      case TransactionTypes.IDENTITY_TOP_UP:
        return 'Receive'
      case TransactionTypes.DOCUMENTS_BATCH:
        return 'Documents Batch'
      case TransactionTypes.DATA_CONTRACT_CREATE:
        return 'Data Contract Create'
      case TransactionTypes.IDENTITY_CREATE:
        return 'Identity Create'
      case TransactionTypes.IDENTITY_UPDATE:
        return 'Identity Update'
      case TransactionTypes.IDENTITY_CREDIT_WITHDRAWAL:
        return 'Withdraw'
      default:
        return Object.keys(TransactionTypes).find(key => TransactionTypes[key as keyof typeof TransactionTypes] === numericType) || type
    }
  }

  const getTransactionSubtext = (transaction: TransactionData): string => {
    const hash = transaction.hash ?? 'unknown'
    
    // For transfers, we would need additional data to show From/To
    // For now, showing hash as fallback
    if (transaction.type === TransactionTypes.IDENTITY_CREDIT_TRANSFER.toString()) {
      return `Hash: ${hash.substring(0, 5)}...${hash.substring(hash.length - 4)}`
    }
    
    return `Hash: ${hash.substring(0, 5)}...${hash.substring(hash.length - 4)}`
  }

  const formatAmount = (transaction: TransactionData): { display: string; usd: string; isPositive: boolean } => {
    // This would need actual amount data from the transaction
    // For now, using placeholder logic
    const isTopUp = transaction.type === TransactionTypes.IDENTITY_TOP_UP.toString()
    const isWithdrawal = transaction.type === TransactionTypes.IDENTITY_CREDIT_WITHDRAWAL.toString() || 
                        transaction.type === TransactionTypes.IDENTITY_CREDIT_TRANSFER.toString()
    
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
    <div className="flex flex-col">
      {/* Tabs Section */}
      <div className="relative mb-5">
        <div className="flex items-center justify-between">
          <div className="flex">
            {/* Active Tab - Transactions */}
            <div className="flex items-center gap-2 px-4 pb-2 border-b border-dash-brand">
              <Text size="lg" weight="medium" className="text-dash-primary-dark-blue">
                Transactions
              </Text>
            </div>
            
            {/* Inactive Tab - Tokens */}
            <div className="flex items-center gap-2 px-4 pb-2">
              <Text size="lg" weight="light" className="text-gray-400">
                Tokens
              </Text>
            </div>
          </div>
          
          {/* Filter Button */}
          <div className="flex items-center justify-center w-6 h-6 bg-dash-primary-die-subdued rounded-md">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path 
                d="M1 3h10M3 6h6M5 9h2" 
                stroke="#0C1C33" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        
        {/* Bottom border line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-5">
        {loading && (
          <div className="text-center py-4">
            <Text className="text-gray-500">Loading transactions...</Text>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <Text className="text-red-500">Error loading transactions: {error}</Text>
          </div>
        )}

        {!loading && !error && (!transactions || transactions.length === 0) && (
          <div className="text-center py-4">
            <Text className="text-gray-500">No transactions found</Text>
          </div>
        )}

        {!loading && !error && transactions && transactions.length > 0 && (
          <>
            {groupedTransactions.map((group) => (
              <div key={group.date} className="flex flex-col gap-4">
                {/* Date Header */}
                <div className="flex items-center">
                  <Text weight="medium" size="sm" className="text-dash-primary-dark-blue">
                    {group.date}
                  </Text>
                </div>

                {/* Transactions for this date */}
                <div className="flex flex-col gap-2.5">
                  {group.transactions.map((transaction) => {
                    const hash = transaction.hash ?? 'unknown'
                    const status = transaction.status ?? 'unknown'
                    const typeDisplay = getTransactionTypeDisplay(transaction.type)
                    const subtext = getTransactionSubtext(transaction)
                    const amount = formatAmount(transaction)

                    return (
                      <a
                        key={hash}
                        target="_blank"
                        href={getTransactionExplorerUrl(hash, selectedNetwork)}
                        rel="noreferrer"
                        className="block"
                      >
                        <div className="flex items-center justify-between gap-4 p-4 bg-dash-primary-die-subdued rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer">
                          {/* Left side */}
                          <div className="flex items-center gap-4">
                            {/* Status Icon */}
                            <div className="flex items-center justify-center w-6 h-6 bg-dash-primary-die-subdued rounded-full">
                              <TransactionStatusIcon size={12} status={status} />
                            </div>

                            {/* Transaction Info */}
                            <div className="flex flex-col gap-1">
                              <Text weight="medium" size="sm" className="text-dash-primary-dark-blue">
                                {typeDisplay}
                              </Text>
                              <Text size="xs" className="text-gray-500 font-mono">
                                {subtext}
                              </Text>
                            </div>
                          </div>

                          {/* Right side - Amount */}
                          <div className="flex flex-col items-end gap-1">
                            <Text 
                              weight="medium" 
                              size="sm" 
                              className={`text-dash-primary-dark-blue ${amount.isPositive ? 'text-green-600' : 'text-dash-primary-dark-blue'}`}
                            >
                              {amount.display}
                            </Text>
                            <Text size="xs" className="text-gray-400">
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
    </div>
  )
}

export default TransactionsList
