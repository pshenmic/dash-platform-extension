import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import type { OutletContext } from '../../types/OutletContext'
import { WalletType } from '../../../types'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { Stage1SavePhrase } from './stages/Stage1SavePhrase'
import { Stage2VerifyPhrase } from './stages/Stage2VerifyPhrase'

type Stage = 1 | 2

const BLANK_COUNT = 4
const ENTROPY_12 = 128
const ENTROPY_24 = 256

function pickBlankIndices (mnemonic: string[]): Set<number> {
  const indices = new Set<number>()
  while (indices.size < Math.min(BLANK_COUNT, mnemonic.length)) {
    indices.add(Math.floor(Math.random() * mnemonic.length))
  }
  return indices
}

function CreateSeedWalletState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const extensionAPI = useExtensionAPI()
  const { setCurrentWallet, createWallet } = useOutletContext<OutletContext>()

  const rawStage = parseInt(searchParams.get('stage') ?? '1', 10)
  const stage = (rawStage === 1 || rawStage === 2 ? rawStage : 1) as Stage

  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [blankIndices, setBlankIndices] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateNew = useCallback((count: 12 | 24): void => {
    const entropy = count === 12 ? ENTROPY_12 : ENTROPY_24
    const phrase = generateMnemonic(wordlist, entropy)
    setMnemonic(phrase.split(' '))
  }, [])

  useEffect(() => {
    generateNew(12)
  }, [generateNew])

  const handleWordCountChange = (count: 12 | 24): void => {
    setWordCount(count)
    generateNew(count)
  }

  const handleContinue = (): void => {
    setBlankIndices(pickBlankIndices(mnemonic))
    void navigate('/create-seed-wallet?stage=2')
  }

  const handleComplete = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const { walletId } = await createWallet(WalletType.seedphrase, mnemonic.join(' '))
      await extensionAPI.switchWallet(walletId)
      setCurrentWallet(walletId)
      void navigate('/wallet-created')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet')
    } finally {
      setIsLoading(false)
    }
  }

  if (stage === 2) {
    return (
      <Stage2VerifyPhrase
        mnemonic={mnemonic}
        wordCount={wordCount}
        blankIndices={blankIndices}
        isLoading={isLoading}
        error={error}
        onComplete={() => { void handleComplete() }}
      />
    )
  }

  return (
    <Stage1SavePhrase
      mnemonic={mnemonic}
      wordCount={wordCount}
      onWordCountChange={handleWordCountChange}
      onContinue={handleContinue}
    />
  )
}

export default withAccessControl(CreateSeedWalletState, {
  requireWallet: false
})
