import React from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/layout/EmptyState'
import { Text } from 'dash-ui-kit/react'

export default function NoIdentities (): React.JSX.Element {
  const navigate = useNavigate()

  const handleImportClick = (): void => {
    void navigate('/import-keystore')
  }

  return (
    <div className='screen-content'>
      <EmptyState
        title={<>You <Text weight='bold' color='blue' className='!text-[size:inherit] !leading-[inherit]'>Don't Have any Identities</Text> imported yet</>}
        buttonText='Add an identity'
        onButtonClick={handleImportClick}
      />
    </div>
  )
}
