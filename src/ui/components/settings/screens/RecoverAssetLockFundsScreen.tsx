import React, { useEffect, useState } from 'react'
import { Button, Checkbox, CheckmarkIcon, Input, Text, ValueCard, WalletIcon } from 'dash-ui-kit/react'
import type { ScreenConfig, SettingsScreenProps } from '../types'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { PasswordGate } from '../../forms'
import { FieldLabel } from '../../typography'
import { Banner } from '../../cards'
import { CORE_DASH_DECIMALS, formatDashAmount } from '../../../../utils'
import type { AssetLockFundingAddressInfo } from '../../../../types/messages/response/ListAssetLockFundingAddressesResponse'
import type { RecoverAssetLockFundsResponse } from '../../../../types/messages/response/RecoverAssetLockFundsResponse'

export const recoverAssetLockFundsScreenConfig: ScreenConfig = {
  id: 'recover-asset-lock-funds',
  title: 'Recovery Asset Lock Funds',
  icon: <WalletIcon className='text-dash-primary-dark-blue' />,
  category: 'wallet',
  content: []
}

const PURPOSE_LABELS: Record<string, string> = {
  registration: 'Identity registration',
  topUp: 'Identity top-up',
  fundAddress: 'Platform address funding',
  shield: 'Shielding'
}

const STATE_LABELS: Record<AssetLockFundingAddressInfo['state'], string> = {
  recoverable: 'Ready to recover',
  committed: 'Asset lock on L1',
  spent: 'Spent'
}

const dash = (duffs: string | null): string =>
  duffs == null ? '—' : `${formatDashAmount(BigInt(duffs), CORE_DASH_DECIMALS)} DASH`

// Sweepable wherever the key is here, something is on the address, and no
// unfinished asset lock already claims it.
//
// `spent` qualifies: a finished operation leaves behind anything that arrived
// after it, and that money is as stranded as a never-used address's. Only
// `committed` is excluded - its asset lock already spends the deposit, so
// sweeping would double-spend and strand a registration that can still finish.
const isSweepable = (entry: AssetLockFundingAddressInfo): boolean =>
  entry.state !== 'committed' &&
  entry.hasKey &&
  entry.balanceDuffs != null &&
  BigInt(entry.balanceDuffs) > 0n

const AddressCard: React.FC<{
  entry: AssetLockFundingAddressInfo
  isSelected: boolean
  onSelect: () => void
}> = ({ entry, isSelected, onSelect }) => {
  const sweepable = isSweepable(entry)
  const balance = entry.balanceDuffs == null ? null : BigInt(entry.balanceDuffs)
  const hasFunds = balance != null && balance > 0n

  // `spent` normally means the deposit was consumed, so the address is empty.
  // When it is not, the local record and the chain disagree - a deposit arrived
  // after the operation finished, most likely - and it is still worth sweeping.
  const spentButFunded = entry.state === 'spent' && hasFunds

  return (
    <ValueCard
      colorScheme={isSelected ? 'brand' : 'lightGray'}
      className={sweepable ? 'cursor-pointer' : undefined}
      onClick={sweepable ? onSelect : undefined}
    >
      <div className='flex flex-col gap-2'>
        <div className='flex items-start justify-between gap-2'>
          <Text size='sm' weight='medium' className='break-all' monospace>
            {entry.address}
          </Text>
          <Text size='sm' weight='medium' className='shrink-0'>
            {dash(entry.balanceDuffs)}
          </Text>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Text size='xs' weight='medium' dim>
            {STATE_LABELS[entry.state]}
          </Text>
          <Text size='xs' dim>
            {PURPOSE_LABELS[entry.purpose] ?? entry.purpose}
          </Text>
          {entry.utxoCount != null && entry.utxoCount > 0 && (
            <Text size='xs' dim>
              {entry.utxoCount} output{entry.utxoCount === 1 ? '' : 's'}
            </Text>
          )}
        </div>
        {entry.state === 'committed' && (
          <Text size='xs' dim className='break-all'>
            An asset lock already spends this address and its registration never
            finished, so the funds come back by finishing that operation — there is
            nothing here to sweep.
            {entry.assetLockTxid != null && ` Asset lock ${entry.assetLockTxid}.`}
          </Text>
        )}
        {spentButFunded && entry.hasKey && (
          <Text size='xs' color='red'>
            Marked as spent, but {dash(entry.balanceDuffs)} is still on this address.
            The deposit arrived after the operation finished — recover it to an
            address you control.
          </Text>
        )}
        {hasFunds && !entry.hasKey && entry.state !== 'committed' && (
          <Text size='xs' color='red'>
            {dash(entry.balanceDuffs)} is on this address, but no key is stored for
            it, so it cannot be signed for.
          </Text>
        )}
        {entry.state === 'spent' && balance != null && balance === 0n && (
          <Text size='xs' dim>Already spent, so nothing is left at this address.</Text>
        )}
        {entry.state === 'recoverable' && entry.hasKey && !hasFunds && (
          <Text size='xs' dim>Nothing on this address to recover yet</Text>
        )}
      </div>
    </ValueCard>
  )
}

