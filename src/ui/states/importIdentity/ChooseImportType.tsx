import React, { useState } from 'react'
import { Text, Heading, ValueCard, ProgressStepBar } from 'dash-ui/react'
import { useNavigate } from 'react-router-dom'

interface ImportOption {
  id: string
  title: string
  icon?: string
  disabled?: boolean
}

function ChooseImportType(): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedOption, setSelectedOption] = useState<string>('')

  const importOptions: ImportOption[] = [
    {
      id: 'keystore',
      title: 'Import Using Key Store',
      disabled: true
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
    
    setSelectedOption(optionId)
    
    // Navigate based on selected option
    switch (optionId) {
      case 'seedphrase':
        navigate('/import-seed-phrase')
        break
      case 'keystore':
        // TODO: Navigate to keystore import when implemented
        break
      case 'phoneapp':
        // TODO: Navigate to phone app import when implemented
        break
    }
  }

  return (
    <div className='flex flex-col h-full bg-white pb-12'>
      <div className='mb-8'>
        <div className='flex items-start gap-3'>
          <div className='flex-1'>
            <Heading level={1} className='text-3xl font-extrabold text-gray-900 mb-2 leading-tight'>
              Choose Import Type
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
            className={`w-full p-4 cursor-pointer transition-all ${
              option.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50'
            }`}
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
                    width="14" 
                    height="14" 
                    viewBox="0 0 14 14" 
                    fill="none"
                    className='text-blue-500'
                  >
                    <path 
                      d="M11.6667 3.5L5.25 9.91667L2.33334 7" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
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
