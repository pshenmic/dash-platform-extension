import React from 'react'
import { Input, EyeClosedIcon, EyeOpenIcon, DeleteIcon, Text } from 'dash-ui/react'

export interface PrivateKeyInputData {
  id: string
  value: string
  isVisible: boolean
  hasError?: boolean
}

interface PrivateKeyInputProps {
  input: PrivateKeyInputData
  placeholder?: string
  showAddButton?: boolean
  canDelete?: boolean
  onValueChange: (id: string, value: string) => void
  onVisibilityToggle: (id: string) => void
  onDelete?: (id: string) => void
  onAdd?: () => void
}

export const PrivateKeyInput: React.FC<PrivateKeyInputProps> = ({
  input,
  placeholder = 'Paste your Key',
  showAddButton = false,
  canDelete = false,
  onValueChange,
  onVisibilityToggle,
  onDelete,
  onAdd
}) => {
  const hasValue = Boolean(input.value?.trim())
  const showControls = hasValue && (canDelete || true) // Always show eye icon when there's a value

  return (
    <div className='flex gap-2.5'>
      <div className='flex-1 relative'>
        <Input
          placeholder={placeholder}
          value={input.value}
          onChange={(e) => onValueChange(input.id, e.target.value)}
          type={input.isVisible ? 'text' : 'password'}
          colorScheme={input.hasError ? 'error' : 'default'}
          size='xl'
          showPasswordToggle={false}
          style={{
            paddingRight: showControls
              ? (canDelete ? '4.5rem' : '2.5rem')
              : undefined
          }}
        />
        {showControls && (
          <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1'>
            <button
              onClick={() => onVisibilityToggle(input.id)}
              className='p-1 hover:bg-gray-100 rounded'
              type='button'
              aria-label={input.isVisible ? 'Hide private key' : 'Show private key'}
            >
              {input.isVisible
                ? <EyeClosedIcon className='text-dash-primary-dark-blue' />
                : <EyeOpenIcon className='text-dash-primary-dark-blue' />}
            </button>
            {canDelete && (onDelete != null) && (
              <button
                onClick={() => onDelete(input.id)}
                className='p-1 hover:bg-gray-100 rounded'
                type='button'
                aria-label='Delete private key input'
              >
                <DeleteIcon />
              </button>
            )}
          </div>
        )}
      </div>
      {showAddButton && (onAdd != null) && (
        <button
          onClick={onAdd}
          disabled={!hasValue}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl border border-gray-200 ${
            hasValue
              ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
              : 'bg-gray-25 cursor-not-allowed opacity-50'
          }`}
          type='button'
          aria-label='Add another private key input'
        >
          <Text size='xl' weight='medium'>+</Text>
        </button>
      )}
    </div>
  )
}
