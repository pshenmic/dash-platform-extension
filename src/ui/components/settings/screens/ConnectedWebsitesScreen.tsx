import React, { useState, useEffect } from 'react'
import { Text, Button, ValueCard } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { ConfirmDialog } from '../../controls'
import { ConnectedWebsiteItem } from '../../websites/ConnectedWebsiteItem'
import type { SettingsScreenProps } from '../types'
import type { AppConnect } from '../../../../types'

interface ConfirmDialogState {
  open: boolean
  type: 'single' | 'all'
  websiteId?: string
  websiteName?: string
}

const EmptyListMessage = (): React.JSX.Element => (
  <ValueCard colorScheme='lightGray' className='flex flex-col gap-2'>
    <Text size='lg' weight='medium' className='text-gray-600'>
      No Connected websites
    </Text>
    <Text size='sm' className='text-gray-500'>
      When you connect to websites, they will appear here
    </Text>
  </ValueCard>
)

export const ConnectedWebsitesScreen: React.FC<SettingsScreenProps> = () => {
  const [ConnectedWebsitesState, loadConnectedWebsites, setConnectedWebsites] = useAsyncState<AppConnect[]>([])
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ open: false, type: 'single' })
  const extensionAPI = useExtensionAPI()
  const errorHiddenTime = 5000

  useEffect(() => {
    loadConnectedWebsites(async () => await extensionAPI.getAllAppConnects())
      .catch(console.log)
  }, [extensionAPI, loadConnectedWebsites])

  const showDisconnectDialog = (websiteId: string): void => {
    const website = ConnectedWebsitesState.data?.find(d => d.id === websiteId)
    setConfirmDialog({
      open: true,
      type: 'single',
      websiteId,
      websiteName: (website != null) ? new URL(website.url).hostname : 'Unknown'
    })
  }

  const showDisconnectAllDialog = (): void => {
    setConfirmDialog({
      open: true,
      type: 'all'
    })
  }

  const handleDisconnect = async (websiteId: string): Promise<void> => {
    setDisconnectingIds(prev => new Set(prev).add(websiteId))

    try {
      await extensionAPI.removeAppConnectById(websiteId)
      if (ConnectedWebsitesState.data != null) {
        setConnectedWebsites(ConnectedWebsitesState.data.filter(website => website.id !== websiteId))
      }
    } catch (error) {
      setErrorMessage(`Failed to disconnect website ${websiteId}: ${String(error)}`)

      setTimeout(() => {
        setErrorMessage(null)
      }, errorHiddenTime)
    } finally {
      setDisconnectingIds(prev => {
        const next = new Set(prev)
        next.delete(websiteId)
        return next
      })
    }
  }

  const handleDisconnectAll = async (): Promise<void> => {
    if (ConnectedWebsitesState.data == null) return

    const allIds = ConnectedWebsitesState.data.map(website => website.id)
    setDisconnectingIds(new Set(allIds))

    try {
      await Promise.all(allIds.map(async id => await extensionAPI.removeAppConnectById(id)))
      setConnectedWebsites([])
    } catch (error) {
      console.warn('Failed to disconnect all websites:', error)
      const websites = await extensionAPI.getAllAppConnects()
      setConnectedWebsites(websites)

      setErrorMessage(`Failed to disconnect all websites: ${String(error)}`)

      setTimeout(() => {
        setErrorMessage(null)
      }, errorHiddenTime)
    } finally {
      setDisconnectingIds(new Set())
    }
  }

  const handleConfirmDisconnect = async (): Promise<void> => {
    if (confirmDialog.type === 'single' && confirmDialog.websiteId != null && confirmDialog.websiteId !== '') {
      await handleDisconnect(confirmDialog.websiteId)
    } else if (confirmDialog.type === 'all') {
      await handleDisconnectAll()
    }
  }

  return (
    <div className='flex flex-col gap-4 h-full'>
      <Text size='sm' dim className='text-dash-primary-dark-blue'>
        Manage websites you have connected to.
      </Text>

      <div className='flex flex-col gap-[0.875rem] h-full grow'>
        {ConnectedWebsitesState.loading &&
          <Text dim>loading...</Text>}

        {ConnectedWebsitesState?.data?.length != null && ConnectedWebsitesState.data.length > 0
          ? ConnectedWebsitesState.data?.map(website => (
            <ConnectedWebsiteItem
              key={website.id}
              website={website}
              isDisconnecting={disconnectingIds.has(website.id)}
              onDisconnect={showDisconnectDialog}
            />
          ))
          : <EmptyListMessage />}

        {(errorMessage !== null || ConnectedWebsitesState.error != null) && (
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>
              {errorMessage ?? ConnectedWebsitesState.error}
            </Text>
          </ValueCard>
        )}
      </div>

      {(ConnectedWebsitesState?.data?.length != null && ConnectedWebsitesState.data.length > 0) &&
        <div className='mt-6'>
          <Button
            className='w-full'
            onClick={showDisconnectAllDialog}
            disabled={disconnectingIds.size > 0}
          >
            {disconnectingIds.size > 0 ? 'Disconnecting...' : 'Disconnect All'}
          </Button>
        </div>}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.type === 'single' ? 'Disconnect Website' : 'Disconnect Websites'}
        message={
          confirmDialog.type === 'single'
            ? `Are you sure you want to disconnect ${confirmDialog.websiteName ?? 'this website'}? This will revoke its access to your wallet.`
            : `Are you sure you want to disconnect ${ConnectedWebsitesState.data?.length ?? 0} connected websites? This will revoke their access to your wallet.`
        }
        confirmText='Disconnect'
        cancelText='Cancel'
        onConfirm={() => {
          handleConfirmDisconnect()
            .catch(e => console.warn('handleConfirmDisconnect error:', e))
        }}
      />
    </div>
  )
}
