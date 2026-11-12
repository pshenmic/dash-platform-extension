import React, { useState } from 'react'
import { ChevronIcon, Text } from 'dash-ui-kit/react'
import { useTransactionSigned } from './index'

/** Secondary rows behind a "More details" toggle while signing, shown inline once signed. */
export function MoreDetails ({ children }: { children: React.ReactNode }): React.JSX.Element {
  const signed = useTransactionSigned()
  const [open, setOpen] = useState(false)

  if (signed) return <>{children}</>

  return (
    <>
      {open && children}
      <button
        type='button'
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className='flex items-center gap-1.5 self-start pt-2 cursor-pointer'
      >
        <Text size='xs' weight='medium' className='!text-dash-brand'>{open ? 'Less details' : 'More details'}</Text>
        <ChevronIcon className={`size-2.5 text-dash-brand transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </>
  )
}
