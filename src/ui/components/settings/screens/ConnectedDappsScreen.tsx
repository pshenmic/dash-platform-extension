import React, { useState, useEffect } from 'react'
import { Text, WebIcon, Button, ValueCard } from 'dash-ui-kit/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { useAsyncState } from '../../../hooks/useAsyncState'
import { ConfirmDialog } from '../../controls'
import type { SettingsScreenProps } from '../types'
import type { AppConnect } from '../../../../types'

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
  const [connectedDappsState, loadConnectedDapps, setConnectedDapps] = useAsyncState<AppConnect[]>([])
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'single' | 'all'
    dappId?: string
    dappName?: string
  }>({ open: false, type: 'single' })
  const extensionAPI = useExtensionAPI()

  useEffect(() => {
    loadConnectedDapps(async () => await extensionAPI.getAllAppConnects())
      .catch(console.log)
  }, [extensionAPI, loadConnectedDapps])

  const showDisconnectDialog = (dappId: string): void => {
    const dapp = connectedDappsState.data?.find(d => d.id === dappId)
    setConfirmDialog({
      open: true,
      type: 'single',
      dappId,
      dappName: (dapp != null) ? new URL(dapp.url).hostname : 'Unknown'
    })
  }

  const showDisconnectAllDialog = (): void => {
    setConfirmDialog({
      open: true,
      type: 'all'
    })
  }

  const handleDisconnect = async (dappId: string): Promise<void> => {
    setDisconnectingIds(prev => new Set(prev).add(dappId))

    try {
      await extensionAPI.removeAppConnectById(dappId)
      if (connectedDappsState.data != null) {
        setConnectedDapps(connectedDappsState.data.filter(dapp => dapp.id !== dappId))
      }
      throw new Error('asdasdasd')
    } catch (error) {
      setErrorMessage(`Failed to disconnect dapp ${dappId}: ${String(error)}`)
    } finally {
      setDisconnectingIds(prev => {
        const next = new Set(prev)
        next.delete(dappId)
        return next
      })
    }
  }

  const handleDisconnectAll = async (): Promise<void> => {
    if (connectedDappsState.data == null) return

    const allIds = connectedDappsState.data.map(dapp => dapp.id)
    setDisconnectingIds(new Set(allIds))

    try {
      await Promise.all(allIds.map(async id => await extensionAPI.removeAppConnectById(id)))
      setConnectedDapps([])
    } catch (error) {
      console.warn('Failed to disconnect all dapps:', error)
      const dapps = await extensionAPI.getAllAppConnects()
      setConnectedDapps(dapps)
    } finally {
      setDisconnectingIds(new Set())
    }
  }

  const handleConfirmDisconnect = async (): Promise<void> => {
    if (confirmDialog.type === 'single' && confirmDialog.dappId != null && confirmDialog.dappId !== '') {
      await handleDisconnect(confirmDialog.dappId)
    } else if (confirmDialog.type === 'all') {
      await handleDisconnectAll()
    }
  }

  return (
    <div className='flex flex-col gap-4 h-full'>
      <Text
        size='sm'
        dim
        className='text-dash-primary-dark-blue'
      >
        Manage dapps you have connected to.
      </Text>

      <div className='flex flex-col gap-[0.875rem] h-full grow'>
        <Text dim>
          {connectedDappsState.loading && 'loading...'}
        </Text>

        {connectedDappsState?.data?.length != null && connectedDappsState.data.length > 0
          ? connectedDappsState.data?.map((dapp) => (
              <div
                key={dapp.id}
                className='rounded-[1rem] px-[1rem] py-[0.625rem] flex items-center justify-between bg-dash-primary-dark-blue/[0.03]'
              >
                <div className='flex items-center gap-[1rem] grow-1'>
                  <div className='w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center'>
                    <WebIcon/>
                  </div>

                  <div className='flex flex-col gap-[0.25rem]'>
                    <Text size='md' className='text-dash-primary-dark-blue leading-[1.2]'>
                      {new URL(dapp.url).hostname}
                    </Text>
                  </div>
                </div>

                <Button
                  size='sm'
                  className='h-8 !min-h-auto'
                  onClick={() => showDisconnectDialog(dapp.id)}
                  disabled={disconnectingIds.has(dapp.id)}
                >
                  {disconnectingIds.has(dapp.id) ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            ))
          : (
            <ValueCard>
              <Text size='lg' weight='medium' className='text-gray-600'>
                No Connected DApps
              </Text>
              <Text size='sm' className='text-gray-500'>
                When you connect to DApps, they will appear here
              </Text>
            </ValueCard>
          )
        }

        {/* Error Display */}
        {(errorMessage !== null || connectedDappsState.error != null) && (
          <ValueCard colorScheme='yellow' className='break-all'>
            <Text color='red'>
              {errorMessage ?? connectedDappsState.error}
            </Text>
          </ValueCard>
        )}
      </div>

      {(connectedDappsState?.data?.length != null && connectedDappsState.data.length > 0) &&
        <div className='mt-6'>
          <Button
            className='w-full'
            onClick={showDisconnectAllDialog}
            disabled={disconnectingIds.size > 0}
          >
            {disconnectingIds.size > 0 ? 'Disconnecting...' : 'Disconnect All'}
          </Button>
        </div>
      }

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.type === 'single' ? 'Disconnect DApp' : 'Disconnect DApps'}
        message={
          confirmDialog.type === 'single'
            ? `Are you sure you want to disconnect ${confirmDialog.dappName ?? 'this DApp'}? This will revoke its access to your wallet.`
            : `Are you sure you want to disconnect ${connectedDappsState.data?.length ?? 0} connected DApps? This will revoke their access to your wallet.`
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
