import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { IdentityTypeSelector, type IdentityType } from '../../components/importIdentity'

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
        <IdentityTypeSelector
          selectedType={selectedType}
          onTypeSelect={setSelectedType}
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
