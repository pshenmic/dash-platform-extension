import React from 'react'
import {
  Text,
  Heading,
  ValueCard,
  ProgressStepBar,
  DashLogo,
  KeyIcon,
  ProtectedMessageIcon
} from 'dash-ui/react'
import { useNavigate } from 'react-router-dom'

interface ImportOption {
  id: string
  title: string
  icon?: React.ReactNode
  disabled?: boolean
}

function ChooseImportType (): React.JSX.Element {
  const navigate = useNavigate()

  const importOptions: ImportOption[] = [
    {
      id: 'keystore',
      title: 'Import Using Key Store',
      icon: <KeyIcon />
    },
    {
      id: 'seedphrase',
      title: 'Import Using Seed Phrase',
      icon: <ProtectedMessageIcon />
    }
  ]

  const handleOptionSelect = (optionId: string): void => {
    const option = importOptions.find(opt => opt.id === optionId)
    if (option?.disabled === true) return

    // Navigate based on selected option
    switch (optionId) {
      case 'seedphrase':
        void navigate('/import-seed-phrase')
        break
      case 'keystore':
        void navigate('/import-keystore')
        break
    }
  }

  return (
    <div className='flex flex-col h-full bg-white -mt-16 pb-2'>
      <div className='mb-8'>
        <div className='flex items-start gap-3'>
          <div className='flex flex-col gap-2.5 flex-1'>
            <DashLogo containerSize='3rem' />

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
            clickable={option.disabled !== true}
            className={option.disabled === true ? 'opacity-40' : ''}
          >
            <div className='flex items-center gap-4'>
              {/* Option icon */}
              <div className={`w-8 h-8 flex items-center justify-center bg-dash-brand/15 rounded-full ${
                option.disabled === true
                  ? 'text-gray-400'
                  : 'text-blue-500'
              }`}
              >
                {option.icon}
              </div>

              <Text className={`font-bold text-base ${
                option.disabled === true ? 'text-gray-400' : 'text-gray-900'
              }`}
              >
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
