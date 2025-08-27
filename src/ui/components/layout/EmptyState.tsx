import React from 'react'
import { Button, Heading } from 'dash-ui/react'
import { useStaticAsset } from '../../hooks/useStaticAsset'

interface EmptyStateProps {
  title: string | React.ReactNode
  buttonText: string
  onButtonClick: () => void
  className?: string
}

export function EmptyState({ title, buttonText, onButtonClick, className = '' }: EmptyStateProps): React.JSX.Element {
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

        {/* Button */}
        <div className='w-full'>
          <Button
            onClick={onButtonClick}
            variant='outline'
            size='xl'
            className='w-full h-[58px] rounded-xl border border-dash-brand bg-transparent text-dash-brand hover:bg-dash-brand hover:text-white transition-colors flex items-center justify-center gap-4'
          >
            <div className='w-4 h-4 flex items-center justify-center'>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className='text-current'
              >
                <path 
                  d="M8 1V15M1 8H15" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className='text-sm font-normal'>
              {buttonText}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
