import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Heading, Identifier, Text, ValueCard } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { useRequestWindow } from '../../hooks/useRequestWindow'
import ButtonRow from '../../components/layout/ButtonRow'
import { TitleBlock } from '../../components/layout/TitleBlock'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { Banner, TransferSummaryCard } from '../../components/cards'
import { PasswordField } from '../../components/forms'
import { TransactionDetailsCard } from '../../components/transactions'
import { GetPaymentRequestResponse } from '../../../types/messages/response/GetPaymentRequestResponse'
import { EstimatePaymentRequestResponse } from '../../../types/messages/response/EstimatePaymentRequestResponse'
import { PaymentAddressType, PaymentRequest, PaymentSourceType } from '../../../types/PaymentRequest'
import { PaymentRequestStatus } from '../../../types/enums/PaymentRequestStatus'
import { fromBaseUnit } from '../../../utils/bigintUtils'
import { getCoreTransactionExplorerUrl, getFaviconUrl, getTransactionExplorerUrl } from '../../../utils'

const RECIPIENT_LABELS: Record<PaymentAddressType, string> = {
  core: 'Core address',
  platform: 'Platform address',
  orchard: 'Shielded (Orchard) address'
}

const SOURCE_LABELS: Record<PaymentSourceType, string> = {
  core: 'Core wallet',
  platform: 'Platform addresses',
  orchard: 'Shielded balance'
}

const toDash = (duffs: string): string => fromBaseUnit(BigInt(duffs), 8)

const errorMessage = (e: unknown): string => e instanceof Error ? e.message : String(e)

