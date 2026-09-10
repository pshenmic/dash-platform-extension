import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Avatar,
  BigNumber,
  Button,
  CopyButton,
  ExternalLinkIcon,
  Identifier,
  PlusIcon,
  Text,
  ValueCard
} from 'dash-ui-kit/react'
import { IconChip } from '../../components/common'
import { PasswordGate } from '../../components/forms'
import {
  usePlatformAddresses,
  usePlatformExplorerClient,
  useShieldedAddresses
} from '../../hooks'
import type { AddressData, ShieldedAddressData } from '../../components/addresses'
import type { OutletContext } from '../../types/OutletContext'
import type { NetworkType } from '../../../types'
import { creditsToUsdEquivalent, getPlatformAddressExplorerUrl } from '../../../utils'

const headerTextClassName = '!text-xs !leading-none !tracking-[-0.03em]'
const subTabClassName = 'flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border-0 cursor-pointer'

type AddressType = 'platform' | 'shield'

interface AddressesTabProps {
  hide: boolean
}

function AddressActions ({
  address,
  explorerUrl
}: {
  address: string
  explorerUrl: string | null
}): React.JSX.Element {
  return (
    <>
      {explorerUrl != null && (
        <IconChip label='View in explorer' href={explorerUrl}>
          <ExternalLinkIcon size={14} color='#000000' />
        </IconChip>
      )}
      <IconChip label='Copy address'>
        <CopyButton
          text={address}
          aria-label='Copy address'
          className='!p-0 !bg-transparent [&_svg]:!size-3.5'
        />
      </IconChip>
    </>
  )
}

function AddressRow ({
  address,
  hide,
  loading,
  metaLabel,
  metaValue,
  credits,
  fiat,
  explorerUrl
}: {
  address: string
  hide: boolean
  loading: boolean
  metaLabel: string
  metaValue: string
  credits: string | null
  fiat: string | null
  explorerUrl: string | null
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-[15px] p-3 rounded-[15px] bg-[rgba(12,28,51,0.04)]'>
      <div className='flex items-center gap-2 min-w-0 flex-1'>
        <div className='w-6 h-6 rounded-full overflow-hidden shrink-0 bg-[rgba(76,126,255,0.05)]'>
          <Avatar username={address} className='w-6 h-6' />
        </div>
        <div className='flex flex-col justify-center gap-0.5 min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <Identifier
              highlight='both'
              middleEllipsis
              edgeChars={5}
              className='!text-sm !leading-[1.2]'
            >
              {address}
            </Identifier>
            <AddressActions address={address} explorerUrl={explorerUrl} />
          </div>
          <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/32'>
            {metaLabel}:{' '}
            <Text as='span' size='xs' weight='bold' className='!font-extrabold !text-[0.75rem] !leading-[1.2] !text-dash-primary-dark-blue/32'>
              {loading ? '…' : metaValue}
            </Text>
          </Text>
        </div>
      </div>
      <div className='flex flex-col items-end gap-[5px] shrink-0'>
        {loading
          ? <Text size='sm' dim>…</Text>
          : (
            <>
              <Text size='sm' weight='medium' className='!text-[0.875rem] !leading-[17px] !text-dash-primary-dark-blue whitespace-nowrap'>
                {hide ? '••••••' : credits != null ? <BigNumber>{credits}</BigNumber> : '—'}{' '}
                <Text as='span' size='sm' weight='medium' className='!text-[0.875rem] !leading-[17px] !text-dash-primary-dark-blue'>
                  Credits
                </Text>
              </Text>
              <Text size='xs' weight='medium' className='!text-[0.75rem] !leading-[1.2] !text-dash-brand'>
                {hide ? '••••••' : fiat ?? '—'}
              </Text>
            </>
            )}
      </div>
    </div>
  )
}

function PlatformAddressRow ({
  item,
  hide,
  fiat,
  explorerUrl
}: {
  item: AddressData
  hide: boolean
  fiat: string | null
  explorerUrl: string
}): React.JSX.Element {
  return (
    <AddressRow
      address={item.address}
      hide={hide}
      loading={item.loading}
      metaLabel='Transactions'
      metaValue={item.totalTxs != null ? String(item.totalTxs) : '—'}
      credits={item.balance}
      fiat={fiat}
      explorerUrl={explorerUrl}
    />
  )
}

function ShieldedAddressRow ({
  item,
  hide,
  fiat
}: {
  item: ShieldedAddressData
  hide: boolean
  fiat: string | null
}): React.JSX.Element {
  return (
    <AddressRow
      address={item.address}
      hide={hide}
      loading={item.loading ?? false}
      metaLabel='Notes'
      metaValue={item.spendableNotes != null ? String(item.spendableNotes) : '—'}
      credits={item.balance}
      fiat={fiat}
      explorerUrl={null}
    />
  )
}

