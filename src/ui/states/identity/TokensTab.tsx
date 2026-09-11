import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AirplaneIcon,
  Avatar,
  Button,
  CopyButton,
  ExternalLinkIcon,
  Identifier,
  PlusIcon,
  Text
} from 'dash-ui-kit/react'
import { PLATFORM_EXPLORER_URLS } from '../../../constants'
import type { NetworkType, TokenData } from '../../../types'
import { fromBaseUnit, getTokenName } from '../../../utils'
import { IconChip } from '../../components/common'
import { sendPath } from '../../utils/sendPath'

const headerTextClassName = '!text-xs !leading-none !tracking-[-0.03em]'

interface TokensTabProps {
  hide: boolean
  network: NetworkType
  loading: boolean
  error: string | null
  tokens: TokenData[]
  // Holder of these tokens, and the sender of a transfer started from here.
  identityId: string
}

function TokenCard ({
  token,
  hide,
  explorerUrl,
  onTransfer
}: {
  token: TokenData
  hide: boolean
  explorerUrl: string
  onTransfer: () => void
}): React.JSX.Element {
  const stop = (event: React.MouseEvent): void => {
    event.stopPropagation()
  }
  const name = getTokenName(token.localizations, 'singularForm')
  const label = name !== '' ? name : (token.description !== '' ? token.description : 'Token')
  const amount = fromBaseUnit(token.balance, token.decimals)
  const txCount = token.totalTransitionsCount

  return (
    <div className='flex flex-col gap-[15px] p-3 rounded-[15px] bg-[rgba(12,28,51,0.04)]'>
      <div className='flex flex-col justify-center gap-2 min-w-0'>
        <div className='flex items-center gap-2 min-w-0'>
          <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
            <Avatar username={token.identifier} className='w-6 h-6' />
          </div>
          <Text size='sm' weight='bold' className='!font-extrabold !text-dash-primary-dark-blue !leading-[1.2]'>
            {label}
          </Text>
        </div>
        <div className='flex items-start gap-2'>
          <Identifier highlight='both' className='!text-sm !leading-[1.2] flex-1'>
            {token.identifier}
          </Identifier>
          <IconChip
            label='Transfer'
            onClick={(event) => {
              stop(event)
              onTransfer()
            }}
          >
            <AirplaneIcon size={14} color='#000000' />
          </IconChip>
          <IconChip label='View in explorer' href={explorerUrl} onClick={stop}>
            <ExternalLinkIcon size={14} color='#000000' />
          </IconChip>
          <IconChip label='Copy identifier' onClick={stop}>
            <CopyButton
              text={token.identifier}
              aria-label='Copy identifier'
              className='!p-0 !bg-transparent [&_svg]:!size-3.5'
            />
          </IconChip>
        </div>
        <div className='flex gap-4'>
          <div className='flex items-center gap-1'>
            <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue'>
              {hide ? '••••••' : amount}
            </Text>
          </div>
          {txCount != null && (
            <div className='flex items-center gap-1'>
              <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/48'>
                Txs:
              </Text>
              <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue'>
                {txCount}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TokensTab ({ hide, network, loading, error, tokens, identityId }: TokensTabProps): React.JSX.Element {
  const navigate = useNavigate()
  const explorerBase = PLATFORM_EXPLORER_URLS[network].explorer

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Text weight='medium' className={`${headerTextClassName} !text-dash-primary-dark-blue/35`}>
          {loading ? '...' : tokens.length} Tokens
        </Text>
        <Button
          type='button'
          colorScheme='lightBlue'
          className='!h-[25px] !min-h-0 !rounded-lg !px-2 !py-2 !border-0 !normal-case gap-2.5 !text-xs'
        >
          <PlusIcon size={10} className='!text-dash-brand' />
          <Text weight='medium' className={`${headerTextClassName} !text-dash-brand`}>
            Add Token
          </Text>
        </Button>
      </div>
      {loading && (
        <Text size='sm' dim>Loading tokens...</Text>
      )}
      {!loading && error != null && error !== '' && (
        <Text size='sm' className='!text-red-500'>Error loading tokens: {error}</Text>
      )}
      {!loading && (error == null || error === '') && tokens.map((token) => (
        <TokenCard
          key={token.identifier}
          token={token}
          hide={hide}
          explorerUrl={`${explorerBase}/token/${token.identifier}`}
          onTransfer={() => {
            void navigate(sendPath('identity', identityId), {
              state: { selectedToken: token.identifier }
            })
          }}
        />
      ))}
    </div>
  )
}
