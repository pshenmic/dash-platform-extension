import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, PlusIcon, Text } from 'dash-ui-kit/react'
import type { NameStatus } from '../../../types'
import StatusBadge from '../../components/names/StatusBadge'
import { splitDpns } from '../../../utils'
import { IDENTITY_MOCK } from './mock'

const headerTextClassName = '!text-xs !leading-none !tracking-[-0.03em]'

function formatCreated (timestamp: string): string {
  const date = new Date(timestamp)
  const day = date.getDate()
  const month = date.toLocaleDateString('en', { month: 'short' })
  const year = date.getFullYear()

  return `Created: ${day} ${month} ${year}`
}

function NameCard ({
  name,
  status,
  registrationTime
}: {
  name: string
  status: NameStatus
  registrationTime: string
}): React.JSX.Element {
  const { local, tld } = splitDpns(name)

  return (
    <div className='flex flex-col gap-[15px] p-3 rounded-[15px] bg-[rgba(12,28,51,0.04)]'>
      <div className='flex items-start justify-between gap-2'>
        <Text size='sm' weight='bold' className='!font-extrabold !text-dash-primary-dark-blue !leading-[1.2]'>
          {local}
          {tld != null && (
            <Text as='span' size='sm' weight='bold' className='!font-extrabold !text-dash-brand !leading-[1.2]'>
              {tld}
            </Text>
          )}
        </Text>
        <StatusBadge status={status} />
      </div>
      <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/48'>
        {formatCreated(registrationTime)}
      </Text>
    </div>
  )
}

export function NamesTab (): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Text weight='medium' className={`${headerTextClassName} !text-dash-primary-dark-blue/35`}>
          {IDENTITY_MOCK.names.length} Names
        </Text>
        <Button
          type='button'
          colorScheme='lightBlue'
          className='!h-[25px] !min-h-0 !rounded-lg !px-2 !py-2 !border-0 !normal-case gap-2.5 !text-xs'
          onClick={() => { void navigate('/name-registration') }}
        >
          <PlusIcon size={10} className='!text-dash-brand' />
          <Text weight='medium' className={`${headerTextClassName} !text-dash-brand`}>
            Register Name
          </Text>
        </Button>
      </div>
      {IDENTITY_MOCK.names.map((item) => (
        <NameCard
          key={item.name}
          name={item.name}
          status={item.status}
          registrationTime={item.registrationTime}
        />
      ))}
    </div>
  )
}
