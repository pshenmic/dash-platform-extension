import React from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import { useOpenTransactions } from '../../hooks'
import type { TransactionsScope } from '../../states/transactions/types'

interface SeeAllTransactionsButtonProps {
  scope?: TransactionsScope
  identityId?: string
}

/** Footer control under every short transaction preview. */
export function SeeAllTransactionsButton ({
  scope = 'all',
  identityId
}: SeeAllTransactionsButtonProps): React.JSX.Element {
  const openTransactions = useOpenTransactions(scope, identityId)

  return (
    <Button
      type='button'
      colorScheme='lightBlue'
      className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
      onClick={openTransactions}
    >
      <Text size='sm' weight='medium' className='!text-dash-brand'>
        See All Transactions
      </Text>
    </Button>
  )
}
