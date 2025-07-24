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

      <div className='flex flex-col gap-4 w-full hidden'>
        <Select
          value={'user1'}
          // onChange={(e) => setCurrentIdentity(e.target.value)}
          options={[
            {
              value: 'user1',
              label: 'Main_account',
              content: (
                <div className='flex grow items-center justify-between !w-full'>
                  <div className='flex items-center gap-[15px]'>
                    <div className='w-[50px] h-[50px] bg-[rgba(12,28,51,0.03)] rounded-full flex items-center justify-center'>
                      <div className='w-8 h-8 font-bold flex items-center justify-center text-sm'>
                        <Avatar className='w-10 h-10' username={'6Eb4tQdp24cuPuffJyGfyNKkKhNJUfyupUdJcj1m87sj'}/>
                      </div>
                    </div>
                    <div className='flex flex-col gap-[5px]'>
                      <Identifier
                        middleEllipsis={true}
                        edgeChars={4}
                      >
                        6Eb4tQdp24cuPuffJyGfyNKkKhNJUfyupUdJcj1m87sj
                      </Identifier>
                      <div className='text-[12px] font-light leading-[1.2] text-[rgba(12,28,51,0.5)] font-space-grotesk'>
                        Main_account
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          ]}
          border={false}
          showArrow
          size='md'
          className={'shadow-xl'}
        />

        <ValueCard
          colorScheme='white'
          border={false}
          className='flex flex-col items-start gap-4 shadow-xl z-10'
        >
          <Text size='sm'>
            By allowing the connection, you permit this website to:
          </Text>
          <List
            items={[
              { text: 'View public information of your wallet' },
              { text: 'Request transaction approvals' },
              {
                text: 'Interact with Dash Platform',
                description: 'You will be prompted with password to approve transaction'
              }
            ]}
            iconType='check'
            size='sm'
          />
        </ValueCard>

        <ValueCard colorScheme='yellow' className='w-full app-connect-warning'>
          <Text size='sm' weight='bold'>
            ⚠️ Warning: Only connect trusted websites!
          </Text>
        </ValueCard>
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
