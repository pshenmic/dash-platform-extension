import React, { useState } from 'react'
import {
  Text,
  ValueCard,
  KeyIcon,
  ProtectedMessageIcon,
  Button
} from 'dash-ui-kit/react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types/OutletContext'
import { WalletType } from '../../../types'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { TitleBlock } from '../../components/layout/TitleBlock'

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
      label: 'Create ',
      boldLabel: 'Seed Phrase',
      description: 'Seed Phrase is a row of random words that include encrypted information about your wallet.',
      icon: <ProtectedMessageIcon />,
      handleClick: createSeedPhraseWallet
    },
    {
      id: 'keystore',
      label: 'Create ',
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
        {walletOptions.map((option) => {
          const selected = option.id === selectedId
          const disabled = option.disabled === true
          return (
            <ValueCard
              key={option.id}
              onClick={() => { if (!disabled) setSelectedId(option.id) }}
              disabled={disabled}
              colorScheme={selected ? 'lightBlue' : 'lightGray'}
              border={false}
              clickable={!disabled}
              className={`py-3 px-6 border-l-2 ${selected ? 'border-l-[#4C7EFF]' : 'border-l-transparent'} ${disabled ? 'opacity-40' : ''}`}
            >
              <div className='flex items-center gap-4'>
                <div className='w-[2.125rem] h-[2.125rem] rounded-full flex items-center justify-center shrink-0 bg-[rgba(76,126,255,0.15)] text-[#4C7EFF]'>
                  {option.icon}
                </div>
                <div className='flex flex-col gap-1'>
                  <Text size='sm' className='text-[#0C1C33]'>
                    {option.label}<span className='font-extrabold'>{option.boldLabel}</span>
                  </Text>
                  <Text size='xs' className='text-[rgba(12,28,51,0.5)] leading-tight'>
                    {option.description}
                  </Text>
                </div>
              </div>
            </ValueCard>
          )
        })}
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
