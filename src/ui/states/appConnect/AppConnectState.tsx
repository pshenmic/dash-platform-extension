import React, { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Text, Button } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../hooks/useExtensionAPI'
import { withAccessControl } from '../../components/auth/withAccessControl'
import ScreenLoader from '../../components/layout/screens/ScreenLoader'
import { Banner } from '../../components/cards'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { AppConnect } from '../../../types/AppConnect'
import { AppConnectStatus } from '../../../types/enums/AppConnectStatus'
import { AppConnectHero } from './AppConnectHero'
import { AppConnectPermissions } from './AppConnectPermissions'
import { useConnectIdentities } from './useConnectIdentities'
import type { OutletContext } from '../../types'

function AppConnectState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const params = useParams()
  const { currentNetwork } = useOutletContext<OutletContext>()
  const { identities, selected, allSelected, toggle, toggleAll, loaded } = useConnectIdentities()

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

    loadAppConnect()
      .catch(e => console.log('loadAppConnect error: ', e))
  }, [params.id, extensionAPI])

  const handleApprove = async (): Promise<void> => {
    if (appConnect == null || params.id == null) return

    setProcessingStatus('approving')
    try {
      await extensionAPI.approveAppConnect(params.id, identities.length > 0 ? selected : undefined)
      window.close()
    } catch (error) {
      console.log('Error during approval:', error)
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
      console.log('Error during rejection:', error)
      setError('Failed to reject connection')
      setProcessingStatus(null)
    }
  }

  if (isLoading) {
    return <ScreenLoader />
  }

  if (error != null || appConnect == null) {
    return (
      <div className='screen-content gap-6'>
        <TitleBlock variant='screen' title='Connection Request' />
        <Banner variant='error' message={error ?? 'Unknown error'} />
        <Button colorScheme='lightBlue' size='xl' className='w-full mt-auto' onClick={() => window.close()}>
          Close
        </Button>
      </div>
    )
  }

  if (appConnect.status !== AppConnectStatus.pending) {
    return (
      <div className='screen-content gap-6'>
        <AppConnectHero
          url={appConnect.url}
          title='Request already processed'
          description={`This connection request has already been ${appConnect.status === AppConnectStatus.approved ? 'approved' : 'rejected'}.`}
        />
        <Button colorScheme='lightBlue' size='xl' className='w-full mt-auto' onClick={() => window.close()}>
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className='screen-content gap-4'>
      <AppConnectHero
        url={appConnect.url}
        title='Connection Request'
      />

      <AppConnectPermissions identities={identities} selected={selected} allSelected={allSelected} onToggle={toggle} onToggleAll={toggleAll} network={currentNetwork} />

      <Text size='xs' weight='medium' dim className='text-center'>
        Only connect to websites you trust
      </Text>

      <div className='flex gap-2.5 mt-auto pt-2'>
        <Button
          colorScheme='lightBlue'
          size='xl'
          className='flex-1'
          disabled={processingStatus != null}
          onClick={() => { handleReject().catch(e => console.log('handleReject error: ', e)) }}
        >
          {processingStatus === 'rejecting' ? 'Rejecting...' : 'Reject'}
        </Button>
        <Button
          colorScheme='brand'
          size='xl'
          className='flex-1'
          disabled={processingStatus != null || !loaded || (identities.length > 0 && selected.length === 0)}
          onClick={() => { handleApprove().catch(e => console.log('handleApprove error: ', e)) }}
        >
          {processingStatus === 'approving' ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

export default withAccessControl(AppConnectState)
