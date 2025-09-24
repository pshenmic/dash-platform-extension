import React, { useState, useEffect } from 'react'
import { useSdk, useExtensionAPI } from '../../hooks'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext, MasternodeIdentityInput } from '../../types'
import {
  Button,
  Text,
  ValueCard,
  Input
} from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { WalletType } from '../../../types'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { PrivateKeyInput, type PrivateKeyInputData } from '../../components/keys'

function ImportMasternodeState(): React.JSX.Element {
  const navigate = useNavigate()
  const sdk = useSdk()
  const { currentNetwork, currentWallet, setCurrentIdentity } = useOutletContext<OutletContext>()
  const extensionAPI = useExtensionAPI()

  const [formData, setFormData] = useState<MasternodeIdentityInput>({
    proTxHash: '',
    ownerKey: '',
    votingKey: '',
    payoutKey: ''
  })
  const [ownerKeyData, setOwnerKeyData] = useState<PrivateKeyInputData>({
    id: 'owner-key',
    value: '',
    isVisible: false,
    hasError: false
  })
  const [votingKeyData, setVotingKeyData] = useState<PrivateKeyInputData>({
    id: 'voting-key',
    value: '',
    isVisible: false,
    hasError: false
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Check wallet type
  useEffect(() => {
    const checkWalletType = async (): Promise<void> => {
      if (currentWallet === null) {
        navigate('/choose-wallet-type')
        return
      }

      try {
        const wallets = await extensionAPI.getAllWallets()
        const currentWalletInfo = wallets.find(wallet => wallet.walletId === currentWallet)

        if (currentWalletInfo?.type !== WalletType.keystore) {
          navigate('/choose-wallet-type')
        }
      } catch (error) {
        console.log('Failed to check wallet type:', error)
        navigate('/choose-wallet-type')
      }
    }

    checkWalletType().catch(console.log)
  }, [currentWallet, extensionAPI, navigate])

  const updateField = (field: keyof MasternodeIdentityInput, value: string | number): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const updateOwnerKey = (id: string, value: string): void => {
    setOwnerKeyData(prev => ({ ...prev, value, hasError: false }))
    updateField('ownerKey', value)
  }

  const updateVotingKey = (id: string, value: string): void => {
    setVotingKeyData(prev => ({ ...prev, value, hasError: false }))
    updateField('votingKey', value)
  }

  const toggleOwnerKeyVisibility = (): void => {
    setOwnerKeyData(prev => ({ ...prev, isVisible: !prev.isVisible }))
  }

  const toggleVotingKeyVisibility = (): void => {
    setVotingKeyData(prev => ({ ...prev, isVisible: !prev.isVisible }))
  }

  const handleImport = async (): Promise<void> => {
    setError(null)
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.proTxHash.trim()) {
        throw new Error('Pro TX Hash is required')
      }
      if (!formData.ownerKey.trim()) {
        throw new Error('Owner Key is required')
      }
      if (!formData.payoutKey.trim()) {
        throw new Error('Payout Key is required')
      }

      // TODO: Implement masternode identity import logic
      // This would involve:
      // 1. Validating the owner private key format
      // 2. Validating the payout address format
      // 3. Validating the operator public key format
      // 4. Creating or finding the masternode identity on the platform
      // 5. Importing the identity with masternode-specific metadata

      console.log('Importing masternode identity with data:', formData)
      
      // For now, just navigate to home
      // In real implementation, you would:
      // await extensionAPI.importMasternodeIdentity(formData)
      // setCurrentIdentity(masternodeIdentityId)
      
      navigate('/home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = Boolean(
    formData.proTxHash.trim() &&
    formData.ownerKey.trim() &&
    formData.payoutKey.trim()
  )

  return (
    <div className='flex flex-col gap-2 flex-1 -mt-16 pb-2'>
      <TitleBlock
        title='Authorization Block'
        description='Enter your masternode credentials to authorize the import.'
      />

      <div className='flex flex-col gap-[0.875rem]'>
        {/* Pro TX Hash */}
        <div>
          <Text dim className='mb-2'>Pro TX Hash</Text>
          <Input
            placeholder='Enter Pro TX Hash...'
            value={formData.proTxHash}
            onChange={(e) => updateField('proTxHash', e.target.value)}
            size='xl'
          />
        </div>

        {/* Owner Key */}
        <div>
          <Text dim className='mb-2'>Owner Key</Text>
          <PrivateKeyInput
            input={ownerKeyData}
            placeholder='Enter Owner Key...'
            onValueChange={updateOwnerKey}
            onVisibilityToggle={toggleOwnerKeyVisibility}
          />
        </div>

        {/* Voting Key */}
        <div>
          <Text dim className='mb-2'>Voting Key</Text>
          <PrivateKeyInput
            input={votingKeyData}
            placeholder='Enter Voting Key...'
            onValueChange={updateVotingKey}
            onVisibilityToggle={toggleVotingKeyVisibility}
          />
        </div>

        {/* Payout Key */}
        <div>
          <Text dim className='mb-2'>Payout Key</Text>
          <Input
            placeholder='Enter Payout Key...'
            value={formData.payoutKey}
            onChange={(e) => updateField('payoutKey', e.target.value)}
            size='xl'
          />
        </div>

        <div className='mt-4'>
          <Button
            colorScheme='brand'
            disabled={!isFormValid || isLoading}
            className='w-full'
            onClick={handleImport}
          >
            {isLoading ? 'Authorizing...' : 'Next'}
          </Button>
        </div>
      </div>

      {error && (
        <ValueCard colorScheme='yellow' className='break-all'>
          <Text color='red'>{error}</Text>
        </ValueCard>
      )}
    </div>
  )
}

export default withAccessControl(ImportMasternodeState, {
  requireWallet: false
})
