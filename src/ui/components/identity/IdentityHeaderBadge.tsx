import React from 'react'
import { Avatar, Identifier, Text, ValueCard } from 'dash-ui-kit/react'

interface IdentityHeaderBadgeProps {
  identity: string
  walletName?: string
  onClick?: () => void
  className?: string
}

function IdentityHeaderBadge ({ identity, walletName, onClick, className }: IdentityHeaderBadgeProps): React.JSX.Element {
  const clickable = onClick != null

  return (
    <ValueCard
      colorScheme='lightGray'
      border={false}
      className={`${className ?? ''} py-[0.5rem] px-[0.625rem] ${clickable ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className='flex items-center gap-2'>
        <div className='flex items-center justify-center rounded-full w-[2rem] h-[2rem] bg-[rgba(12,28,51,0.03)]'>
          <Avatar username={identity} className='w-4 h-4' />
        </div>
        <div className='flex flex-col gap-1'>
          <Identifier className='text-xs leading-[100%]' highlight='both' middleEllipsis edgeChars={4}>
            {identity}
          </Identifier>
          {walletName != null && walletName !== '' && (
            <Text size='xs' dim className='leading-[90%]'>
              {walletName}
            </Text>
          )}
        </div>
      </div>
    </ValueCard>
  )
}

export default IdentityHeaderBadge
