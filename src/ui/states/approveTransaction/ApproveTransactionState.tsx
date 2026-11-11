import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useOutletContext, useLocation } from 'react-router-dom'
import { base64 as base64Decoder } from '@scure/base'
import { Accordion, Button } from 'dash-ui-kit/react'
import { GetStateTransitionResponse } from '../../../types/messages/response/GetStateTransitionResponse'
import { Banner, SummaryRow } from '../../components/cards'
import { PasswordField } from '../../components/forms'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { ResultHeader } from '../../components/layout/ResultHeader'
import { TransactionHashBlock } from '../../components/transactions'
import { useDashRate, useExtensionAPI, useSigningKeys, useStaticAsset } from '../../hooks'
import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { withAccessControl } from '../../components/auth/withAccessControl'
import type { OutletContext } from '../../types'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { PublicKeySelect, type KeyRequirement } from '../../components/keys'
import { TransactionDetails } from './details'
import { IdentityValue } from './details/IdentityValue'
import { TransactionTypeChip } from './TransactionTypeChip'
import { detailsShowIdentity, transactionCredits, transactionTypeTitle } from './transactionMeta'
import { PLATFORM_DASH_DECIMALS, dashAmountToUsd, decodeStateTransition, formatDashAmount, getStateTransitionKeyRequirements } from '../../../utils'
import { SigningErrorDetails } from '../../components/errors'

