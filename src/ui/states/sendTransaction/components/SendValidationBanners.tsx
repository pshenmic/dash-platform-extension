import React from 'react'
import { Banner } from '../../../components/cards'
import { MODE_WARNINGS, UNSUPPORTED_TRANSFER_MESSAGE } from '../constants'
import type { TransferMode } from '../types'

interface SendValidationBannersProps {
  formError: string | null
  // Entered amount is below the minimum (or above the maximum) for this transfer.
  amountError: string | null
  isSameParty: boolean
  transferMode: TransferMode
  // Amount plus the shielded fee exceeds the chosen shielded source.
  shieldedSourceShortfall: boolean
  selectedShieldedAddress: string | null
}

export function SendValidationBanners ({
  formError,
  amountError,
  isSameParty,
  transferMode,
  shieldedSourceShortfall,
  selectedShieldedAddress
}: SendValidationBannersProps): React.JSX.Element {
  return (
    <>
      <Banner variant='error' message={formError} />
      <Banner variant='error' message={amountError} />
      {isSameParty && (
        <Banner variant='error' message='Recipient must be different from the sender' />
      )}
      {transferMode === 'unsupported' && (
        <Banner variant='error' message={UNSUPPORTED_TRANSFER_MESSAGE} />
      )}
      {shieldedSourceShortfall && (
        <Banner
          variant='error'
          message={selectedShieldedAddress != null
            ? 'The amount plus the shielded fee exceeds the balance of the selected source address'
            : 'The amount plus the shielded fee exceeds your shielded balance'}
        />
      )}
      <Banner variant='warning' message={MODE_WARNINGS[transferMode] ?? null} />
    </>
  )
}
