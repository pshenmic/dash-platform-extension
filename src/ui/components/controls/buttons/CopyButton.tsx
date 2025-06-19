import React from 'react'
import { cva } from 'class-variance-authority'
import { CopyIcon } from '../../icons'
import { useTheme } from '../../../contexts/ThemeContext'
import copyToClipboard from '../../../../copyToClipboard'

const copyBtn = cva(
  'p-0 flex-shrink-0 h-[max-content] min-w-0 bg-transparent transition-colors'
)

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to copy into clipboard */
  text: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className, ...props }) => {
  const { theme } = useTheme()

  return (
    <button
      type='button'
      className={`${copyBtn()} ${className ?? ''} hover:text-gray-100 hover:cursor-pointer active:text-white`}
      onClick={e => {
        e.stopPropagation()
        e.preventDefault()
        copyToClipboard(text)
      }}
      {...props}
    >
      <CopyIcon className={`${theme === 'light' ? 'text-black' : 'text-white'} w-4 h-4 active:text-gray-100 transition`} />
    </button>
  )
}

export default CopyButton