// The page a website's payment request opens: who asks, what they ask to be
// paid and where to, what it would cost from the source the user picks.
// Confirming pays it; rejecting or closing the window declines it.
function PaymentRequestState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const { id } = useParams()

  const [data, setData] = useState<GetPaymentRequestResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [source, setSource] = useState<PaymentSourceType | null>(null)
  const [quote, setQuote] = useState<EstimatePaymentRequestResponse | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  // Bumped to price the payment again after an attempt sent it back.
  const [quoteRound, setQuoteRound] = useState(0)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'confirming' | 'rejecting' | null>(null)

  const load = useCallback(async (): Promise<GetPaymentRequestResponse | null> => {
    if (id == null) {
      setLoadError('Payment request id is not specified')
      return null
    }

    try {
      const response = await extensionAPI.getPaymentRequest(id)

      setData(response)
      setSource(current => current ?? response.sources[0] ?? null)

      return response
    } catch (e) {
      setLoadError(errorMessage(e))
      return null
    }
  }, [id, extensionAPI])

  useEffect(() => {
    load().catch(e => console.log('load payment request error: ', e))
  }, [load])

  const pending = data?.request.status === PaymentRequestStatus.pending && !data.contextChanged

  useEffect(() => {
    if (!pending || source == null || id == null) {
      return
    }

    setQuote(null)
    setQuoteError(null)

    extensionAPI.estimatePaymentRequest(id, source)
      .then(setQuote)
      .catch(e => setQuoteError(errorMessage(e)))
  }, [pending, source, quoteRound, id, extensionAPI])

  const settle = async (attempt: () => Promise<{ request: PaymentRequest }>): Promise<void> => {
    setError(null)

    try {
      const { request } = await attempt()

      setData(current => current != null ? { ...current, request } : current)
    } catch (e) {
      setError(errorMessage(e))

      // The attempt may have sent the request back to the user, with a new
      // fee to show, or left it processing for a retry.
      const fresh = await load()

      if (fresh?.request.status === PaymentRequestStatus.pending) {
        setQuoteRound(round => round + 1)
      }
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (id == null || source == null || quote == null) {
      return
    }

    if (password === '') {
      setError('Password must be provided')
      return
    }

    setBusy('confirming')

    await settle(async () => await extensionAPI.approvePaymentRequest(id, source, quote.feeDuffs, password))

    setPassword('')
    setBusy(null)
  }

  // Sends the transactions an earlier attempt signed; no password needed.
  const handleRetry = async (request: PaymentRequest): Promise<void> => {
    setBusy('confirming')

    await settle(async () => await extensionAPI.approvePaymentRequest(request.id, request.source ?? 'core', request.feeDuffs ?? '0'))

    setBusy(null)
  }

  const handleReject = async (): Promise<void> => {
    if (id == null) {
      return
    }

    setBusy('rejecting')

    try {
      await extensionAPI.rejectPaymentRequest(id)
      window.close()
    } catch (e) {
      setError(errorMessage(e))
      await load()
    } finally {
      setBusy(null)
    }
  }

  if (loadError != null) {
    return (
      <div className='screen-content'>
        <TitleBlock title='Payment request not found' showLogo={false} />
        <Banner variant='error' message={loadError} />
        <Button onClick={() => window.close()} className='mt-5 w-full'>Close</Button>
      </div>
    )
  }

  if (data == null) {
    return <ScreenLoader />
  }

  const { request } = data
  const header = (
    <div className='flex flex-col items-center gap-2'>
      <div className='w-12 h-12 rounded-lg overflow-hidden shadow-xl mx-auto'>
        <img
          src={getFaviconUrl(request.origin, 48)}
          alt='Site favicon'
          className='w-full h-full object-cover'
          onError={(e) => { e.currentTarget.src = getFaviconUrl(request.origin, 32) }}
        />
      </div>
      <Heading as='h1' size='xl' className='text-center'>Payment Request</Heading>
      <Text size='sm' className='break-all text-center'>{request.origin}</Text>
    </div>
  )
  const recipient = (
    <div className='flex flex-col gap-2.5'>
      <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>
        Pay {toDash(request.amountDuffs)} Dash to {RECIPIENT_LABELS[request.addressType]}
      </Text>
      <Identifier highlight='both' linesAdjustment={false}>{request.address}</Identifier>
    </div>
  )

  if (request.status === PaymentRequestStatus.completed && request.result != null) {
    return (
      <div className='screen-content gap-6'>
        {header}
        <TitleBlock title='Payment sent' description={request.result.delivery === 'queued' ? 'Platform accepted it; the recipient is paid later' : undefined} showLogo={false} />
        {recipient}
        {request.result.transactions.map(transaction => {
          const hash = transaction.type === 'core' ? transaction.txid : transaction.stateTransitionHash
          const url = transaction.type === 'core'
            ? getCoreTransactionExplorerUrl(hash, request.network)
            : getTransactionExplorerUrl(hash, request.network)

          return (
            <TransactionDetailsCard key={hash} title={transaction.type === 'core' ? 'Core transaction' : 'State transition'}>
              <a href={url} target='_blank' rel='noreferrer' className='break-all'>
                <Identifier highlight='both' linesAdjustment={false}>{hash}</Identifier>
              </a>
            </TransactionDetailsCard>
          )
        })}
        <Button onClick={() => window.close()} className='w-full'>Close</Button>
      </div>
    )
  }

  if (request.status === PaymentRequestStatus.rejected || request.status === PaymentRequestStatus.failed) {
    return (
      <div className='screen-content gap-6'>
        {header}
        <TitleBlock title={request.status === PaymentRequestStatus.failed ? 'Payment failed' : 'Payment rejected'} showLogo={false} />
        {recipient}
        <Banner variant='error' message={request.error} />
        <Button onClick={() => window.close()} className='w-full'>Close</Button>
      </div>
    )
  }

  if (request.status === PaymentRequestStatus.processing && busy == null) {
    const signed = request.transactions.length > 0

    return (
      <div className='screen-content gap-6'>
        {header}
        <TitleBlock title='Payment is being sent' description={signed ? 'It is signed, but the network has not confirmed it was received' : undefined} showLogo={false} />
        {recipient}
        <Banner variant='error' message={error ?? request.error} />
        {signed && (
          <Button colorScheme='brand' className='w-full' onClick={() => { void handleRetry(request) }}>
            Send again
          </Button>
        )}
        <Button colorScheme='lightBlue' onClick={() => window.close()} className='w-full'>Close</Button>
      </div>
    )
  }

  if (data.contextChanged) {
    return (
      <div className='screen-content gap-6'>
        {header}
        {recipient}
        <Banner variant='warning' message='The wallet or network changed after the website asked. This request can no longer be paid.' />
        <Button onClick={() => window.close()} className='w-full'>Close</Button>
      </div>
    )
  }

  return (
    <div className='screen-content gap-6'>
      {header}
      {recipient}

      <div className='flex flex-col gap-2.5'>
        <Text size='md' className='text-dash-primary-dark-blue opacity-50' dim>Pay from</Text>
        <div className='flex gap-2'>
          {data.sources.map(option => (
            <Button
              key={option}
              size='sm'
              colorScheme={option === source ? 'brand' : 'lightBlue'}
              disabled={busy != null}
              onClick={() => setSource(option)}
            >
              {SOURCE_LABELS[option]}
            </Button>
          ))}
        </div>
      </div>

      {quote != null && (
        <TransferSummaryCard
          fees={toDash(quote.feeDuffs)}
          willBeSent={toDash(quote.amountDuffs)}
          total={toDash(quote.totalDuffs)}
          unit='Dash'
          selectedAsset='credits'
          hasAmount
        />
      )}
      {quote == null && quoteError == null && (
        <ValueCard colorScheme='lightBlue'><Text size='sm'>Calculating the fee...</Text></ValueCard>
      )}
      <Banner variant='error' message={quoteError} />

      <PasswordField
        value={password}
        onChange={(value) => { setPassword(value); setError(null) }}
        error={error}
      />

      <ButtonRow
        leftButton={{
          text: busy === 'rejecting' ? 'Rejecting...' : 'Reject',
          onClick: () => { void handleReject() },
          colorScheme: 'lightBlue',
          disabled: busy != null
        }}
        rightButton={{
          text: busy === 'confirming' ? 'Sending...' : 'Confirm',
          onClick: () => { void handleConfirm() },
          colorScheme: 'brand',
          disabled: busy != null || quote == null
        }}
      />
    </div>
  )
}

const GuardedPaymentRequestState = withAccessControl(PaymentRequestState)

// Watched from before the access check: a locked wallet sends the user to the
// password screen first, and closing the popup there declines the request too.
export default function PaymentRequestStatePage (): React.JSX.Element {
  useRequestWindow('payment', useParams().id)

  return <GuardedPaymentRequestState />
}
