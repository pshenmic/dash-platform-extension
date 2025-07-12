import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import ValueCard from '../../components/containers/ValueCard'
import { Text, Button } from 'dash-ui/react'
import { withAuthCheck } from '../../components/auth/withAuthCheck'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { AppConnect } from '../../../types/AppConnect'
import { AppConnectStatus } from '../../../types/enums/AppConnectStatus'
import './appConnect.state.css'

function AppConnectState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const params = useParams()

  const [appConnect, setAppConnect] = useState<AppConnect | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<'approving' | 'rejecting' | null>(null)

  useEffect(() => {
    const loadAppConnect = async (): Promise<void> => {
      if (params.id == null) {
        setError('Connection ID is not specified')
        setIsLoading(false)
        return
      }

      try {
        const data = await extensionAPI.getAppConnect(params.id)
        if (data == null) {
          setError('Could not find app connect with that id')
        } else {
          setAppConnect(data)
        }
      } catch (error) {
        setError('Error loading connection request')
      } finally {
        setIsLoading(false)
      }
    }

    void loadAppConnect()
  }, [params.id, extensionAPI])

  const handleApprove = async (): Promise<void> => {
    if (appConnect == null || params.id == null) return

    setProcessingStatus('approving')
    try {
      await extensionAPI.approveAppConnect(params.id)
      window.close()
    } catch (error) {
      console.error('Error during approval:', error)
      setError('Failed to approve connection')
      setProcessingStatus(null)
    }
  }

  const handleReject = async (): Promise<void> => {
    if (appConnect == null || params.id == null) return

    setProcessingStatus('rejecting')
    try {
      await extensionAPI.rejectAppConnect(params.id)
      window.close()
    } catch (error) {
      console.error('Error during rejection:', error)
      setError('Failed to reject connection')
      setProcessingStatus(null)
    }
  }

  if (isLoading) {
    return <LoadingScreen message='Loading connection request...' />
  }

  if (error != null || appConnect == null) {
    return (
      <div className='screen-content'>
        <h1 className='h1-title'>Error</h1>
        <ValueCard colorScheme='default' className='flex flex-col items-start gap-2 bg-red-50 border-red-200'>
          <Text size='lg' color='red'>
            {error ?? 'Unknown error'}
          </Text>
        </ValueCard>
        <Button onClick={() => window.close()} className='mt-5 w-full'>
          Close
        </Button>
      </div>
    )
  }

  // If the request is already processed
  if (appConnect.status !== AppConnectStatus.pending) {
    return (
      <div className='screen-content'>
        <h1 className='h1-title'>Request already processed</h1>
        <ValueCard colorScheme='lightBlue' className='flex flex-col items-start gap-2'>
          <Text size='lg'>
            This connection request has already been {appConnect.status === AppConnectStatus.approved ? 'approved' : 'rejected'}.
          </Text>
        </ValueCard>
        <Button onClick={() => window.close()} className='mt-5 w-full'>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className='screen-content'>
      <h1 className='h1-title'>Website Connection Request</h1>

      <ValueCard colorScheme='lightBlue' className='flex flex-col items-start gap-4'>
        <Text size='lg' weight='bold'>
          The website is requesting permission to connect
        </Text>

        <Text size='md'>
          The following website wants to access your Dash wallet:
        </Text>

        <ValueCard colorScheme='white' className='w-full p-4'>
          <Text size='lg' className='break-all'>
            {appConnect.url}
          </Text>
        </ValueCard>

        <Text size='sm' dim>
          By allowing the connection, you permit this website to:
        </Text>
        <ul className='list-disc list-inside space-y-1'>
          <li><Text size='sm'>View public information of your wallet</Text></li>
          <li><Text size='sm'>Request transaction approvals</Text></li>
          <li><Text size='sm'>Interact with Dash Platform</Text></li>
        </ul>

        <ValueCard colorScheme='default' className='w-full app-connect-warning'>
          <Text size='sm' weight='bold'>
            ⚠️ Warning: Only connect trusted websites!
          </Text>
        </ValueCard>
      </ValueCard>

      <div className='flex gap-5 mt-5 w-full'>
        <Button
          onClick={() => { void handleReject() }}
          colorScheme='red'
          variant='outline'
          className='w-1/2'
          disabled={processingStatus != null}
        >
          {processingStatus === 'rejecting' ? 'Rejecting...' : 'Reject'}
        </Button>
        <Button
          onClick={() => { void handleApprove() }}
          colorScheme='mint'
          className='w-1/2'
          disabled={processingStatus != null}
        >
          {processingStatus === 'approving' ? 'Approving...' : 'Allow'}
        </Button>
      </div>
    </div>
  )
}

export default withAuthCheck(AppConnectState)
