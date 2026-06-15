import React, { useState, useMemo } from 'react'
import { Text, Button, Input, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { SeedPhraseSecurityNotice } from '../SeedPhraseSecurityNotice'

interface Props {
  mnemonic: string[]
  wordCount: 12 | 24
  blankIndices: Set<number>
  isLoading: boolean
  error: string | null
  onComplete: () => void
}

export function Stage2VerifyPhrase ({ mnemonic, wordCount, blankIndices, isLoading, error, onComplete }: Props): React.JSX.Element {
  const [userInputs, setUserInputs] = useState<Record<number, string>>({})

  const isAllCorrect = useMemo(
    () => Array.from(blankIndices).every(
      (i) => (userInputs[i] ?? '').trim().toLowerCase() === mnemonic[i]?.toLowerCase()
    ),
    [blankIndices, userInputs, mnemonic]
  )

  const handleInputChange = (index: number, value: string): void => {
    setUserInputs((prev) => ({ ...prev, [index]: value }))
  }

  const words = mnemonic.slice(0, wordCount)

  return (
    <div className='flex flex-col min-h-full bg-white -mt-16 pb-2'>
      <div className='mb-4'>
        <TitleBlock
          title='Fill in your Seed Phrase'
          description="This recovery phrase is your wallet's only backup. If you lose it, no one can help you access your funds. Your recovery phrase is safest when written on paper and stored in a secure place."
          titleClassName='font-extrabold text-gray-900 leading-tight'
        />
      </div>

      <div className='mb-4'>
        <div className='grid grid-cols-3 gap-2.5'>
          {words.map((word, i) => {
            if (blankIndices.has(i)) {
              return (
                <Input
                  key={i}
                  size='md'
                  value={userInputs[i] ?? ''}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  prefix={`${i + 1}.`}
                  placeholder=''
                />
              )
            }

            return (
              <Input
                key={i}
                size='md'
                value={word}
                prefix={`${i + 1}.`}
                readOnly
                className='pointer-events-none'
              />
            )
          })}
        </div>
      </div>

      <SeedPhraseSecurityNotice />

      {error != null && (
        <div className='mb-3'>
          <Text color='red' size='sm'>{error}</Text>
        </div>
      )}

      <div className='pb-4'>
        <Button
          colorScheme='brand'
          size='xl'
          onClick={onComplete}
          disabled={!isAllCorrect || isLoading}
          className='w-full h-[3.625rem]'
        >
          {isLoading ? '...' : 'Continue'}
        </Button>
      </div>

      <ProgressStepBar currentStep={2} totalSteps={2} className='pb-6' />
    </div>
  )
}
