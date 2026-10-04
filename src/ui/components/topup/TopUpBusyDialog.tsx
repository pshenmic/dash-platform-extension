import React from 'react'
import { Identifier } from 'dash-ui-kit/react'
import { ConfirmDialog } from '../controls'
import type { OpenExtensionTab } from '../../utils/extensionTab'

interface TopUpBusyDialogProps {
  tab: OpenExtensionTab | null
  onDismiss: () => void
  onFocus: () => void
}

/** Shown when a top-up tab is already open, since only one is tracked at a time. */
export function TopUpBusyDialog ({ tab, onDismiss, onFocus }: TopUpBusyDialogProps): React.JSX.Element {
  return (
    <ConfirmDialog
      open={tab !== null}
      onOpenChange={(open) => { if (!open) onDismiss() }}
      title='Top-up already in progress'
      message={
        <span className='flex flex-col gap-2'>
          <span>A top-up is already open in another tab{tab?.identityId != null ? ' for identity:' : '.'}</span>

          {tab?.identityId != null && (
            <Identifier ellipsis={false} highlight='both'>
              {tab.identityId}
            </Identifier>
          )}

          <span>Finish or close that tab first.</span>
        </span>
      }
      confirmText='Open That Tab'
      confirmColorScheme='brand'
      cancelText='Cancel'
      onConfirm={onFocus}
    />
  )
}
