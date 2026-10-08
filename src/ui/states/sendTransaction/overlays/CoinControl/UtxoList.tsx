import React from 'react'
import { CORE_DASH_DECIMALS, formatDateTime } from '../../../../../utils'
import type { CoreUtxo, UtxoRef } from '../../types'
import { CoinRow } from './CoinRow'

interface UtxoListProps {
  utxos: CoreUtxo[]
  selected: UtxoRef[]
  rate: number | null
  onChange: (selected: UtxoRef[]) => void
}

const sameRef = (a: UtxoRef, b: UtxoRef): boolean => a.txid === b.txid && a.vout === b.vout

// Core UTXOs of the wallet with a check per output.
export function UtxoList ({ utxos, selected, rate, onChange }: UtxoListProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-2'>
      {utxos.map(utxo => {
        const isSelected = selected.some(ref => sameRef(ref, utxo))
        return (
          <CoinRow
            key={`${utxo.txid}:${utxo.vout}`}
            address={utxo.address}
            amount={BigInt(utxo.amount)}
            decimals={CORE_DASH_DECIMALS}
            rate={rate}
            selected={isSelected}
            meta={formatDateTime(utxo.timestamp)}
            onToggle={() => onChange(isSelected ? selected.filter(ref => !sameRef(ref, utxo)) : [...selected, { txid: utxo.txid, vout: utxo.vout }])}
          />
        )
      })}
    </div>
  )
}
