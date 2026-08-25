import React, { useState } from 'react'
import {
  KeyIcon,
  ProtectedMessageIcon,
  Button
} from 'dash-ui-kit/react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types/OutletContext'
import { WalletType } from '../../../types'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { SelectableCard } from '../../components/controls'

interface WalletOption {
  id: string
  label: string
  boldLabel: string
  description: string
  icon: React.ReactNode
  disabled?: boolean
  handleClick: () => Promise<void>
}

function ChooseWalletType (): React.JSX.Element {
  const navigate = useNavigate()
  const { setCurrentWallet, createWallet } = useOutletContext<OutletContext>()
  const extensionAPI = useExtensionAPI()

  const [selectedId, setSelectedId] = useState<string>('seedphrase')
  const [isLoading, setIsLoading] = useState(false)

  const createKeystoreWallet = async (): Promise<void> => {
    const { walletId } = await createWallet(WalletType.keystore)
    await extensionAPI.switchWallet(walletId)
    setCurrentWallet(walletId)
    void navigate('/wallet-created')
  }

  const createSeedPhraseWallet = async (): Promise<void> => {
    void navigate('/import-seed-phrase')
  }

  const walletOptions: WalletOption[] = [
    {
      id: 'seedphrase',
      label: 'Import ',
      boldLabel: 'Seed Phrase',
      description: 'Seed Phrase is a row of random words that include encrypted information about your wallet.',
      icon: <ProtectedMessageIcon />,
      handleClick: createSeedPhraseWallet
    },
    {
      id: 'keystore',
      label: 'Import ',
      boldLabel: 'Private Key',
      description: 'Private Key is a unique string of characters that allows access to your wallet.',
      icon: <KeyIcon />,
      handleClick: createKeystoreWallet
    }
  ]

  const handleContinue = async (): Promise<void> => {
    const option = walletOptions.find((o) => o.id === selectedId)
    if (option == null) return
    setIsLoading(true)
    try {
      await option.handleClick()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col h-full bg-white -mt-16 pb-6'>
      <div className='flex items-start gap-3'>
        <div className='flex flex-col gap-2.5 flex-1'>
          <TitleBlock
            title='Choose Wallet Type'
            description='You can create your wallet using these options, more options will come in future updates.'
            titleClassName='font-extrabold text-gray-900 leading-tight'
          />
        </div>
      </div>

      <div className='flex flex-col gap-2 mb-auto'>
        {walletOptions.map((option) => (
          <SelectableCard
            key={option.id}
            selected={option.id === selectedId}
            disabled={option.disabled === true}
            onClick={() => setSelectedId(option.id)}
            icon={option.icon}
            label={option.label}
            boldLabel={option.boldLabel}
            description={option.description}
          />
        ))}
      </div>

      <Button
        colorScheme='brand'
        size='xl'
        onClick={() => { void handleContinue() }}
        disabled={isLoading}
        className='w-full h-[3.625rem]'
      >
        Continue
      </Button>
    </div>
  )
}

export default ChooseWalletType
