import React from 'react'
import { Text, AttentionCircleIcon } from 'dash-ui-kit/react'

export function SeedPhraseSecurityNotice (): React.JSX.Element {
  return (
    <div className='mb-4 p-3 bg-white rounded-xl shadow-[0_0_75px_0_rgba(0,0,0,0.1)]'>
      <div className='flex items-center gap-3'>
        <AttentionCircleIcon size={26} className='shrink-0 text-dash-primary-dark-blue/40' />
        <Text size='xs'>
          <span className='font-extrabold'>DO NOT share your recovery phrase with ANYONE.</span><br />
          Anyone with your recovery phrase can have full control over your assets. Please stay vigilant against phishing attacks at all times.
        </Text>
      </div>
    </div>
  )
}
