import React, { useState } from 'react'
import { Text, Heading, Button, Input, Switch, ProgressStepBar } from 'dash-ui/react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { WalletType } from '../../../types/WalletType'
import { withAccessControl } from '../../components/auth/withAccessControl'

function ImportSeedPhrase(): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [seedWords, setSeedWords] = useState<string[]>(Array(12).fill(''))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (count === 24 && seedWords.length === 12) {
      setSeedWords([...seedWords, ...Array(12).fill('')])
    } else if (count === 12 && seedWords.length === 24) {
      setSeedWords(seedWords.slice(0, 12))
    }
  }

  const extractWords = (text: string): string[] => {
    return text
      .trim()
      .split(/[\s,\n\t]+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase().trim())
  }

  const fillWordsToLength = (words: string[], targetLength: number): string[] => {
    return [...words, ...Array(Math.max(0, targetLength - words.length)).fill('')]
  }

  const shouldAutoSwitchWordCount = (
    words: string[], 
    startIndex: number, 
    currentWordCount: 12 | 24,
    currentSeedWords: string[]
  ): boolean => {
    if (startIndex !== 0) return false
    
    const wordLength = words.length
    if (wordLength === 24 && currentWordCount === 12) {
      return true
    }

    if (wordLength === 12 && currentWordCount === 24) {
      return currentSeedWords.slice(12, 24).every(word => !word.trim())
    }
    
    return false
  }

  const handlePaste = (startIndex: number) => async (event: React.ClipboardEvent) => {
    event.preventDefault()
    
    try {
      const clipboardText = event.clipboardData.getData('text')
      if (!clipboardText.trim()) return

      const words = extractWords(clipboardText)
      if (words.length === 0) return

      // Check if we need to auto-switch word count
      if (shouldAutoSwitchWordCount(words, startIndex, wordCount, seedWords)) {
        const newWordCount = wordCount === 12 ? 24 : 12
        setWordCount(newWordCount)
        setSeedWords(fillWordsToLength(words, newWordCount))
        return
      }

      // Fill the existing array starting from the selected index
      const newWords = [...seedWords]
      words.forEach((word, index) => {
        const targetIndex = startIndex + index
        if (targetIndex < wordCount) {
          newWords[targetIndex] = word
        }
      })
      setSeedWords(newWords)
    } catch (error) {
      console.warn('Error pasting from clipboard:', error)
    }
  }

  const handleImport = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const validWords = seedWords.slice(0, wordCount).filter(word => word.trim() !== '')
      const mnemonic = validWords.join(' ')
      
      console.log('Importing seed phrase:', mnemonic)

      // Create wallet with seed phrase
      const { walletId } = await extensionAPI.createWallet(WalletType.seedphrase, mnemonic)
      console.log('Created wallet with ID:', walletId)

      // Switch to the new wallet
      await extensionAPI.switchWallet(walletId, 'testnet')
      console.log('Switched to wallet:', walletId)

      // Get wallet information
      try {
        const identities = await extensionAPI.getIdentities()
        console.log('Available identities:', identities)

        const currentIdentity = await extensionAPI.getCurrentIdentity()
        console.log('Current identity:', currentIdentity)

        // TODO: Get balance and other wallet information when available
        console.log('Wallet imported successfully!')
      } catch (infoError) {
        console.warn('Could not load wallet information:', infoError)
        // Continue to success screen even if we can't load info immediately
      }

      // Navigate to success screen
      navigate('/wallet-created')
    } catch (err) {
      console.warn('Import failed:', err)
      setError((err as Error).message || 'Failed to import seed phrase')
    } finally {
      setIsLoading(false)
    }
  }

  const isImportDisabled = seedWords.slice(0, wordCount).some(word => word.trim() === '')

  return (
    <div className='flex flex-col h-full bg-white pb-12'>
      <div className='mb-6'>
        <div className='flex items-start gap-3'>
          <div className='flex-1'>
            <Heading level={1} className='text-3xl font-extrabold text-gray-900 mb-2 leading-tight'>
              Import your Seed Phrase
            </Heading>
            <div className='!leading-tight'>
              <Text size='sm' dim>
                Paste your DashPay seed phrase from mobile wallet or Dash Evo tool
              </Text>
            </div>
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
              size='md'
              key={index}
              value={seedWords[index] || ''}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onPaste={handlePaste(index)}
              prefix={`${index + 1}.`}
              placeholder=''
            />
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error != null && (
        <div className='mb-4'>
          <Text color='red' size='sm'>
            {error}
          </Text>
        </div>
      )}

      {/* Import Button */}
      <div className='mb-6'>
        <Button
          onClick={() => void handleImport()}
          disabled={isImportDisabled || isLoading}
          colorScheme='brand'
          className='w-full'
        >
          {isLoading ? 'Importing...' : 'Import Identity'}
        </Button>
      </div>

      {/* Progress Steps */}
      <div className='mt-auto'>
        <ProgressStepBar currentStep={3} totalSteps={4} />
      </div>
    </div>
  )
}

export default withAccessControl(ImportSeedPhrase, { 
  requireWallet: false 
})
