import React, { useState } from 'react'
import type { SettingsScreenProps, ScreenConfig } from '../types'
import { KeyIcon, EyeOpenIcon, EyeClosedIcon, DeleteIcon } from 'dash-ui/react'

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
      <EyeOpenIcon className='text-dash-primary-dark-blue' />
    </button>
    <button
      onClick={onDelete}
      className='flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 transition-colors'
      aria-label={`Delete key ${keyId}`}
    >
        <DeleteIcon className='text-dash-primary-dark-blue' />
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
  </div>
)

// Private Keys screen configuration
export const privateKeysScreenConfig: ScreenConfig = {
  id: 'private-keys',
  title: 'Private Keys',
  category: 'wallet',
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
