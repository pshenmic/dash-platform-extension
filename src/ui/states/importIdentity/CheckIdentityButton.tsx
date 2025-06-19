import React from 'react'

export default function CheckIdentityButton ({ callback, disabled }) {
  return (
    <div>
      <button disabled={disabled} onClick={callback}>Check</button>
    </div>
  )
}
