import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DocumentIcon, Text, TopRightArrowIcon } from 'dash-ui-kit/react'
import { useOpenReceive, useOpenTransactions } from '../../hooks'
import type { TransactionsScope } from '../transactions/types'

const actionButtonClassName = '!h-[3.375rem] !min-h-0 !border-0 !rounded-2xl !p-4 !leading-none gap-2'

interface ActionRowProps {
  scope?: TransactionsScope
  identityId?: string
}

export function ActionRow ({ scope = 'all', identityId }: ActionRowProps): React.JSX.Element {
  const navigate = useNavigate()
  const openTransactions = useOpenTransactions(scope, identityId)
  const openReceive = useOpenReceive(scope, identityId)

  return (
    <div className='flex items-center gap-2 w-full'>
      <Button
        type='button'
        colorScheme='lightBlue'
        className={`${actionButtonClassName} shrink-0`}
        onClick={openTransactions}
      >
        <DocumentIcon size={12} className='!text-dash-brand' />
        <Text size='md' weight='medium' className='!text-dash-brand !leading-none'>Transactions</Text>
      </Button>
      <Button
        type='button'
        colorScheme='lightBlue'
        className={`${actionButtonClassName} flex-1`}
        onClick={() => { void navigate('/send-transaction') }}
      >
        <TopRightArrowIcon size={12} className='!text-dash-brand' />
        <Text size='md' weight='medium' className='!text-dash-brand !leading-none'>Send</Text>
      </Button>
      <Button
        type='button'
        colorScheme='lightBlue'
        className={`${actionButtonClassName} flex-1`}
        onClick={openReceive}
      >
        <TopRightArrowIcon size={12} className='!text-dash-brand rotate-180' />
        <Text size='md' weight='medium' className='!text-dash-brand !leading-none'>Receive</Text>
      </Button>
    </div>
  )
}
