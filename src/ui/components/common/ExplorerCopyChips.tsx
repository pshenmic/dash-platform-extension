import React from 'react'
import { CopyButton, ExternalLinkIcon } from 'dash-ui-kit/react'
import { IconChip, iconChipClassName } from './IconChip'

interface ExplorerCopyChipsProps {
  /** Text placed in the clipboard by the copy chip. */
  value: string
  explorerUrl?: string | null
  copyLabel?: string
  /** Keeps clicks from reaching a clickable parent card. */
  onStop?: (event: React.MouseEvent) => void
  iconSize?: number
}

/** Explorer link plus copy button, the pair shown next to every address and identifier. */
export function ExplorerCopyChips ({
  value,
  explorerUrl,
  copyLabel = 'Copy',
  onStop,
  iconSize = 14
}: ExplorerCopyChipsProps): React.JSX.Element {
  const hasExplorer = explorerUrl != null && explorerUrl !== ''

  return (
    <>
      {hasExplorer && (
        <IconChip label='View in explorer' href={explorerUrl} onClick={onStop}>
          <ExternalLinkIcon size={iconSize} color='#000000' />
        </IconChip>
      )}
      {/* CopyButton is the interactive element here, so the wrapper stays a plain div. */}
      <div className={iconChipClassName} onClick={onStop}>
        <CopyButton
          text={value}
          aria-label={copyLabel}
          className='!p-0 !bg-transparent [&_svg]:!size-3.5'
        />
      </div>
    </>
  )
}
