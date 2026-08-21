import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Button,
  Text,
  ValueCard,
  Avatar,
  CreditsIcon
} from 'dash-ui-kit/react'
import { base64 } from '@scure/base'
import { withAccessControl } from '../../components/auth/withAccessControl'
import {
  useExtensionAPI,
  useSdk,
  usePlatformExplorerClient,
  useTransactionCalculations,
  useWithdrawalForm
} from '../../hooks'
import IdentityHeaderBadge from '../../components/identity/IdentityHeaderBadge'
import { TransferSummaryCard, Banner } from '../../components/cards'
import { AmountInputSection } from '../../components/forms'
import type { NetworkType } from '../../../types'
import type { OutletContext } from '../../types'
import { MIN_CREDIT_WITHDRAWAL, MAX_CREDIT_WITHDRAWAL } from '../../constants/transaction'
import {
  getFormattedBalance,
  getAssetDecimals
} from '../../../utils/transactionFormatters'

const CREDITS_ASSET = 'credits'

function WithdrawState (): React.JSX.Element {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentIdentity, setHeaderComponent, allWallets, currentWallet } = useOutletContext<OutletContext>()

  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  const form = useWithdrawalForm(balance, rate, currentNetwork)

  const calculations = useTransactionCalculations({
    selectedAsset: CREDITS_ASSET,
    amount: form.formData.amount,
    balance,
    rate,
    currentNetwork
  })

  useEffect(() => {
    const loadBalance = async (): Promise<void> => {
      if (currentIdentity == null) return
      try {
        const identityBalance = await sdk.identities.getIdentityBalance(currentIdentity)
        setBalance(identityBalance)
      } catch (err) {
        console.error('Failed to load balance:', err)
      }
    }

    const loadRate = async (): Promise<void> => {
      try {
        const r = await platformExplorerClient.fetchRate((currentNetwork ?? 'testnet') as NetworkType)
        setRate(r)
      } catch {
        setRate(null)
      }
    }

    void loadBalance()
    void loadRate()
  }, [currentIdentity, sdk, currentNetwork, platformExplorerClient])

  const getWalletName = (): string => {
    if (currentWallet == null || allWallets == null || allWallets.length === 0) return 'Wallet'
    const available = allWallets.filter(w => w.network === currentNetwork)
    const current = available.find(w => w.walletId === currentWallet)
    if (current == null) return 'Wallet'
    const idx = available.findIndex(w => w.walletId === currentWallet)
    return current.label ?? `Wallet_${idx + 1}`
  }

  useEffect(() => {
    if (currentIdentity !== null) {
      setHeaderComponent(
        <IdentityHeaderBadge identity={currentIdentity} walletName={getWalletName()} />
      )
    }
    return () => { setHeaderComponent(null) }
  }, [currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent])

  const handleWithdraw = async (): Promise<void> => {
    if (currentIdentity == null) {
      form.setError('No identity selected')
      return
    }

    const address = form.formData.recipientAddress.trim()
    if (address === '') {
      form.setError('Please enter a withdrawal address')
      return
    }

    const amount = form.formData.amount
    if (amount === '' || amount === '0') {
      form.setError('Please enter an amount')
      return
    }

    const amountInCredits = BigInt(Math.floor(Number(amount)))

    if (amountInCredits < MIN_CREDIT_WITHDRAWAL) {
      form.setError(`Minimum withdrawal amount is ${MIN_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
      return
    }

    if (amountInCredits > MAX_CREDIT_WITHDRAWAL) {
      form.setError(`Maximum withdrawal amount is ${MAX_CREDIT_WITHDRAWAL.toLocaleString()} credits`)
      return
    }

    setIsLoading(true)
    form.setError(null)

    try {
      const amountInCredits = BigInt(Math.floor(Number(amount)))
      const identityNonce = await sdk.identities.getIdentityNonce(currentIdentity)

      const stateTransition = sdk.identities.createStateTransition('withdrawal', {
        identityId: currentIdentity,
        amount: amountInCredits,
        withdrawalAddress: address,
        identityNonce: identityNonce + 1n,
        pooling: 'Never'
      })

      const stateTransitionBase64 = base64.encode(stateTransition.bytes())
      const response = await extensionAPI.createStateTransition(stateTransitionBase64)

      void navigate(`/approve/${response.stateTransition.unsignedHash}`, {
        state: {
          disableIdentitySelect: true,
          showBackButton: true,
          returnToHome: true
        }
      })
    } catch (err) {
      console.error('Withdrawal creation failed:', err)
      form.setError(err instanceof Error ? err.message : 'Withdrawal creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const formattedBalance = getFormattedBalance(CREDITS_ASSET, balance, undefined)
  const assetDecimals = getAssetDecimals(CREDITS_ASSET, undefined)
  const isAddressEntered = form.formData.recipientAddress.trim() !== ''
  const isAmountEntered = form.formData.amount !== '' && form.formData.amount !== '0'

  return (
    <div className='screen-content'>
      {/* Title Section */}
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-[1.125rem]'>
            <Text className='text-dash-primary-dark-blue !text-[2.5rem] !font-medium !leading-[1.25] tracking-[-0.03em]'>
              Withdraw
            </Text>

            <div className='flex items-center gap-3 px-2 py-1 pl-1 rounded-xl bg-[rgba(76,126,255,0.15)]'>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center bg-white'>
                <CreditsIcon />
              </div>
              <Text className='text-dash-brand !text-[1.5rem] !font-medium !leading-[1.2]'>
                Credits
              </Text>
            </div>
          </div>

          {balance !== null && (
            <div className='flex items-center gap-3'>
              <div className='flex gap-1'>
                <Text className='!text-[0.75rem]' dim>Balance:</Text>
                <Text weight='bold' className='!text-[0.75rem]'>{formattedBalance}</Text>
                <Text className='!text-[0.75rem]'>Credits</Text>
              </div>
              {calculations.getBalanceUSDValue() !== null && (
                <ValueCard border={false} size='xs' className='px-[0.313rem] py-[0.156rem]' colorScheme='lightGray'>
                  <Text size='xs' weight='light' className='text-dash-primary-dark-blue !text-[0.625rem] !leading-[1.2]'>
                    {calculations.getBalanceUSDValue()}
                  </Text>
                </ValueCard>
              )}
            </div>
          )}
        </div>

        <Text size='xs' weight='medium' className='text-dash-primary-dark-blue opacity-50' dim>
          You are going to transfer <strong>credits</strong> from your account with this transaction. Carefully check the transaction details before proceeding to the next step.
        </Text>
      </div>

      {/* Amount Input */}
      <AmountInputSection
        amount={form.formData.amount}
        equivalentAmount={form.equivalentAmount}
        onAmountChange={form.handleAmountChange}
        onEquivalentChange={form.handleEquivalentChange}
        onQuickAmount={form.handleQuickAmount}
        selectedAsset={CREDITS_ASSET}
        equivalentCurrency={form.equivalentCurrency}
        onEquivalentCurrencyChange={form.handleEquivalentCurrencyChange}
        assetDecimals={assetDecimals}
      />

      {/* Recipient Address Input */}
      <div className='flex flex-col gap-2.5'>
        <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
          Recipient
        </Text>
        <div className='flex items-center gap-3 px-[1.5625rem] py-5 border border-solid border-[rgba(12,28,51,0.35)] rounded-[0.9375rem]'>
          <div className={`${isAddressEntered ? 'w-5' : 'w-0'} h-5 flex items-center justify-center transition-all overflow-hidden flex-shrink-0`}>
            {isAddressEntered && (
              <Avatar username={form.formData.recipientAddress} className='w-5 h-5' />
            )}
          </div>
          <input
            value={form.formData.recipientAddress}
            onChange={(e) => form.handleAddressChange(e.target.value)}
            placeholder='Enter Dash wallet address'
            className='flex-1 text-sm font-light text-dash-primary-dark-blue outline-none bg-transparent font-dash-grotesque'
          />
        </div>
      </div>

      {/* Error */}
      <Banner variant='error' message={form.error ?? null} />

      {/* Summary Card */}
      <TransferSummaryCard
        fees={calculations.getEstimatedFee()}
        willBeSent={calculations.getWillBeSentAmount()}
        total={calculations.getTotalAmount()}
        unit={calculations.getTotalAmountUnit()}
        selectedAsset={CREDITS_ASSET}
      />

      {/* Action Button */}
      <div className='flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          size='xl'
          className='w-full'
          onClick={() => { handleWithdraw().catch(e => console.log('handleWithdraw error', e)) }}
          disabled={isLoading || !isAddressEntered || !isAmountEntered || form.error !== null}
        >
          {isLoading ? 'Creating Transaction...' : 'Next'}
        </Button>
      </div>
    </div>
  )
}

export default withAccessControl(WithdrawState, { requireWallet: true })
