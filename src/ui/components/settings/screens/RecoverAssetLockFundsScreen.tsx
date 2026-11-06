import React, { useEffect, useState } from 'react'
import { Button, Input, Text, ValueCard, WalletIcon } from 'dash-ui-kit/react'
import type { ScreenConfig, SettingsScreenProps } from '../types'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { PasswordGate } from '../../forms'
import { FieldLabel } from '../../typography'
import { Banner } from '../../cards'
import { CORE_DASH_DECIMALS, formatDashAmount, parseDashAmount } from '../../../../utils'
import type { RecoverableAssetLockFundingAddress } from '../../../../types/messages/response/ListRecoverableAssetLockFundsResponse'
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

const dash = (duffs: string | null): string =>
  duffs == null ? '—' : `${formatDashAmount(BigInt(duffs), CORE_DASH_DECIMALS)} DASH`

interface SendFormState {
  toAddress: string
  amountInput: string
  // Empty amount means drain the address, which is what the backend does when it
  // is given no amount. The fee then comes out of the deposit, so the UI does not
  // have to estimate it to offer a Max.
  sendMax: boolean
}

const emptyForm = (): SendFormState => ({ toAddress: '', amountInput: '', sendMax: true })

const AddressCard: React.FC<{
  entry: RecoverableAssetLockFundingAddress
  isSelected: boolean
  onSelect: () => void
}> = ({ entry, isSelected, onSelect }) => {
  const balance = entry.balanceDuffs == null ? null : BigInt(entry.balanceDuffs)
  const empty = balance != null && balance === 0n

  return (
    <ValueCard
      colorScheme={isSelected ? 'brand' : 'lightGray'}
      className='cursor-pointer'
      onClick={onSelect}
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
          <Text size='xs' dim>
            {PURPOSE_LABELS[entry.purpose] ?? entry.purpose}
          </Text>
          {entry.utxoCount != null && entry.utxoCount > 0 && (
            <Text size='xs' dim>
              {entry.utxoCount} output{entry.utxoCount === 1 ? '' : 's'}
            </Text>
          )}
        </div>
        {!entry.hasKey && (
          <Text size='xs' color='red'>
            No key stored for this address — its deposit cannot be signed for
          </Text>
        )}
        {entry.hasKey && empty && (
          <Text size='xs' dim>Nothing left to recover</Text>
        )}
      </div>
    </ValueCard>
  )
}

export const RecoverAssetLockFundsScreen: React.FC<SettingsScreenProps> = () => {
  const extensionAPI = useExtensionAPI()
  const [listState, loadList] = useAsyncState<RecoverableAssetLockFundingAddress[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState<SendFormState>(emptyForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RecoverAssetLockFundsResponse | null>(null)

  useEffect(() => {
    loadList(async () => await extensionAPI.listRecoverableAssetLockFunds(true))
      .catch((e) => { console.warn('Failed to list recoverable funds:', e) })
  }, [extensionAPI, loadList])

  const selectedEntry = listState.data?.find(entry => entry.address === selected) ?? null

  const handleSubmit = async (password: string): Promise<string | null> => {
    if (selectedEntry == null) {
      return 'No address is selected'
    }

    setPending(true)
    setError(null)
    setResult(null)

    try {
      // An empty amount drains the address; the backend works out the fee.
      const amountDuffs = form.sendMax || form.amountInput.trim() === ''
        ? undefined
        : parseDashAmount(form.amountInput.trim(), CORE_DASH_DECIMALS)?.toString()

      if (amountDuffs == null && !form.sendMax && form.amountInput.trim() !== '') {
        return 'Enter a valid amount, or leave it empty to send everything'
      }

      const response = await extensionAPI.recoverAssetLockFunds(
        selectedEntry.address,
        form.toAddress.trim(),
        password,
        amountDuffs
      )

      setResult(response)
      setSelected(null)
      setForm(emptyForm())
      setConfirmOpen(false)
      await loadList(async () => await extensionAPI.listRecoverableAssetLockFunds(true))

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

  const canSubmit = selectedEntry?.hasKey === true &&
    form.toAddress.trim().length > 0 &&
    (form.sendMax || parseDashAmount(form.amountInput.trim(), CORE_DASH_DECIMALS) != null)

  return (
    <div className='flex flex-col gap-4 h-full overflow-y-auto'>
      <Text size='sm' dim className='text-dash-primary-dark-blue'>
        Deposits sent to an asset lock funding address that was never turned into
        credits. Send them to any Dash address you control.
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
              Network fee {dash(result.feeDuffs)}
              {result.swept
                ? ' · address drained and closed'
                : ` · ${dash(result.changeDuffs)} left at the funding address`}
            </Text>
          </div>
        </ValueCard>
      )}

      {!listState.loading && listState.data != null && listState.data.length === 0 && (
        <ValueCard colorScheme='lightGray' className='flex flex-col gap-2'>
          <Text size='lg' weight='medium' className='text-gray-600'>
            Nothing to recover
          </Text>
          <Text size='sm' className='text-gray-500'>
            This wallet has no unfinished asset lock funding addresses.
          </Text>
        </ValueCard>
      )}

      <div className='flex flex-col gap-3'>
        {listState.data?.map(entry => (
          <React.Fragment key={entry.address}>
            <AddressCard
              entry={entry}
              isSelected={selected === entry.address}
              onSelect={() => {
                if (!entry.hasKey) return
                setSelected(prev => prev === entry.address ? null : entry.address)
                setForm(emptyForm())
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
                    value={form.toAddress}
                    onChange={(e) => {
                      const value = e.target.value
                      setForm(prev => ({ ...prev, toAddress: value }))
                      setError(null)
                    }}
                    size='xl'
                    className='w-full break-all'
                  />
                </div>

                <div className='flex flex-col gap-2'>
                  <FieldLabel>Amount</FieldLabel>
                  <div className='flex gap-2'>
                    <Input
                      placeholder='Everything'
                      value={form.sendMax ? '' : form.amountInput}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm(prev => ({ ...prev, amountInput: value, sendMax: false }))
                        setError(null)
                      }}
                      size='xl'
                      inputMode='decimal'
                      disabled={form.sendMax}
                      className='w-full'
                    />
                    <Button
                      colorScheme={form.sendMax ? 'brand' : 'lightGray'}
                      onClick={() => {
                        setForm(prev => ({ ...prev, sendMax: !prev.sendMax }))
                        setError(null)
                      }}
                    >
                      Max
                    </Button>
                  </div>
                  <Text size='xs' dim>
                    {form.sendMax
                      ? `Sends the whole deposit (${dash(entry.balanceDuffs)}) less the network fee`
                      : 'The rest stays at the funding address and remains recoverable'}
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

      {confirmOpen && selectedEntry != null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white p-4'>
            <Text size='lg' weight='medium'>Confirm recovery</Text>
            <div className='mt-2 flex flex-col gap-1'>
              <Text size='sm' dim>
                Send {form.sendMax ? 'the whole deposit' : dash(parseDashAmount(form.amountInput.trim(), CORE_DASH_DECIMALS)?.toString() ?? null)}
              </Text>
              <Text size='xs' dim className='break-all' monospace>
                to {form.toAddress.trim()}
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
