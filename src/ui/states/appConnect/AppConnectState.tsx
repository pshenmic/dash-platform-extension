import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { Text, Button, Select, Avatar, Heading, List, Identifier, ValueCard } from 'dash-ui/react'
import { withAuthCheck } from '../../components/auth/withAuthCheck'
import LoadingScreen from '../../components/layout/LoadingScreen'
import { AppConnect } from '../../../types/AppConnect'
import { AppConnectStatus } from '../../../types/enums/AppConnectStatus'
import { getFaviconUrl } from '../../../utils'
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
      console.warn('Error during approval:', error)
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
      console.warn('Error during rejection:', error)
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
    <div className='screen-content gap-8'>
      <div className='flex flex-col items-center gap-2'>
        <div className='w-12 h-12 rounded-lg overflow-hidden shadow-xl mx-auto'>
          <img
            src={getFaviconUrl(appConnect.url, 48)}
            alt='Site favicon'
            className='w-full h-full object-cover'
            onError={(e) => {
              e.currentTarget.src = getFaviconUrl(appConnect.url, 32)
            }}
          />
        </div>

        <Heading as='h1' size='xl' className='text-center'>
          Website Connection Request
        </Heading>

        <Text size='sm' className='break-all text-center'>
          {appConnect.url}
        </Text>
      </div>

      <div className='flex gap-2 w-full'>
        <Button
          onClick={() => { void handleReject() }}
          colorScheme='lightBlue'
          className='w-1/2'
          disabled={processingStatus != null}
        >
          {processingStatus === 'rejecting' ? 'Rejecting...' : 'Reject'}
        </Button>
        <Button
          onClick={() => { void handleApprove() }}
          colorScheme='brand'
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
