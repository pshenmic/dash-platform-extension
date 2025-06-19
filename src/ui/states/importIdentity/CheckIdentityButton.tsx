import React from 'react'

interface CheckIdentityButtonProps {
  callback: () => void
  disabled: boolean
}

export default function CheckIdentityButton ({ callback, disabled }: CheckIdentityButtonProps): React.JSX.Element {
  return (
    <div>
      <button disabled={disabled} onClick={callback}>Check</button>
    </div>
  )
}
