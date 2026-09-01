import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TitleBlock } from '../../components/layout/TitleBlock'

function CoreHomeState (): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4'>
      <TitleBlock
        title='Core'
        description='Coming soon'
        showLogo={false}
      />
      <Text size='sm' dim>
        UTXO / dashd home. Features land in later phases.
      </Text>
    </div>
  )
}

export default withAccessControl(CoreHomeState, { requireWallet: false })
