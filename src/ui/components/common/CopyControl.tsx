import React, { useEffect, useRef, useState } from 'react'
import { CopyIcon, Popover, Text, useTheme } from 'dash-ui-kit/react'

type CopyState = 'idle' | 'copied' | 'failed'

// How long the result stays on screen after a click.
const FEEDBACK_MS = 1500

// Base classes of the kit's own CopyButton, so this stays a drop-in replacement.
const BASE_CLASS = 'p-0 flex-shrink-0 h-[max-content] min-w-0 bg-transparent transition-colors hover:cursor-pointer'

const THEME_CLASS = {
  light: 'hover:text-gray-600 active:text-gray-800',
  dark: 'hover:text-gray-300 active:text-gray-100'
}

interface CopyControlProps {
  text: string
  className?: string
  'aria-label'?: string
}

/**
 * Copy button that reports the real result. The kit's `CopyButton` says
 * "Copied" unconditionally, and in the popup the clipboard write is rejected
 * whenever focus is lost - on an address that means pasting the previous
 * clipboard entry into a transfer without ever being told.
 */
export function CopyControl ({ text, className, ...props }: CopyControlProps): React.JSX.Element {
  const { theme } = useTheme()
  const [state, setState] = useState<CopyState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
  }, [])

  const showResult = (result: CopyState): void => {
    setState(result)

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setState('idle'), FEEDBACK_MS)
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    // Copy controls sit inside clickable rows, which must not navigate.
    event.stopPropagation()
    event.preventDefault()

    navigator.clipboard.writeText(text)
      .then(() => showResult('copied'))
      .catch(() => showResult('failed'))
  }

  const failed = state === 'failed'

  return (
    <Popover
      open={state !== 'idle'}
      side='top'
      sideOffset={5}
      className='!w-auto !rounded !px-2 !py-1'
      content={
        <Text size='sm' className={failed ? '!text-red-600' : undefined}>
          {failed ? 'Copy failed' : 'Copied'}
        </Text>
      }
    >
      <button
        type='button'
        onClick={handleClick}
        className={`${BASE_CLASS} ${THEME_CLASS[theme === 'dark' ? 'dark' : 'light']} ${className ?? ''}`}
        {...props}
      >
        <CopyIcon className='w-4 h-4 transition' color={theme === 'light' ? '#000000' : '#ffffff'} />
      </button>
    </Popover>
  )
}
