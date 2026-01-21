import React from 'react'
import { Text, Identifier, ValueCard } from 'dash-ui-kit/react'

interface VoteChoiceCardProps {
  choiceStr: string
}

export function VoteChoiceCard ({ choiceStr }: VoteChoiceCardProps): React.JSX.Element {
  if (typeof choiceStr !== 'string') {
    return <Text size='sm'>n/a</Text>
  }

  const [choice, parameter] = choiceStr.split(/[()]/)

  if (parameter !== '' && parameter !== undefined) {
    return (
      <ValueCard
        className='flex flex-col gap-2.5 !p-4 items-start'
        colorScheme='white'
        size='md'
        border
      >
        <Text size='sm' weight='medium'>
          {choice}
        </Text>
        <Identifier
          className='!text-[1.25rem] w-full'
          avatar
          copyButton
          middleEllipsis
          edgeChars={5}
        >
          {parameter}
        </Identifier>
      </ValueCard>
    )
  }

  return (
    <ValueCard
      className='flex flex-col gap-2.5 !p-4 items-start'
      colorScheme='white'
      size='md'
      border
    >
      <Text size='sm' weight='medium'>
        {choice}
      </Text>
    </ValueCard>
  )
}
