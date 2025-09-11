import React from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/layout/EmptyState'
import { Text } from 'dash-ui-kit/react'

interface NoIdentitiesProps {
  walletType?: string
}

export default function NoIdentities ({ walletType }: NoIdentitiesProps): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className='screen-content'>
      <EmptyState
        title={walletType === 'seedphrase'
          ? <>You <Text weight='bold' color='blue' className='!text-[size:inherit] !leading-[inherit]'>Don't Have any Identities</Text> yet</>
          : <>You <Text weight='bold' color='blue' className='!text-[size:inherit] !leading-[inherit]'>Don't Have any Identities</Text> imported yet</>}
        {...(walletType !== 'seedphrase' && {
          buttonText: 'Add an identity',
          onButtonClick: () => { void navigate('/import-keystore') }
        })}
        description={walletType === 'seedphrase' ? 'We will add identity creation soon.' : undefined}
      />
    </div>
  )
}
