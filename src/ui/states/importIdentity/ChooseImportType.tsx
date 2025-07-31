import React from 'react'
import { Text, Heading, ValueCard, ProgressStepBar, DashLogo } from 'dash-ui/react'
import { useNavigate } from 'react-router-dom'

interface ImportOption {
  id: string
  title: string
  icon?: string
  disabled?: boolean
}

function ChooseImportType(): React.JSX.Element {
  const navigate = useNavigate()

  const importOptions: ImportOption[] = [
    {
      id: 'keystore',
      title: 'Import Using Key Store',
    },
    {
      id: 'seedphrase',
      title: 'Import Using Seed Phrase'
    },
    {
      id: 'phoneapp',
      title: 'Import Using Phone App',
      disabled: true
    }
  ]

  const handleOptionSelect = (optionId: string) => {
    const option = importOptions.find(opt => opt.id === optionId)
    if (option?.disabled) return

    // Navigate based on selected option
    switch (optionId) {
      case 'seedphrase':
        navigate('/import-seed-phrase')
        break
      case 'keystore':
        navigate('/import-keystore')
        break
      case 'phoneapp':
        break
    }
  }

  return (
    <div className='flex flex-col h-full bg-white -mt-5 pb-12'>
      <div className='mb-8'>
        <div className='flex items-start gap-3'>
          <div className='flex flex-col gap-2.5 flex-1'>
            <DashLogo containerSize='3rem'/>

            <Heading level={1} className='text-3xl font-extrabold text-gray-900 leading-tight'>
              Choose Wallet Type
            </Heading>
            <div className='!leading-tight'>
              <Text size='sm' dim>
                You can import your identity using these options, more options will come in future updates.
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Import Options */}
      <div className='mb-8 space-y-2'>
        {importOptions.map((option) => (
          <ValueCard
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            disabled={option.disabled}
            colorScheme='lightGray'
            border={false}
            clickable={!option.disabled}
          >
            <div className='flex items-center gap-4'>
              {/* Check icon placeholder */}
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                option.disabled
                  ? 'border-gray-300 bg-gray-100'
                  : 'border-blue-500 bg-blue-50'
              }`}>
                {!option.disabled && (
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 14 14'
                    fill='none'
                    className='text-blue-500'
                  >
                    <path
                      d='M11.6667 3.5L5.25 9.91667L2.33334 7'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round' 
                      strokeLinejoin='round'
                    />
                  </svg>
                )}
              </div>

              <Text className={`font-bold text-base ${
                option.disabled ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {option.title}
              </Text>
            </div>
          </ValueCard>
        ))}
      </div>

      {/* Progress Steps */}
      <div className='mt-auto'>
        <ProgressStepBar currentStep={2} totalSteps={4} />
      </div>
    </div>
  )
}

export default ChooseImportType