export function AddressesTab ({ hide }: AddressesTabProps): React.JSX.Element {
  const { currentNetwork } = useOutletContext<OutletContext>()
  const network: NetworkType = currentNetwork ?? 'testnet'
  const platformExplorerClient = usePlatformExplorerClient()
  const [addressType, setAddressType] = useState<AddressType>('platform')
  const [rate, setRate] = useState<number | null>(null)
  const [creatingShielded, setCreatingShielded] = useState(false)

  const platform = usePlatformAddresses(network)
  const shielded = useShieldedAddresses(network)

  useEffect(() => {
    platformExplorerClient.fetchRate(network)
      .then(setRate)
      .catch(() => { setRate(null) })
  }, [network, platformExplorerClient])

  const fiatFor = (credits: string | null): string | null => {
    if (credits == null) return null
    return creditsToUsdEquivalent(BigInt(credits), rate)
  }

  const handlePlatformPassword = async (password: string): Promise<string | null> => {
    return await platform.generateWithPassword(password)
  }

  const handlePlatformPasswordCancel = (): void => {
    platform.cancelPassword()
  }

  const handleShieldedLoad = async (password: string): Promise<string | null> => {
    return await shielded.load(password)
  }

  const handleAdd = (): void => {
    if (addressType === 'platform') {
      void platform.generate()
      return
    }
    if (!shielded.hasLoaded) return
    setCreatingShielded(true)
  }

  const addDisabled = addressType === 'platform'
    ? platform.isLoading || platform.isGenerating
    : !shielded.hasLoaded || shielded.isLoading || shielded.isGenerating || creatingShielded

  const handleShieldedGenerate = async (password: string): Promise<string | null> => {
    const generateError = await shielded.generate(password)
    if (generateError != null) return generateError
    setCreatingShielded(false)
    return null
  }

  const handleShieldedGenerateCancel = (): void => {
    setCreatingShielded(false)
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className={`${subTabClassName} ${addressType === 'platform' ? 'bg-[rgba(12,28,51,0.04)]' : 'bg-transparent'}`}
            onClick={() => { setAddressType('platform') }}
          >
            <Text weight='medium' className={`!text-base !tracking-[-0.03em] ${addressType === 'platform' ? '!text-dash-primary-dark-blue' : '!text-dash-primary-dark-blue/35'}`}>
              Platform
            </Text>
            <Text weight='medium' className={`!text-base !tracking-[-0.03em] ${addressType === 'platform' ? '!text-dash-primary-dark-blue/48' : '!text-dash-primary-dark-blue/35'}`}>
              {platform.addresses.length}
            </Text>
          </button>
          <button
            type='button'
            className={`${subTabClassName} ${addressType === 'shield' ? 'bg-[rgba(12,28,51,0.04)]' : 'bg-transparent'}`}
            onClick={() => { setAddressType('shield') }}
          >
            <Text weight='medium' className={`!text-base !tracking-[-0.03em] ${addressType === 'shield' ? '!text-dash-primary-dark-blue' : '!text-dash-primary-dark-blue/35'}`}>
              Shield
            </Text>
            {shielded.hasLoaded && (
              <Text weight='medium' className={`!text-base !tracking-[-0.03em] ${addressType === 'shield' ? '!text-dash-primary-dark-blue/48' : '!text-dash-primary-dark-blue/35'}`}>
                {shielded.rows.length}
              </Text>
            )}
          </button>
        </div>
        <Button
          type='button'
          colorScheme='lightBlue'
          className='!h-[25px] !min-h-0 !rounded-lg !px-2 !py-2 !border-0 !normal-case gap-[0.3rem] !text-xs'
          onClick={handleAdd}
          disabled={addDisabled}
        >
          <PlusIcon size={14} className='!text-dash-brand shrink-0' />
          <Text weight='medium' className={`${headerTextClassName} !text-dash-brand`}>
            Add Address
          </Text>
        </Button>
      </div>

      {addressType === 'shield' && creatingShielded && (
        <PasswordGate
          description='Enter your password to show more shielded addresses.'
          submitLabel='Show addresses'
          pendingLabel='Loading...'
          isPending={shielded.isGenerating}
          onSubmit={handleShieldedGenerate}
          onCancel={handleShieldedGenerateCancel}
        />
      )}

      {addressType === 'platform' && (
        <>
          {platform.error != null && (
            <ValueCard colorScheme='red' size='xl'>
              <Text size='sm' color='red'>{platform.error}</Text>
            </ValueCard>
          )}
          {platform.hasLoaded && !platform.isLoading && platform.addresses.length === 0 && (
            <Text size='sm' dim>No addresses yet. Create your first one above.</Text>
          )}
          {platform.addresses.length > 0 && (
            <div className='flex flex-col gap-2'>
              {platform.addresses.map((item) => (
                <PlatformAddressRow
                  key={`${item.index}-${item.address}`}
                  item={item}
                  hide={hide}
                  fiat={fiatFor(item.balance)}
                  explorerUrl={getPlatformAddressExplorerUrl(item.address, network)}
                />
              ))}
            </div>
          )}
          {platform.needsPassword && (
            <PasswordGate
              description='Enter your password once to enable platform addresses for this wallet.'
              submitLabel='Show addresses'
              pendingLabel='Loading...'
              isPending={platform.isGenerating}
              onSubmit={handlePlatformPassword}
              onCancel={handlePlatformPasswordCancel}
            />
          )}
        </>
      )}

      {addressType === 'shield' && (
        <>
          {!shielded.hasLoaded && (
            <PasswordGate
              description='Enter your password to view shielded addresses.'
              submitLabel='Show Shielded Addresses'
              isPending={shielded.isLoading}
              onSubmit={handleShieldedLoad}
            />
          )}
          {shielded.error != null && (
            <ValueCard colorScheme='red' size='xl'>
              <Text size='sm' color='red'>{shielded.error}</Text>
            </ValueCard>
          )}
          {shielded.hasLoaded && shielded.error == null && (
            <>
              {shielded.rows.length === 0
                ? <Text size='sm' dim>No shielded addresses available</Text>
                : (
                  <div className='flex flex-col gap-2'>
                    {shielded.rows.map((item) => (
                      <ShieldedAddressRow
                        key={item.address}
                        item={item}
                        hide={hide}
                        fiat={fiatFor(item.balance)}
                      />
                    ))}
                  </div>
                  )}
            </>
          )}
        </>
      )}
    </div>
  )
}