export const RecoverAssetLockFundsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const extensionAPI = useExtensionAPI()
  const [listState, loadList] = useAsyncState<AssetLockFundingAddressInfo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [toAddress, setToAddress] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecoverAssetLockFundsResponse | null>(null)

  useEffect(() => {
    loadList(async () => await extensionAPI.listAssetLockFundingAddresses(true))
      // The affirmation is about specific balances, so a fresh read voids it.
      .then(() => { setAcknowledged(false) })
      .catch((e) => { console.warn('Failed to list asset lock funding addresses:', e) })
  }, [extensionAPI, loadList])

  const entries = listState.data ?? []
  const selectedEntry = entries.find(entry => entry.address === selected) ?? null

  // Offered once every address reads zero on chain, so nothing is left to sweep.
  //
  // A `committed` entry also reads zero - an asset lock already spends it - but
  // that money is on L1 and its registration can still finish, and
  // `registrationIdentityIndex` in that same record is what rebuilds the
  // transaction. The backend refuses those, so offering the button would only
  // produce a failed click.
  const allBalancesZero = entries.every(entry => entry.balanceDuffs != null && BigInt(entry.balanceDuffs) === 0n)
  const hasCommitted = entries.some(entry => entry.state === 'committed')
  const canAcknowledge = entries.length > 0 && allBalancesZero && !hasCommitted

  // Deletes every funding address this wallet holds, then leaves settings. The
  // backend re-checks that nothing is at stake and says what if so.
  const handleAcknowledge = async (): Promise<void> => {
    setClearing(true)
    setError(null)

    try {
      await extensionAPI.clearAssetLockFundingAddresses()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setClearing(false)
    }
  }

  const handleSubmit = async (password: string): Promise<string | null> => {
    if (selectedEntry == null) {
      return 'No address is selected'
    }

    setPending(true)
    setError(null)
    setResult(null)

    try {
      const response = await extensionAPI.recoverAssetLockFunds(
        selectedEntry.address,
        toAddress.trim(),
        password
      )

      setResult(response)
      setSelected(null)
      setToAddress('')
      setConfirmOpen(false)
      await loadList(async () => await extensionAPI.listAssetLockFundingAddresses(true))
      setAcknowledged(false)

      return null
    } catch (e) {
      // Surfaced through the gate so it lands under the password field, and kept
      // in `error` too because the gate clears its own state on success.
      const message = e instanceof Error ? e.message : String(e)
      setError(message)

      return message
    } finally {
      setPending(false)
    }
  }

  const canSubmit = selectedEntry != null && isSweepable(selectedEntry) && toAddress.trim().length > 0

  return (
    <div className='flex flex-col gap-4 h-full overflow-y-auto'>
      <Text size='sm' dim className='text-dash-primary-dark-blue'>
        Every asset lock funding address this wallet was given. Sweep the ones that
        still hold a deposit to an address you control.
      </Text>

      {listState.loading && <Text dim>Loading…</Text>}

      {listState.error != null && (
        <Banner variant='error' message={listState.error} />
      )}

      {error != null && <Banner variant='error' message={error} />}

      {result != null && (
        <ValueCard colorScheme='green'>
          <div className='flex flex-col gap-2'>
            <Text size='sm' weight='medium'>
              Sent {dash(result.amountDuffs)} to {result.toAddress}
            </Text>
            <Text size='xs' dim className='break-all' monospace>
              {result.txid}
            </Text>
            <Text size='xs' dim>
              Network fee {dash(result.feeDuffs)} · address drained and closed
            </Text>
          </div>
        </ValueCard>
      )}

      <div className='flex flex-col gap-3'>
        {entries.map(entry => (
          <React.Fragment key={entry.address}>
            <AddressCard
              entry={entry}
              isSelected={selected === entry.address}
              onSelect={() => {
                setSelected(prev => prev === entry.address ? null : entry.address)
                setToAddress('')
                setResult(null)
                setError(null)
              }}
            />

            {selected === entry.address && (
              <div className='flex flex-col gap-3 rounded-2xl bg-gray-100 p-3'>
                <div className='flex flex-col gap-2'>
                  <FieldLabel>Send to</FieldLabel>
                  <Input
                    placeholder='Dash address'
                    value={toAddress}
                    onChange={(e) => {
                      setToAddress(e.target.value)
                      setError(null)
                    }}
                    size='xl'
                    className='w-full break-all'
                  />
                  <Text size='xs' dim>
                    Sends the whole deposit ({dash(entry.balanceDuffs)}) less the network fee
                  </Text>
                </div>

                <Button
                  colorScheme='brand'
                  className='w-full'
                  disabled={!canSubmit || pending}
                  onClick={() => { setConfirmOpen(true) }}
                >
                  Send
                </Button>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Only after a successful read, and only once nothing is left to recover or
          finish. If the balance fetch failed the list stays empty, and offering
          this next to an error would invite deleting keys we never got to check. */}
      {!listState.loading && listState.error == null && canAcknowledge && (
        <ValueCard colorScheme='lightGray' className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <CheckmarkIcon className='text-green-600 shrink-0' size={18} />
            <Text size='lg' weight='medium' className='text-gray-600'>
              Nothing to recover
            </Text>
          </div>
          <Text size='sm' className='text-gray-500'>
            This wallet has no asset lock funding address with a deposit left on it.
            These addresses were generated automatically in previous versions, they are not part of the seedphrase,
            and is no longer being used. They can be safely removed now.
          </Text>
          <Text size='sm' className='text-gray-500'>
            The button below clears all {entries.length} of your old
            {entries.length === 1 ? ' address' : ' addresses'}, and removes them from the wallet.
          </Text>
          <Checkbox
            checked={acknowledged}
            onChange={setAcknowledged}
            label='I agree that the balance on the addresses is zero and that it will remove the addresses from the wallet'
          />
          <Button
            colorScheme='lightGray'
            disabled={clearing || !acknowledged}
            onClick={() => {
              handleAcknowledge().catch(e => console.warn('Failed to clear funding addresses:', e))
            }}
          >
            {clearing ? 'Removing…' : 'Clear addresses'}
          </Button>
        </ValueCard>
      )}

      {confirmOpen && selectedEntry != null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-4'>
            <Text size='lg' weight='medium'>Confirm recovery</Text>
            <div className='mt-2 flex flex-col gap-1'>
              <Text size='sm' dim>
                Send {dash(selectedEntry.balanceDuffs)} less the network fee
              </Text>
              <Text size='xs' dim className='break-all' monospace>
                to {toAddress.trim()}
              </Text>
            </div>
            <div className='mt-3'>
              <PasswordGate
                description='The funding key is encrypted with your password.'
                submitLabel='Send'
                pendingLabel='Sending…'
                isPending={pending}
                onSubmit={async (password) => await handleSubmit(password)}
                onCancel={() => { setConfirmOpen(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
