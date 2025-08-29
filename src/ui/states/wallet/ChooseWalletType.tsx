import React from 'react'
import {
  Text,
  Heading,
  ValueCard,
  DashLogo,
  KeyIcon,
  ProtectedMessageIcon
} from 'dash-ui/react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../../types/OutletContext'
import { WalletType } from '../../../types'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'

interface ImportOption {
  id: string
  title: string
  icon?: React.ReactNode
  disabled?: boolean
  handleClick: () => Promise<void>
}

function ChooseWalletType (): React.JSX.Element {
  const navigate = useNavigate()
  const { setSelectedWallet, createWallet } = useOutletContext<OutletContext>()

  const extensionAPI = useExtensionAPI()

  const createKeystoreWallet = async (): Promise<void> => {
    const { walletId } = await createWallet(WalletType.keystore)
    await extensionAPI.switchWallet(walletId)
    setSelectedWallet(walletId)
    void navigate('/wallet-created')
  }

  const createSeedPhraseWallet = async (): Promise<void> => {
    void navigate('/import-seed-phrase')
  }

  const importOptions: ImportOption[] = [
    {
      id: 'keystore',
      title: 'Key Store',
      icon: <KeyIcon />,
      handleClick: createKeystoreWallet
    },
    {
      id: 'seedphrase',
      title: 'Seed Phrase',
      icon: <ProtectedMessageIcon />,
      handleClick: createSeedPhraseWallet
    }
  ]

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
                You can create your wallet using these options, more options will come in future updates.
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
            onClick={option.handleClick}
            disabled={option.disabled === true}
            colorScheme='lightGray'
            border={false}
            clickable={option.disabled !== true}
            className={option.disabled === true ? 'opacity-40' : ''}
          >
            <div className='flex items-center gap-4'>
              <div className={`w-8 h-8 flex items-center justify-center bg-dash-brand/15 rounded-full ${
                option.disabled === true ? 'text-gray-400' : 'text-blue-500'}`}
              >
                {option.icon}
              </div>

              <Text className={`font-bold text-base ${option.disabled === true ? 'text-gray-400' : 'text-gray-900'}`}>
                {option.title}
              </Text>
            </div>
          </ValueCard>
        ))}
      </div>
    </div>
  )
}

export default ChooseWalletType
