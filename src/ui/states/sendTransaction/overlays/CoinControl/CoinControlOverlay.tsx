import React, { useEffect, useState } from 'react'
import { Button, FilterIcon, Tabs, Text } from 'dash-ui-kit/react'
import { OverlayMenu } from '../../../../components/common'
import { Toggle } from '../../../../components/controls'
import { formatDashAmount, summarizeCoinControl } from '../../../../../utils'
import type { AddressData } from '../../../../components/addresses/types'
import type { CoinControlType } from '../../directions/directionConfig'
import type { CoinControlSelection, CoreUtxo, ShieldedNote } from '../../types'
import { COIN_CONTROL_AUTOMATIC_TEXT, COIN_CONTROL_AUTOMATIC_TITLE, COIN_CONTROL_UNITS } from '../../constants'
import { UtxoList } from './UtxoList'
import { PlatformInputList } from './PlatformInputList'
import { ShieldedNoteList } from './ShieldedNoteList'

interface CoinControlOverlayProps {
  isOpen: boolean
  coinControlType: CoinControlType
  selection: CoinControlSelection
  decimals: number
  utxos: CoreUtxo[]
  addresses: AddressData[]
  notes: ShieldedNote[]
  maxInputs: number
  platformFee: bigint
  rate: number | null
  onClose: () => void
  onApply: (selection: CoinControlSelection) => void
}

type CoinControlTab = 'automatic' | 'manual'

const emptySelection = (coinControlType: CoinControlType): CoinControlSelection => {
  if (coinControlType === 'utxo') return { type: 'utxo', inputs: [] }
  if (coinControlType === 'platformInputs') return { type: 'platformInputs', inputs: [] }
  return { type: 'shieldedNotes', noteIds: [] }
}

// Coin Control screen: automatic input selection or a manual pick of UTXOs, addresses or notes.
export function CoinControlOverlay ({ isOpen, coinControlType, selection, decimals, utxos, addresses, notes, maxInputs, platformFee, rate, onClose, onApply }: CoinControlOverlayProps): React.JSX.Element {
  const [tab, setTab] = useState<CoinControlTab>('automatic')
  const [draft, setDraft] = useState<CoinControlSelection>(selection)
  const [onlySelected, setOnlySelected] = useState(false)

  // Starts from the applied selection every time the screen opens.
  useEffect(() => {
    if (!isOpen) return
    setDraft(selection.type === 'automatic' ? emptySelection(coinControlType) : selection)
    setTab(selection.type === 'automatic' ? 'automatic' : 'manual')
    setOnlySelected(false)
  }, [isOpen])

  const { count, total } = summarizeCoinControl(draft, utxos, notes)
  const [one, many] = COIN_CONTROL_UNITS[coinControlType]
  const pickedBalance = draft.type === 'platformInputs'
    ? addresses.filter(item => draft.inputs.some(input => input.address === item.address)).reduce((sum, item) => sum + BigInt(item.balance ?? '0'), 0n)
    : null
  const feeShortfall = pickedBalance != null && count > 0 && total + platformFee > pickedBalance
  const hasEmptyInput = draft.type === 'platformInputs' && draft.inputs.some(input => BigInt(input.amount) === 0n)
  const canApply = tab === 'automatic' || (count > 0 && total > 0n && !feeShortfall && !hasEmptyInput)

  const manualList = (): React.ReactNode => {
    if (draft.type === 'utxo') {
      const shown = onlySelected ? utxos.filter(utxo => draft.inputs.some(ref => ref.txid === utxo.txid && ref.vout === utxo.vout)) : utxos
      return <UtxoList utxos={shown} selected={draft.inputs} rate={rate} onChange={(inputs) => setDraft({ type: 'utxo', inputs })} />
    }
    if (draft.type === 'platformInputs') {
      const shown = onlySelected ? addresses.filter(item => draft.inputs.some(input => input.address === item.address)) : addresses
      return <PlatformInputList addresses={shown} inputs={draft.inputs} maxInputs={maxInputs} platformFee={platformFee} rate={rate} onChange={(inputs) => setDraft({ type: 'platformInputs', inputs })} />
    }
    if (draft.type === 'shieldedNotes') {
      const shown = onlySelected ? notes.filter(note => draft.noteIds.includes(note.noteId)) : notes
      return <ShieldedNoteList notes={shown} selected={draft.noteIds} rate={rate} onChange={(noteIds) => setDraft({ type: 'shieldedNotes', noteIds })} />
    }
    return null
  }

  const manual = (
    <div className='flex flex-col gap-3 pt-3'>
      <div className='flex items-center justify-between gap-2'>
        <Text size='xs' dim>
          Selected: <span className='text-dash-primary-dark-blue'>{count} {count === 1 ? one : many} - {formatDashAmount(total, decimals)} Dash</span>
        </Text>
        <Toggle checked={onlySelected} onChange={setOnlySelected} label='Only Selected' />
      </div>
      {feeShortfall && <Text size='xs' className='!text-red-500'>Leave {formatDashAmount(platformFee, decimals)} Dash on the selected addresses for the network fee.</Text>}
      {manualList()}
    </div>
  )

  const automatic = (
    <div className='flex flex-col items-center gap-3 py-8 text-center'>
      <div className='flex items-center justify-center w-14 h-14 rounded-full bg-dash-primary-dark-blue/5'>
        <FilterIcon size={24} />
      </div>
      <Text size='md' weight='bold'>{COIN_CONTROL_AUTOMATIC_TITLE}</Text>
      <Text size='xs' dim>{COIN_CONTROL_AUTOMATIC_TEXT}</Text>
      <Button colorScheme='lightGray' size='sm' onClick={() => setTab('manual')}>Switch to Manual</Button>
    </div>
  )

  return (
    <OverlayMenu isOpen={isOpen} onClose={onClose} title='Coin Control' showBackButton onBack={onClose}>
      <div className='flex flex-col gap-4 min-h-full'>
        <Text size='xs' dim>
          Flexible Selector of <span className='font-bold text-dash-primary-dark-blue'>which funds this transfer may spend</span>. Leave the option on automatic if you don't want to select specific addresses.
        </Text>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as CoinControlTab)}
          items={[
            { value: 'automatic', label: 'Automatic', content: automatic },
            { value: 'manual', label: 'Manual', content: manual }
          ]}
        />

        <div className='sticky bottom-0 mt-auto flex gap-3 pt-3 bg-white dark:bg-gray-900'>
          <Button colorScheme='lightBlue' size='xl' className='flex-1' onClick={() => onApply({ type: 'automatic' })}>
            Reset
          </Button>
          <Button colorScheme='brand' size='xl' className='flex-1' disabled={!canApply} onClick={() => onApply(tab === 'automatic' ? { type: 'automatic' } : draft)}>
            Apply
          </Button>
        </div>
      </div>
    </OverlayMenu>
  )
}
