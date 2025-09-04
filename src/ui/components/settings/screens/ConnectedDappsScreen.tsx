import React, { useState, useEffect } from 'react'
import { Text, WebIcon, Button } from 'dash-ui/react'
import { useExtensionAPI } from '../../../hooks/useExtensionAPI'
import { ConfirmDialog } from '../../controls'
import type { SettingsScreenProps } from '../types'
import type { AppConnect } from '../../../../types'

export const ConnectedDappsScreen: React.FC<SettingsScreenProps> = () => {
  const [connectedDapps, setConnectedDapps] = useState<AppConnect[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'single' | 'all'
    dappId?: string
    dappName?: string
  }>({ open: false, type: 'single' })
  const extensionAPI = useExtensionAPI()

  useEffect(() => {
    const loadConnectedDapps = async (): Promise<void> => {
      try {
        const dapps = await extensionAPI.getAllAppConnects()
        setConnectedDapps(dapps)
      } catch (error) {
        console.error('Failed to load connected dapps:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadConnectedDapps()
  }, [extensionAPI])

  const showDisconnectDialog = (dappId: string): void => {
    const dapp = connectedDapps.find(d => d.id === dappId)
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
      setConnectedDapps(prev => prev.filter(dapp => dapp.id !== dappId))
    } catch (error) {
      console.warn(`Failed to disconnect dapp ${dappId}:`, error)
    } finally {
      setDisconnectingIds(prev => {
        const next = new Set(prev)
        next.delete(dappId)
        return next
      })
    }
  }

  const handleDisconnectAll = async (): Promise<void> => {
    const allIds = connectedDapps.map(dapp => dapp.id)
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

  const renderIcon = (): React.JSX.Element => (
    <div className='w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center'>
      <WebIcon />
    </div>
  )

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[200px]'>
        <Text size='md' className='text-gray-500'>
          Loading connected DApps...
        </Text>
      </div>
    )
  }

  if (connectedDapps.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[200px] text-center'>
        <Text size='lg' weight='medium' className='text-gray-600'>
          No Connected DApps
        </Text>
        <Text size='sm' className='text-gray-500'>
          When you connect to DApps, they will appear here
        </Text>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4 h-full'>
      <Text
        size='sm'
        dim
        className='opacity-50 text-dash-primary-dark-blue'
      >
        Manage dapps you have connected to.
      </Text>

      <div className='flex flex-col gap-[0.875rem] h-full grow'>
        {connectedDapps.map((dapp) => (
          <div
            key={dapp.id}
            className='rounded-[1rem] px-[1rem] py-[0.625rem] flex items-center justify-between bg-[rgba(12,28,51,0.03)]'
          >
            <div className='flex items-center gap-[1rem] grow-1'>
              {renderIcon()}

              <div className='flex flex-col gap-[0.25rem]'>
                <Text size='md' className='text-dash-primary-dark-blue leading-[1.2]'>
                  {new URL(dapp.url).hostname}
                </Text>
                <Text
                  dim
                  className='!font-grotesque !text-[0.75rem] leading-[1.2]'
                >
                  {dapp.url}
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
        ))}
      </div>

      <div className='mt-6'>
        <Button
          className='w-full'
          onClick={showDisconnectAllDialog}
          disabled={disconnectingIds.size > 0}
        >
          {disconnectingIds.size > 0 ? 'Disconnecting...' : 'Disconnect All'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.type === 'single' ? 'Disconnect DApp' : 'Disconnect DApps'}
        message={
          confirmDialog.type === 'single'
            ? `Are you sure you want to disconnect ${confirmDialog.dappName ?? 'this DApp'}? This will revoke its access to your wallet.`
            : `Are you sure you want to disconnect ${connectedDapps.length} connected DApps? This will revoke their access to your wallet.`
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
