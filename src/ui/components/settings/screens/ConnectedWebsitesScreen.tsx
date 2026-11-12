import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Text, Button, WebIcon } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { ConfirmDialog } from '../../controls'
import { Banner } from '../../cards'
import { ConnectedWebsiteItem } from '../../websites/ConnectedWebsiteItem'
import type { SettingsScreenProps } from '../types'
import type { AppConnect } from '../../../../types'
import type { OutletContext } from '../../../types'

interface ConfirmDialogState {
  open: boolean
  type: 'single' | 'all'
  websiteId?: string
  websiteName?: string
}

const EmptyListMessage = (): React.JSX.Element => (
  <div className='flex flex-col items-center gap-3 px-4 py-8 rounded-3xl bg-dash-primary-dark-blue/[0.03] text-center'>
    <div className='flex items-center justify-center size-12 rounded-full bg-white'>
      <WebIcon />
    </div>
    <div className='flex flex-col gap-1'>
      <Text size='sm' weight='medium'>No connected websites</Text>
      <Text size='xs' weight='medium' dim>When you connect to websites, they will appear here</Text>
    </div>
  </div>
)

export const ConnectedWebsitesScreen: React.FC<SettingsScreenProps> = () => {
  const [ConnectedWebsitesState, loadConnectedWebsites, setConnectedWebsites] = useAsyncState<AppConnect[]>([])
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ open: false, type: 'single' })
  const extensionAPI = useExtensionAPI()
  const { availableIdentities } = useOutletContext<OutletContext>()
  const walletIdentities = availableIdentities.map(identity => identity.identifier)
  const errorHiddenTime = 5000

  const showError = (message: string): void => {
    setErrorMessage(message)
    setTimeout(() => setErrorMessage(null), errorHiddenTime)
  }

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
      showError(`Failed to disconnect website ${websiteId}: ${String(error)}`)
    } finally {
      setDisconnectingIds(prev => {
        const next = new Set(prev)
        next.delete(websiteId)
        return next
      })
    }
  }

  // Saves the identities a website can see; the list updates at once and rolls back on failure.
  const handleIdentitiesChange = async (websiteId: string, identities: string[]): Promise<void> => {
    const previous = ConnectedWebsitesState.data ?? []
    setConnectedWebsites(previous.map(website => website.id === websiteId ? { ...website, identities } : website))
    setSavingIds(prev => new Set(prev).add(websiteId))

    try {
      await extensionAPI.setAppConnectIdentities(websiteId, identities)
    } catch (error) {
      setConnectedWebsites(previous)
      showError(`Failed to update website access: ${String(error)}`)
    } finally {
      setSavingIds(prev => {
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

      showError(`Failed to disconnect all websites: ${String(error)}`)
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
      <Text size='xs' weight='medium' dim>
        Websites you have connected to and the identities each of them can see.
      </Text>

      <div className='flex flex-col gap-2.5 h-full grow'>
        {ConnectedWebsitesState.loading &&
          <Text size='sm' dim>Loading...</Text>}

        {ConnectedWebsitesState?.data?.length != null && ConnectedWebsitesState.data.length > 0
          ? ConnectedWebsitesState.data?.map(website => (
            <ConnectedWebsiteItem
              key={website.id}
              website={website}
              walletIdentities={walletIdentities}
              isDisconnecting={disconnectingIds.has(website.id)}
              isSaving={savingIds.has(website.id)}
              onDisconnect={showDisconnectDialog}
              onIdentitiesChange={(websiteId, identities) => {
                handleIdentitiesChange(websiteId, identities)
                  .catch(e => console.warn('handleIdentitiesChange error:', e))
              }}
            />
          ))
          : <EmptyListMessage />}

        {(errorMessage !== null || ConnectedWebsitesState.error != null) && (
          <Banner variant='error' message={errorMessage ?? ConnectedWebsitesState.error ?? ''} className='break-all' />
        )}
      </div>

      {(ConnectedWebsitesState?.data?.length != null && ConnectedWebsitesState.data.length > 0) &&
        <div className='mt-auto pt-2'>
          <Button
            colorScheme='lightBlue'
            size='xl'
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
