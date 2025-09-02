import React from 'react'
import { Button, Heading, PlusIcon } from 'dash-ui/react'
import { useStaticAsset } from '../../hooks/useStaticAsset'

interface EmptyStateProps {
  title: string | React.ReactNode
  buttonText: string
  onButtonClick: () => void
  className?: string
}

export function EmptyState ({ title, buttonText, onButtonClick, className = '' }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      <div className='relative top-0 left-0 w-full h-[300px] pointer-events-none'>
        <div className='absolute w-full top-[24px]'>
          <img
            src={useStaticAsset('empty-state-background-762ec2.png')}
            alt='Background pattern'
            className='relative w-[500px] -left-[10%] max-w-none -top-[150px] rotate-[-145deg]'
          />
        </div>
      </div>

      <div className='flex flex-column flex-grow gap-6 relative z-10 flex flex-col px-4'>
        <div className='text-center'>
          <Heading
            weight='medium'
            className='!text-[36px] !leading-[1em] !tracking-[-0.04em] text-dash-primary-dark-blue'
          >
            {title}
          </Heading>
        </div>

        <div className='w-full'>
          <Button
            onClick={onButtonClick}
            variant='outline'
            size='xl'
            className='w-full h-[3.625rem] gap-4'
          >
            <PlusIcon />
            <span className='text-sm font-normal'>
              {buttonText}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