function ApproveTransactionState (): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const extensionAPI = useExtensionAPI()
  const { currentWallet, currentIdentity, setCurrentIdentity, setHeaderConfigOverride, currentNetwork } = useOutletContext<OutletContext>()

  const params = useParams()

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
  const [signingErrorDetails, setSigningErrorDetails] = useState<{ name: string, message: string, hex: string | null } | null>(null)
  const [isLoadingIdentities, setIsLoadingIdentities] = useState<boolean>(true)
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(true)
  const [hasWallet, setHasWallet] = useState<boolean>(false)
  const [stateTransitionWASM, setStateTransitionWASM] = useState<StateTransitionWASM | null>(null)
  const [stateTransitionOrigin, setStateTransitionOrigin] = useState<string | null>(null)
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

  const { rate } = useDashRate(currentNetwork)
  const coinImage = useStaticAsset('coin.png')

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
      setStateTransitionOrigin(null)

      extensionAPI
        .getStateTransition(transactionHash)
        .then((stateTransitionResponse: GetStateTransitionResponse) => {
          setStateTransitionOrigin(stateTransitionResponse.stateTransition.origin ?? null)

          let receivedStateTransitionWASM: StateTransitionWASM

          try {
            const rawBytes = base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)
            receivedStateTransitionWASM = StateTransitionWASM.fromBytes(rawBytes)
            setStateTransitionWASM(receivedStateTransitionWASM)
          } catch (e) {
            console.log('Error decoding state transition:', e)
            setTransactionDecodeError(String(e))
            return
          }

          try {
            const decoded = decodeStateTransition(receivedStateTransitionWASM)
            setDecodedTransaction(decoded)
          } catch (decodeError) {
            console.log('Error decoding transaction locally:', decodeError)
            setDecodedTransaction(null)
          }
        })
        .catch((error) => {
          console.log('Error getting state transition:', error)
          setTransactionNotFound(true)
        })
        .finally(() => setIsLoadingTransaction(false))
    }
  }, [params.hash, params.txhash])

  // Auto-select identity based on transaction owner
  useEffect(() => {
    if (decodedTransaction == null) return

    const txIdentity: string | null =
      decodedTransaction.ownerId ??
      decodedTransaction.identityId ??
      decodedTransaction.senderId ??
      null

    if (txIdentity == null || txIdentity === currentIdentity) return

    setCurrentIdentity(txIdentity)
    extensionAPI.switchIdentity(txIdentity).catch(err => console.log('Failed to switch identity', err))
  }, [decodedTransaction])

  // Extract key requirements from state transition
  useEffect(() => {
    if (stateTransitionWASM == null) {
      setKeyRequirements([])
      return
    }

    const hasTokenTransfer: boolean = Array.isArray(decodedTransaction?.transitions) &&
      decodedTransaction.transitions.some((t: any) => t.action === 'TOKEN_TRANSFER')

    try {
      setKeyRequirements(getStateTransitionKeyRequirements(stateTransitionWASM, hasTokenTransfer))
    } catch (error) {
      console.log('Error extracting key requirements:', error)
      setKeyRequirements([])
    }
  }, [stateTransitionWASM, decodedTransaction])

  if (isCheckingWallet || isLoadingIdentities) {
    return (
      <ScreenLoader />
    )
  }

  if (!hasWallet) {
    return (
      <div className='screen-content gap-6'>
        <TitleBlock
          variant='screen'
          title='No Wallet Found'
          description='You need to create a wallet before you can approve transactions. Create a new wallet to manage your identities and approve transactions.'
        />
        <div className='flex flex-col gap-2.5 w-full mt-auto'>
          <Button colorScheme='brand' size='xl' onClick={() => { void navigate('/create-wallet') }}>
            Create Wallet
          </Button>
          <Button colorScheme='lightBlue' size='xl' onClick={() => window.close()}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (identities.length === 0) {
    return (
      <div className='screen-content gap-6'>
        <TitleBlock
          variant='screen'
          title='No Identities Available'
          description='You need at least one identity to approve transactions. Import an existing identity or create a new one to continue.'
        />
        <div className='flex flex-col gap-2.5 w-full mt-auto'>
          <Button colorScheme='brand' size='xl' onClick={() => { void navigate('/choose-wallet-type') }}>
            Import Identity
          </Button>
          <Button colorScheme='lightBlue' size='xl' onClick={() => window.close()}>
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
    setPasswordError(null)
    setSigningErrorDetails(null)

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
    } catch (error: any) {
      setSigningErrorDetails({
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        hex: error?.payload?.signedHex ?? null
      })
    } finally {
      setIsSigningInProgress(false)
    }
  }

  const typeTitle = decodedTransaction != null ? transactionTypeTitle(decodedTransaction) : null
  const credits = decodedTransaction != null ? transactionCredits(decodedTransaction) : null
  const isReady = !isLoadingTransaction && !transactionNotFound && stateTransitionWASM != null

  if (txHash != null) {
    return (
      <div className='screen-content gap-4'>
        <ResultHeader
          status='success'
          illustration={coinImage}
          amount={credits != null
            ? <><span className='font-bold'>{formatDashAmount(BigInt(credits), PLATFORM_DASH_DECIMALS)}</span> Dash</>
            : <span className='font-bold'>{typeTitle ?? 'Transaction'}</span>}
          usd={credits != null ? dashAmountToUsd(BigInt(credits), PLATFORM_DASH_DECIMALS, rate) : undefined}
          message='Transaction was signed and broadcast to Dash Platform'
        />

        <TransactionHashBlock hash={txHash} network={currentNetwork ?? 'testnet'} label='Transaction Hash:' />

        {decodedTransaction != null && (
          <Accordion title='Details' showSeparator={false}>
            <TransactionDetails data={decodedTransaction} signed />
          </Accordion>
        )}

        <Button
          colorScheme='brand'
          size='xl'
          className='w-full mt-auto'
          onClick={() => {
            if (returnToHome) {
              void navigate('/', { replace: true })
            } else {
              window.close()
            }
          }}
        >
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className='screen-content gap-4'>
      <TitleBlock
        variant='screen'
        title='Sign Transaction'
        badge={typeTitle != null ? <TransactionTypeChip title={typeTitle} /> : null}
      />

      {isLoadingTransaction && <ScreenLoader className='min-h-[120px]' />}
      {transactionNotFound && <Banner variant='error' message='Could not find transaction with hash' />}
      <Banner variant='error' message={transactionDecodeError} />

      {decodedTransaction != null && (
        <TransactionDetails data={decodedTransaction} />
      )}

      {isReady && (
        <div className='flex flex-col gap-2.5'>
          {(decodedTransaction == null || !detailsShowIdentity(decodedTransaction)) && (
            <SummaryRow
              label='Sign as:'
              value={currentIdentity != null
                ? <IdentityValue identifier={currentIdentity} />
                : '-'}
            />
          )}

          <PublicKeySelect
            keys={signingKeys}
            value={selectedSigningKey}
            onChange={setSelectedSigningKey}
            loading={signingKeysLoading}
            error={signingKeysError}
            keyRequirements={keyRequirements}
            showLabel={false}
          />

          <PasswordField
            label={null}
            value={password}
            onChange={setPassword}
            placeholder='Your Password'
            error={passwordError}
            variant='outlined'
          />
        </div>
      )}

      {signingErrorDetails != null && (
        <SigningErrorDetails
          name={signingErrorDetails.name}
          message={signingErrorDetails.message}
          hex={signingErrorDetails.hex}
        />
      )}

      {!isLoadingTransaction && stateTransitionWASM == null && (
        <Button colorScheme='lightBlue' size='xl' className='w-full mt-auto' onClick={() => { void navigate('/', { replace: true }) }}>
          Close
        </Button>
      )}

      {isReady && (
        <div className='flex gap-2.5 mt-auto pt-2'>
          <Button colorScheme='lightBlue' size='xl' className='flex-1' onClick={reject}>
            Reject
          </Button>
          <Button
            colorScheme='brand'
            size='xl'
            className='flex-1'
            disabled={isSigningInProgress || selectedSigningKey === null || password === ''}
            onClick={() => { void doSign() }}
          >
            {isSigningInProgress ? 'Signing...' : 'Sign'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default withAccessControl(ApproveTransactionState)
