import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Avatar,
  Button,
  CopyButton,
  ExternalLinkIcon,
  Identifier,
  PlusIcon,
  Text
} from 'dash-ui-kit/react'
import type { Identity, NetworkType } from '../../../types'
import { fetchNames, formatCredits, getIdentityExplorerUrl, splitDpns } from '../../../utils'
import { usePlatformExplorerClient, useSdk } from '../../hooks'
import type { OutletContext } from '../../types/OutletContext'
import { PLATFORM_MOCK } from './mock'

const iconChipClassName = 'flex items-center justify-center size-6 p-1 rounded-[5px] bg-[rgba(12,28,51,0.05)] shrink-0 transition-colors hover:bg-[rgba(12,28,51,0.12)]'
const headerTextClassName = '!text-xs !leading-none !tracking-[-0.03em]'
const MOCK_STATS = PLATFORM_MOCK.identities

interface IdentityRow {
  identifier: string
  name: string | null
  credits: string
  changePct: string
  txCount: number
}

interface IdentitiesTabProps {
  hide: boolean
  identities: Identity[]
}

function IdActions ({
  identifier,
  explorerUrl,
  onStop
}: {
  identifier: string
  explorerUrl: string
  onStop: (event: React.MouseEvent) => void
}): React.JSX.Element {
  return (
    <>
      <a
        href={explorerUrl}
        target='_blank'
        rel='noreferrer'
        aria-label='View in explorer'
        className={iconChipClassName}
        onClick={onStop}
      >
        <ExternalLinkIcon size={14} color='#000000' />
      </a>
      <div className={iconChipClassName} onClick={onStop}>
        <CopyButton
          text={identifier}
          aria-label='Copy identifier'
          className='!p-0 !bg-transparent [&_svg]:!size-3.5'
        />
      </div>
    </>
  )
}

function IdentityCard ({
  row,
  hide,
  explorerUrl,
  onOpen
}: {
  row: IdentityRow
  hide: boolean
  explorerUrl: string
  onOpen: () => void
}): React.JSX.Element {
  const named = row.name != null && row.name !== ''
  const { local, tld } = named ? splitDpns(row.name as string) : { local: '', tld: null }

  const stop = (event: React.MouseEvent): void => {
    event.stopPropagation()
  }

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className='flex flex-col gap-[15px] p-3 rounded-[15px] bg-[rgba(12,28,51,0.04)] text-left cursor-pointer'
    >
      <div className='flex flex-col justify-center gap-2 min-w-0'>
        <div className='flex items-center gap-2 min-w-0'>
          <div className='w-6 h-6 rounded-full overflow-hidden shrink-0'>
            <Avatar username={row.identifier} className='w-6 h-6' />
          </div>
          {named && (
            <Text size='sm' weight='bold' className='!font-extrabold !text-dash-primary-dark-blue !leading-[1.2] whitespace-nowrap truncate'>
              {local}
              {tld != null && (
                <Text as='span' size='sm' weight='bold' className='!font-extrabold !text-dash-brand !leading-[1.2]'>
                  {tld}
                </Text>
              )}
            </Text>
          )}
        </div>

        <div className='flex items-start gap-2'>
          <Identifier highlight='both' className='!text-sm !leading-[1.2] flex-1'>
            {row.identifier}
          </Identifier>
          <IdActions identifier={row.identifier} explorerUrl={explorerUrl} onStop={stop} />
        </div>

        <div className='flex gap-4'>
          <div className='flex items-center gap-1'>
            <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/48'>
              Credits:
            </Text>
            <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue'>
              {hide ? '••••••' : formatCredits(row.credits)}
            </Text>
            {!hide && (
              <Text size='xs' weight='bold' className='!font-extrabold !text-[0.75rem] !leading-[1.2] !text-[#95BF40]'>
                ↑{row.changePct}%
              </Text>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/48'>
              Txs:
            </Text>
            <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue'>
              {row.txCount}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export function IdentitiesTab ({ hide, identities }: IdentitiesTabProps): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentWallet, allWallets, setCurrentIdentity } = useOutletContext<OutletContext>()
  const network: NetworkType = currentNetwork ?? 'testnet'
  const walletType = allWallets.find(wallet => wallet.walletId === currentWallet)?.type
  const [namesById, setNamesById] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (identities.length === 0) {
      setNamesById(new Map())
      return
    }

    let cancelled = false

    const load = async (): Promise<void> => {
      const entries = await Promise.all(identities.map(async (identity) => {
        const names = await fetchNames(sdk, platformExplorerClient, identity.identifier, network)
        const first = names[0]?.name
        return [identity.identifier, first != null && first !== '' ? first : null] as const
      }))
      if (cancelled) return
      setNamesById(new Map(
        entries.filter((entry): entry is readonly [string, string] => entry[1] != null)
      ))
    }

    void load().catch(e => console.log('load identity names error', e))

    return () => {
      cancelled = true
    }
  }, [identities, network, platformExplorerClient, sdk])

  const rows = useMemo((): IdentityRow[] => {
    if (identities.length === 0) {
      return MOCK_STATS.map(item => ({ ...item }))
    }

    return identities.map((identity, index): IdentityRow => {
      const stats = MOCK_STATS[index % MOCK_STATS.length]
      return {
        identifier: identity.identifier,
        name: namesById.get(identity.identifier) ?? identity.label,
        credits: stats.credits,
        changePct: stats.changePct,
        txCount: stats.txCount
      }
    })
  }, [identities, namesById])

  const countLabel = identities.length > 0 ? identities.length : PLATFORM_MOCK.identityCountFallback

  const openIdentity = (identifier: string): void => {
    setCurrentIdentity(identifier)
    void navigate(`/identity/${identifier}`, { state: { from: '/platform' } })
  }

  const createIdentity = (): void => {
    void navigate(walletType === 'seedphrase' ? '/register-identity' : '/select-import-type')
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Text weight='medium' className={`${headerTextClassName} !text-dash-primary-dark-blue/35`}>
          {countLabel} Identities
        </Text>
        <Button
          type='button'
          colorScheme='lightBlue'
          className='!h-[25px] !min-h-0 !rounded-lg !px-2 !py-2 !border-0 !normal-case gap-2.5 !text-xs'
          onClick={createIdentity}
        >
          <PlusIcon size={10} className='!text-dash-brand' />
          <Text weight='medium' className={`${headerTextClassName} !text-dash-brand`}>
            Create Identity
          </Text>
        </Button>
      </div>
      {rows.map((row, index) => (
        <IdentityCard
          key={`${row.identifier}-${index}`}
          row={row}
          hide={hide}
          explorerUrl={getIdentityExplorerUrl(row.identifier, network)}
          onOpen={() => { openIdentity(row.identifier) }}
        />
      ))}
    </div>
  )
}
