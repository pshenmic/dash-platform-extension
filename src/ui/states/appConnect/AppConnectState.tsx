import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { Text, Button, Heading, ValueCard } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ButtonRow from '../../components/layout/ButtonRow'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { getFaviconUrl } from '../../../utils'
import './appConnect.state.css'

function AppConnectState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const [searchParams] = useSearchParams()
  const url = searchParams.get('url')

  const [error, setError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<'approving' | 'rejecting' | null>(null)

  const handleApprove = async (): Promise<void> => {
    if (url == null) return

    setProcessingStatus('approving')
    try {
      await extensionAPI.approveAppConnect(url)
      window.close()
    } catch (e) {
      console.log('Error during approval:', e)
      setError('Failed to approve connection')
      setProcessingStatus(null)
    }
  }

  const handleReject = (): void => {
    window.close()
  }

  if (url == null) {
    return (
      <div className='screen-content'>
        <TitleBlock title='Error' showLogo={false} />
        <ValueCard colorScheme='default' className='flex flex-col items-start gap-2 bg-red-50 border-red-200'>
          <Text size='lg' color='red'>
            Invalid connection request
          </Text>
        </ValueCard>
        <Button onClick={() => window.close()} className='mt-5 w-full'>
          Close
        </Button>
      </div>
    )
  }

  if (error != null) {
    return (
      <div className='screen-content'>
        <TitleBlock title='Error' showLogo={false} />
        <ValueCard colorScheme='default' className='flex flex-col items-start gap-2 bg-red-50 border-red-200'>
          <Text size='lg' color='red'>
            {error}
          </Text>
        </ValueCard>
        <Button onClick={() => window.close()} className='mt-5 w-full'>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className='screen-content gap-8'>
      <div className='flex flex-col items-center gap-2'>
        <div className='w-12 h-12 rounded-lg overflow-hidden shadow-xl mx-auto'>
          <img
            src={getFaviconUrl(url, 48)}
            alt='Site favicon'
            className='w-full h-full object-cover'
            onError={(e) => {
              e.currentTarget.src = getFaviconUrl(url, 32)
            }}
          />
        </div>

        <Heading as='h1' size='xl' className='text-center'>
          Website Connection Request
        </Heading>

        <Text size='sm' className='break-all text-center'>
          {url}
        </Text>
      </div>

      <ButtonRow
        leftButton={{
          text: processingStatus === 'rejecting' ? 'Rejecting...' : 'Reject',
          onClick: handleReject,
          colorScheme: 'lightBlue',
          disabled: processingStatus != null
        }}
        rightButton={{
          text: processingStatus === 'approving' ? 'Approving...' : 'Allow',
          onClick: () => { handleApprove().catch(e => console.log('handleApprove error: ', e)) },
          colorScheme: 'brand',
          disabled: processingStatus != null
        }}
      />
    </div>
  )
}

export default withAccessControl(AppConnectState)
