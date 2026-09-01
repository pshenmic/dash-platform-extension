import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, DocumentIcon, Text, TopRightArrowIcon } from 'dash-ui-kit/react'

const actionButtonClassName = '!h-[3.375rem] !min-h-0 !border-0 !rounded-2xl !p-4 !leading-none gap-2'

export function ActionRow (): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='flex items-center gap-2 w-full'>
      <Button
        type='button'
        colorScheme='lightBlue'
        className={`${actionButtonClassName} shrink-0`}
        onClick={() => { void navigate('/transactions') }}
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
        onClick={() => { void navigate('/receive') }}
      >
        <TopRightArrowIcon size={12} className='!text-dash-brand rotate-180' />
        <Text size='md' weight='medium' className='!text-dash-brand !leading-none'>Receive</Text>
      </Button>
    </div>
  )
}
