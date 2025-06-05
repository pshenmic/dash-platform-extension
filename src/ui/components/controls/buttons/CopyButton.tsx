import React, { useState, useCallback } from 'react'
import { cva } from 'class-variance-authority'
// import { Tooltip } from '../../ui/Tooltips'
import { CopyIcon } from '../../icons'
import { useTheme } from '../../../contexts/ThemeContext'
import copyToClipboard from "../../../../copyToClipboard";

const copyBtn = cva(
  'p-0 flex-shrink-0 h-[max-content] min-w-0 bg-transparent transition-colors'
)

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to copy into clipboard */
  text: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className, ...props }) => {
  const { theme } = useTheme()

  const [messageState, setMessageState] = useState({
    active: false,
    text: 'Copied',
  })

  const showMessage = useCallback((result: { status: boolean }) => {
    setMessageState({
      active: true,
      text: result.status ? 'Copied' : 'Copy Failed',
    })
    setTimeout(() => {
      setMessageState(ms => ({ ...ms, active: false }))
    }, 2000)
  }, [])

  return (
    <button
      type='button'
      className={`${copyBtn()} ${className ?? ''} hover:text-gray-100 hover:cursor-pointer active:text-white`}
      onClick={e => {
        e.stopPropagation()
        e.preventDefault()
        copyToClipboard(text, showMessage)
      }}
      {...props}
    >
      {/*<Tooltip*/}
      {/*  label={messageState.text}*/}
      {/*  isOpen={messageState.active}*/}
      {/*  isDisabled={!messageState.active}*/}
      {/*  placement='top'*/}
      {/*  className='bg-gray-700 text-white p-3'*/}
      {/*>*/}
        <CopyIcon className={`${theme === 'light' ? 'text-black' : 'text-white'} w-4 h-4 active:text-gray-100 transition`}/>
      {/*</Tooltip>*/}
    </button>
  )
}

export default CopyButton
