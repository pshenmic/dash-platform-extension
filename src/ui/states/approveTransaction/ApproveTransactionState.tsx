import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useOutletContext, useLocation } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { Text, Button, ValueCard } from 'dash-ui-kit/react'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { Banner } from '../../components/cards'
import ButtonRow from '../../components/layout/ButtonRow'
import { PasswordField } from '../../components/forms'
import { FieldLabel } from '../../components/typography'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { useExtensionAPI, useSigningKeys } from '../../hooks'
import { StateTransitionWASM } from 'pshenmic-dpp'
import { withAccessControl } from '../../components/auth/withAccessControl'
import type { OutletContext } from '../../types'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { PublicKeySelect, type KeyRequirement } from '../../components/keys'
import { IdentitySelect } from '../../components/identity/IdentitySelect'
import { TransactionDetails } from './details'
import { decodeStateTransition } from '../../../utils/decodeStateTransition'

function ApproveTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const { currentWallet, currentIdentity, setCurrentIdentity, setHeaderConfigOverride, currentNetwork } = useOutletContext<OutletContext>()

  const params = useParams()

  // Check if identity switching should be disabled (e.g., when navigating from SendTransaction)
  const disableIdentitySelect = location.state?.disableIdentitySelect === true
  const showBackButton = location.state?.showBackButton === true
  const returnToHome = location.state?.returnToHome === true

  const [transactionDecodeError, setTransactionDecodeError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isLoadingTransaction, setIsLoadingTransaction] = useState<boolean>(false)
  const [transactionNotFound, setTransactionNotFound] = useState<boolean>(false)

  const [identities, setIdentities] = useState<string[]>([])
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSigningInProgress, setIsSigningInProgress] = useState<boolean>(false)
  const [isLoadingIdentities, setIsLoadingIdentities] = useState<boolean>(true)
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(true)
  const [hasWallet, setHasWallet] = useState<boolean>(false)
  const [stateTransitionWASM, setStateTransitionWASM] = useState<StateTransitionWASM | null>(null)
  const [keyRequirements, setKeyRequirements] = useState<KeyRequirement[]>([])
  const [decodedTransaction, setDecodedTransaction] = useState<any>(null)

  const {
    signingKeys,
    selectedSigningKey,
    setSelectedSigningKey,
    loading: signingKeysLoading,
    error: signingKeysError
  } = useSigningKeys({
    identity: currentIdentity
  })

  // Set header config override based on navigation state
  useEffect(() => {
    if (showBackButton) {
      setHeaderConfigOverride({ showBackButton: true })
    }

    // Clear header config override on unmount
    return () => {
      setHeaderConfigOverride(null)
    }
  }, [showBackButton, setHeaderConfigOverride])

  useEffect(() => {
    const checkWallet = async (): Promise<void> => {
      try {
        const status = await extensionAPI.getStatus()
        setHasWallet(status.currentWalletId != null)
      } catch (error) {
        console.log('Failed to check wallet status:', error)
        setHasWallet(false)
      } finally {
        setIsCheckingWallet(false)
      }
    }

    checkWallet()
      .catch(e => console.log('checkWallet error', e))
  }, [extensionAPI])

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (isCheckingWallet || !hasWallet) {
        setIsLoadingIdentities(false)
        return
      }

      try {
        setIsLoadingIdentities(true)

        const availableIdentities = (await extensionAPI.getIdentities())
          .map(identity => identity.identifier)

        setIdentities(availableIdentities ?? [])
      } catch (error) {
        console.log('Failed to load identities:', error)
      } finally {
        setIsLoadingIdentities(false)
      }
    }

    loadData()
      .catch(e => console.log('loadData error', e))
  }, [isCheckingWallet, hasWallet, currentWallet])

  useEffect(() => {
    const transactionHash = params.hash ?? params.txhash
    if (transactionHash != null) {
      setIsLoadingTransaction(true)
      setTransactionNotFound(false)
      setTransactionDecodeError(null)

      extensionAPI
        .getStateTransition(transactionHash)
        .then((stateTransitionResponse: GetStateTransitionResponse) => {
          try {
            const receivedStateTransitionWASM = StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned))
            setStateTransitionWASM(receivedStateTransitionWASM)

            // Decode transaction locally
            try {
              const decoded = decodeStateTransition(receivedStateTransitionWASM)
              setDecodedTransaction(decoded)
            } catch (decodeError) {
              console.log('Error decoding transaction locally:', decodeError)
              setDecodedTransaction(null)
            }
          } catch (e) {
            console.log('Error decoding state transition:', e)
            setTransactionDecodeError(String(e))
          }
        })
        .catch((error) => {
          console.log('Error getting state transition:', error)
          setTransactionNotFound(true)
        })
        .finally(() => setIsLoadingTransaction(false))
    }
  }, [params.hash, params.txhash])

  // Extract key requirements from state transition
  useEffect(() => {
    if (stateTransitionWASM == null) {
      setKeyRequirements([])
      return
    }

    try {
      const purposeRequirements = stateTransitionWASM.getPurposeRequirement()
      const requirements: KeyRequirement[] = []

      if (Array.isArray(purposeRequirements)) {
        for (const purpose of purposeRequirements) {
          const securityLevel = stateTransitionWASM.getKeyLevelRequirement(purpose)

          if (Array.isArray(securityLevel)) {
            securityLevel.forEach(level => {
              requirements.push({
                purpose,
                securityLevel: level
              })
            })
          }
        }
      }

      setKeyRequirements(requirements)
    } catch (error) {
      console.log('Error extracting key requirements:', error)
      setKeyRequirements([])
    }
  }, [stateTransitionWASM])

  if (isCheckingWallet || isLoadingIdentities) {
    return (
      <LoadingScreen
        message={isCheckingWallet ? 'Checking wallet...' : 'Loading identities...'}
      />
    )
  }

  if (!hasWallet) {
    return (
      <div className='screen-content'>
        <TitleBlock title='No Wallet Found' showLogo={false} />

        <ValueCard colorScheme='lightGray' size='xl' border={false} className='flex flex-col items-start gap-2'>
          <Text size='md'>
            You need to create a wallet before you can approve transactions.
          </Text>
          <Text size='md'>
            Create a new wallet to manage your identities and approve transactions.
          </Text>
        </ValueCard>

        <div className='flex flex-col gap-2 w-full'>
          <Button
            onClick={() => { void navigate('/create-wallet') }}
            colorScheme='brand'
          >
            Create Wallet
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='lightBlue'
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Show no identities message only after loading is complete
  if (identities.length === 0) {
    return (
      <div className='screen-content'>
        <TitleBlock title='No Identities Available' showLogo={false} />

        <ValueCard colorScheme='lightGray' border={false} className='flex flex-col items-start gap-4'>
          <Text size='md'>
            You need to have at least one identity to approve transactions.
          </Text>
          <Text size='md'>
            Import an existing identity or create a new one to continue.
          </Text>
        </ValueCard>

        <div className='flex flex-col gap-2 w-full'>
          <Button
            onClick={() => { void navigate('/choose-wallet-type') }}
            colorScheme='brand'
          >
            Import Identity
          </Button>
          <Button
            onClick={() => window.close()}
            colorScheme='lightBlue'
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const reject = (): void => {
    if (stateTransitionWASM == null) {
      throw new Error('stateTransitionWASM is null')
    }

    extensionAPI.rejectStateTransition(stateTransitionWASM.hash(true)).then(window.close).catch(console.log)
  }

  const doSign = async (): Promise<void> => {
    if (stateTransitionWASM == null) {
      throw new Error('stateTransitionWASM is null')
    }

    if (currentIdentity == null) {
      throw new Error('No current identity')
    }

    if (password === '') {
      setPasswordError('Password is required')
      return
    }

    setIsSigningInProgress(true)
    setPasswordError(null)

    try {
      if (stateTransitionWASM == null) {
        throw new Error('stateTransitionWASM is null')
      }

      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setPasswordError('Invalid password')
        setIsSigningInProgress(false)
        return
      }

      if (selectedSigningKey === null) {
        throw new Error('No signing key selected')
      }
      const keyId = parseInt(selectedSigningKey, 10)
      const response = await extensionAPI.approveStateTransition(stateTransitionWASM.hash(true), currentIdentity, keyId, password)

      // Update decodedTransaction with the actual signing key ID
      if (decodedTransaction != null) {
        setDecodedTransaction({
          ...decodedTransaction,
          signaturePublicKeyId: keyId
        })
      }

      setTxHash(response.txHash)
    } catch (error) {
      setPasswordError(`Signing failed: ${error.toString() as string}`)
    } finally {
      setIsSigningInProgress(false)
    }
  }

  if (txHash != null) {
    return (
      <div className='screen-content'>
        <div className='flex flex-col gap-6'>
          <TitleBlock
            title={
              <>
                <span className='font-normal'>Transaction was</span><br />
                <span className='font-medium'>successfully broadcasted</span>
              </>
            }
            description='You can check the transaction details below'
            showLogo={false}
          />

          {/* Transaction details after success */}
          {decodedTransaction != null && (
            <TransactionDetails
              data={decodedTransaction}
              transactionHash={txHash}
              network={(currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'}
              signed
            />
          )}

          <div>
            <Button
              className='w-full'
              onClick={() => {
                if (returnToHome) {
                  void navigate('/')
                } else {
                  window.close()
                }
              }}
              colorScheme='brand'
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='screen-content'>
      <div className='flex flex-col gap-6'>
        <TitleBlock
          title={<>Transaction<br />Approval</>}
          description='Carefully check the transaction details before signing'
          showLogo={false}
        />

        {/* Transaction details */}
        {isLoadingTransaction && <Banner variant='info' message='Loading transaction...' />}
        {transactionNotFound && <Banner variant='error' message='Could not find transaction with hash' />}
        <Banner variant='error' message={transactionDecodeError} />

        {/* Decoded transaction details */}
        {decodedTransaction != null && (
          <TransactionDetails
            data={decodedTransaction}
            network={(currentNetwork ?? 'testnet') as 'testnet' | 'mainnet'}
          />
        )}

        {/* Choose Identity */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <div className='flex flex-col gap-2.5'>
            <FieldLabel>Choose Identity</FieldLabel>
            <IdentitySelect
              identities={identities}
              value={currentIdentity ?? ''}
              onChange={(identity: string) => {
                setCurrentIdentity(identity)
                extensionAPI.switchIdentity(identity).catch(err => console.log('Failed to switch identity', err))
              }}
              showArrow
              size='xl'
              disabled={disableIdentitySelect}
            />
          </div>
        )}

        {/* Choose Signing Key */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <PublicKeySelect
            keys={signingKeys}
            value={selectedSigningKey}
            onChange={setSelectedSigningKey}
            loading={signingKeysLoading}
            error={signingKeysError}
            keyRequirements={keyRequirements}
          />
        )}

        {/* Password */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null && (
          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder='Your Password'
            error={passwordError}
            variant='outlined'
          />
        )}

        {/* Buttons */}
        {!isLoadingTransaction && !transactionNotFound && stateTransitionWASM == null
          ? (
            <div className='w-full'>
              <Button
                onClick={() => { void navigate('/') }}
                className='w-full'
                colorScheme='lightBlue'
              >
                Close
              </Button>
            </div>
            )
          : (stateTransitionWASM != null && (
            <ButtonRow
              leftButton={{
                text: 'Reject',
                onClick: reject,
                colorScheme: 'lightBlue'
              }}
              rightButton={{
                text: isSigningInProgress ? 'Signing...' : 'Sign',
                onClick: () => { doSign().catch(e => console.log('doSign', e)) },
                colorScheme: 'brand',
                disabled: isSigningInProgress || selectedSigningKey === null
              }}
            />
            ))}
      </div>
    </div>
  )
}

export default withAccessControl(ApproveTransactionState)
