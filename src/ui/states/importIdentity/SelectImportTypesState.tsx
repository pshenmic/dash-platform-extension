import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, WalletIcon, ShieldSmallIcon } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { OptionSelector, type OptionItem } from '../../components/controls'

export type IdentityType = 'regular' | 'masternode'

const identityOptions: OptionItem[] = [
  {
    id: 'regular',
    label: 'Identity',
    boldLabel: 'Regular',
    icon: WalletIcon
  },
  {
    id: 'masternode',
    label: 'Identity',
    boldLabel: 'Masternode',
    icon: ShieldSmallIcon
  }
]

function SelectImportTypesState (): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<IdentityType>('regular')

  const handleNext = (): void => {
    const route = selectedType === 'regular'
      ? '/import-regular-identity'
      : '/import-masternode-identity'
    navigate(route)
  }

  return (
    <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
      <TitleBlock
        title='Identity Type'
        description='Choose what Identity type you will import to your wallet.'
      />

      <div className='flex flex-col gap-[0.875rem]'>
        <OptionSelector
          options={identityOptions}
          selectedId={selectedType}
          onOptionSelect={(id) => setSelectedType(id as IdentityType)}
        />

        <div className='mt-4'>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default withAccessControl(SelectImportTypesState, {
  requireWallet: false
})
