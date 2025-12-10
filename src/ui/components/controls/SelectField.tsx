import React from 'react'
import { Text } from 'dash-ui-kit/react'

export interface SelectFieldProps {
  label: string
  options: Array<{ id: string, label: string, value: any }>
  selectedValue: any
  onSelect: (value: any) => void
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, options, selectedValue, onSelect }) => {
  return (
    <div className='flex flex-col gap-3'>
      <Text size='sm' dim>
        {label}
      </Text>
      <div className='flex flex-wrap gap-2'>
        {options.map((option) => {
          const isSelected = selectedValue === option.value
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.value)}
              className={`
                px-3 py-2.5 rounded-2xl text-xs font-medium transition-colors cursor-pointer
                ${isSelected
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }\
              `}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
