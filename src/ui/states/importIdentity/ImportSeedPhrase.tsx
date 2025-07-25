import React, { useState } from 'react'
import { Text, Heading, Button, Input, Switch, ProgressStepBar } from 'dash-ui/react'
// import { withAuthCheck } from '../../components/auth/withAuthCheck'

function ImportSeedPhrase(): React.JSX.Element {
  const [seedWords, setSeedWords] = useState<string[]>(Array(12).fill(''))
  const [wordCount, setWordCount] = useState<12 | 24>(12)

  const wordCountOptions = [
    { label: '12 Word', value: 12 },
    { label: '24 Word', value: 24 }
  ]

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...seedWords]
    newWords[index] = value
    setSeedWords(newWords)
  }

  const handleWordCountChange = (count: 12 | 24) => {
    setWordCount(count)
    // Расширяем или сокращаем массив слов
    if (count === 24 && seedWords.length === 12) {
      setSeedWords([...seedWords, ...Array(12).fill('')])
    } else if (count === 12 && seedWords.length === 24) {
      setSeedWords(seedWords.slice(0, 12))
    }
  }

  const handleImport = () => {
    // Логика импорта сид-фразы
    const validWords = seedWords.filter(word => word.trim() !== '')
    console.log('Importing seed phrase:', validWords)
  }

  const isImportDisabled = seedWords.slice(0, wordCount).some(word => word.trim() === '')

  return (
    <div className='flex flex-col h-full bg-white'>
      <div className='flex-1 px-4 pb-4'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-start gap-3 mb-6'>
            <div className='flex-1'>
              <Heading level={1} className='text-3xl font-extrabold text-gray-900 mb-2 leading-tight'>
                Import your Seed Phrase
              </Heading>
              <Text className='text-sm text-gray-500 leading-relaxed'>
                Paste your DashPay seed phrase from mobile wallet or Dash Evo tool
              </Text>
            </div>
          </div>
        </div>

        {/* Word Count Selector */}
        <div className='mb-6'>
          <Switch
            options={wordCountOptions}
            value={wordCount}
            onChange={handleWordCountChange}
          />
        </div>

        {/* Seed Words Grid */}
        <div className='mb-8'>
          <div className='grid grid-cols-3 gap-2.5'>
            {Array.from({ length: wordCount }, (_, index) => (
              <Input
                key={index}
                value={seedWords[index] || ''}
                onChange={(e) => handleWordChange(index, e.target.value)}
                prefix={`${index + 1}.`}
                placeholder=""
              />
            ))}
          </div>
        </div>

        {/* Import Button */}
        <div className='mb-6'>
          <Button
            onClick={handleImport}
            disabled={isImportDisabled}
            className={`w-full py-4 px-6 rounded-2xl font-medium text-base transition-all duration-200 ${
              isImportDisabled
                ? 'bg-blue-100 text-blue-400 cursor-not-allowed opacity-60'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md active:scale-98'
            }`}
          >
            Import Identity
          </Button>
        </div>

        {/* Progress Steps */}
        <div className='mt-auto'>
          <ProgressStepBar currentStep={3} totalSteps={4} />
        </div>
      </div>
    </div>
  )
}

// export default withAuthCheck(ImportSeedPhrase)
export default ImportSeedPhrase
