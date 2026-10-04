import React from 'react'
import { Text } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'

interface SectionStubProps {
  title: string
  description: string
}

export function SectionStub ({ title, description }: SectionStubProps): React.JSX.Element {
  return (
    <div className='flex flex-col gap-4'>
      <TitleBlock
        title={title}
        description='Coming soon'
        showLogo={false}
      />
      <Text size='sm' dim>
        {description}
      </Text>
    </div>
  )
}
