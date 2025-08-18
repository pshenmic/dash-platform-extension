import React, { useState } from 'react'
import { MenuSection } from '../MenuSection'
import type { SettingsScreenProps, ScreenConfig } from '../types'

// Key icon component
const KeyIcon: React.FC = () => (
  <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
    <path
      d='M5 2.5C5 1.11929 3.88071 0 2.5 0C1.11929 0 0 1.11929 0 2.5C0 3.88071 1.11929 5 2.5 5C3.88071 5 5 3.88071 5 2.5Z'
      stroke='#4C7EFF'
      strokeWidth='1'
    />
    <path
      d='M2.5 5L2.5 10M2.5 7.5L4.5 7.5M2.5 9L3.5 9'
      stroke='#4C7EFF'
      strokeWidth='1'
      strokeLinecap='round'
    />
  </svg>
)

// Eye icon for viewing key
const EyeIcon: React.FC = () => (
  <svg width='12' height='8' viewBox='0 0 12 8' fill='none'>
    <path
      d='M6 0C3.273 0 0.864 1.6 0 4C0.864 6.4 3.273 8 6 8C8.727 8 11.136 6.4 12 4C11.136 1.6 8.727 0 6 0ZM6 6.5C4.619 6.5 3.5 5.381 3.5 4C3.5 2.619 4.619 1.5 6 1.5C7.381 1.5 8.5 2.619 8.5 4C8.5 5.381 7.381 6.5 6 6.5ZM6 2.5C5.172 2.5 4.5 3.172 4.5 4C4.5 4.828 5.172 5.5 6 5.5C6.828 5.5 7.5 4.828 7.5 4C7.5 3.172 6.828 2.5 6 2.5Z'
      fill='#0C1C33'
    />
  </svg>
)

// Delete icon
const DeleteIcon: React.FC = () => (
  <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
    <path
      d='M2.5 1H7.5M1 2.5H9M8.5 2.5L8.17 7.01C8.123 7.563 7.667 8 7.113 8H2.887C2.333 8 1.877 7.563 1.83 7.01L1.5 2.5M3.5 4.5V6.5M6.5 4.5V6.5'
      stroke='#0C1C33'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

// Separator line
const SeparatorIcon: React.FC = () => (
  <svg width='10.61' height='6.02' viewBox='0 0 11 7' fill='none'>
    <path
      d='M1 1L5.5 5.5L10 1'
      stroke='#0C1C33'
      strokeWidth='1'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

interface PrivateKey {
  id: number
  securityLevel: 'High' | 'Master' | 'Critical'
  keyType: 'Authentication' | 'Transfer'
}

// Component for rendering security level badge
const SecurityBadge: React.FC<{ level: PrivateKey['securityLevel'] }> = ({ level }) => (
  <div className='inline-flex items-center px-2 py-1 rounded-lg bg-gray-100'>
    <span className='text-xs font-medium text-gray-700'>
      {level}
    </span>
  </div>
)

// Component for rendering key type badge
const KeyTypeBadge: React.FC<{ type: PrivateKey['keyType'] }> = ({ type }) => (
  <div className='inline-flex items-center px-2 py-1 rounded-lg bg-gray-100'>
    <span className='text-xs font-medium text-gray-700'>
      {type}
    </span>
  </div>
)

// Component for key action buttons
const KeyActions: React.FC<{ keyId: number; onView: () => void; onDelete: () => void }> = ({ 
  keyId, 
  onView, 
  onDelete 
}) => (
  <div className='flex items-center gap-1'>
    <button
      onClick={onView}
      className='flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors'
      aria-label={`View key ${keyId}`}
    >
      <EyeIcon />
    </button>
    <button
      onClick={onDelete}
      className='flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors'
      aria-label={`Delete key ${keyId}`}
    >
      <DeleteIcon />
    </button>
  </div>
)

// Main private key item component
const PrivateKeyItem: React.FC<{ 
  privateKey: PrivateKey; 
  onView: (id: number) => void; 
  onDelete: (id: number) => void;
  showSeparator?: boolean;
}> = ({ privateKey, onView, onDelete, showSeparator = true }) => (
  <div className='bg-gray-100 rounded-2xl p-3'>
    <div className='flex items-center justify-between'>
      <div className='flex items-center flex-wrap gap-2 flex-1'>
        <div className='flex items-center justify-center w-5 h-5 rounded-full bg-blue-50'>
          <KeyIcon />
        </div>
        <span className='text-sm font-medium text-gray-900'>
          Key ID: {privateKey.id}
        </span>
        <SecurityBadge level={privateKey.securityLevel} />
        <KeyTypeBadge type={privateKey.keyType} />
      </div>
      <KeyActions 
        keyId={privateKey.id}
        onView={() => onView(privateKey.id)}
        onDelete={() => onDelete(privateKey.id)}
      />
    </div>
    {showSeparator && (
      <div className='flex justify-center mt-3'>
        <SeparatorIcon />
      </div>
    )}
  </div>
)

// Private Keys screen configuration
export const privateKeysScreenConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Private Keys',
  category: 'wallet',
  order: 3,
  content: [] // Content will be generated dynamically
}

export const PrivateKeysScreen: React.FC<SettingsScreenProps> = () => {
  const [privateKeys] = useState<PrivateKey[]>([
    { id: 0, securityLevel: 'High', keyType: 'Authentication' },
    { id: 1, securityLevel: 'Master', keyType: 'Authentication' },
    { id: 2, securityLevel: 'Critical', keyType: 'Transfer' },
    { id: 3, securityLevel: 'High', keyType: 'Authentication' }
  ])

  const handleViewKey = (keyId: number): void => {
    console.log(`View private key: ${keyId}`)
    // TODO: Implement view key functionality (show private key in modal)
  }

  const handleDeleteKey = (keyId: number): void => {
    console.log(`Delete private key: ${keyId}`)
    // TODO: Implement delete key functionality with confirmation
  }

  const handleImportPrivateKeys = (): void => {
    console.log('Import private keys')
    // TODO: Navigate to import private keys screen
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Description */}
      <div className='px-4 mb-6'>
        <p className='text-sm font-medium text-gray-600'>
          Manage identities you have added to the extension.
        </p>
      </div>

      {/* Private Keys List */}
      <div className='flex-1 px-4 space-y-2.5'>
        {privateKeys.map((privateKey, index) => (
          <PrivateKeyItem
            key={privateKey.id}
            privateKey={privateKey}
            onView={handleViewKey}
            onDelete={handleDeleteKey}
            showSeparator={index < privateKeys.length - 1}
          />
        ))}
      </div>

      {/* Import Button */}
      <div className='p-4 mt-auto'>
        <button
          onClick={handleImportPrivateKeys}
          className='w-full bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl px-6 py-3'
        >
          <span className='text-base font-medium text-blue-600'>
            Import Private Keys
          </span>
        </button>
      </div>
    </div>
  )
}
