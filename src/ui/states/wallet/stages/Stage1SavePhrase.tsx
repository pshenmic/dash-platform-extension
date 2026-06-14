import React, { useState } from 'react'
import { Button, Switch, Tooltip, ProgressStepBar } from 'dash-ui-kit/react'
import { TitleBlock } from '../../../components/layout/TitleBlock'
import { SeedPhraseSecurityNotice } from '../SeedPhraseSecurityNotice'

const wordCountOptions = [
  { label: '12 Word', value: 12 },
  { label: '24 Word', value: 24 }
]

interface Props {
  mnemonic: string[]
  wordCount: 12 | 24
  onWordCountChange: (count: 12 | 24) => void
  onContinue: () => void
}

function SeedWordPill ({ index, word }: { index: number, word: string }): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 px-3 py-2.5 border border-[rgba(12,28,51,0.35)] rounded-xl'>
      <span className='text-sm text-[rgba(12,28,51,0.35)] shrink-0'>{index + 1}.</span>
      <span className='text-sm font-medium text-[#0C1C33]'>{word}</span>
    </div>
  )
}

export function Stage1SavePhrase ({ mnemonic, wordCount, onWordCountChange, onContinue }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(mnemonic.join(' ')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className='flex flex-col min-h-full bg-white -mt-16 pb-2'>
      <div className='mb-4'>
        <TitleBlock
          title='Save your Seed Phrase'
          description="This recovery phrase is your wallet's only backup. If you lose it, no one can help you access your funds. Your recovery phrase is safest when written on paper and stored in a secure place."
          titleClassName='font-extrabold text-gray-900 leading-tight'
        />
      </div>

      <div className='mb-4'>
        <Switch
          options={wordCountOptions}
          value={wordCount}
          onChange={onWordCountChange}
        />
      </div>

      <div className='mb-4'>
        <div className='grid grid-cols-3 gap-2'>
          {mnemonic.map((word, i) => (
            <SeedWordPill key={i} index={i} word={word} />
          ))}
        </div>
      </div>

      <SeedPhraseSecurityNotice />

      <div className='flex gap-2 pb-4'>
        <Button
          colorScheme='brand'
          size='xl'
          onClick={onContinue}
          className='flex-1 h-[3.625rem]'
          disabled={mnemonic.length === 0}
        >
          Continue
        </Button>
        <Tooltip content='Copied!' side='top' sideOffset={6} open={copied}>
          <Button
            variant='outline'
            colorScheme='brand'
            size='xl'
            onClick={handleCopy}
            className='shrink-0 h-[3.625rem]'
          >
            Copy
          </Button>
        </Tooltip>
      </div>

      <ProgressStepBar currentStep={1} totalSteps={2} className='pb-6' />
    </div>
  )
}
