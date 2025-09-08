import React from 'react'
import { Text, Identifier, Avatar, KeyIcon } from 'dash-ui-kit/react'
import { getPurposeLabel, getSecurityLabel } from '../../../enums'

interface PublicKeyData {
  keyId: number
  purpose: string
  securityLevel: string
  type: string
  isAvailable?: boolean
}

interface IdentityData {
  id: string
  name?: string
  balance: string
  publicKeys: PublicKeyData[]
}

interface IdentityPreviewProps {
  identity: IdentityData
  className?: string
}

const PublicKeyBadge: React.FC<{ text: string }> = ({ text }) => (
  <div className='px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium'>
    {text}
  </div>
)

const PublicKeyItem: React.FC<{ publicKey: PublicKeyData }> = ({ publicKey }) => (
  <div className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 ${!publicKey.isAvailable ? 'opacity-50' : ''}`}>
    <div className='flex items-center flex-wrap gap-2'>
      <div className='flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full'>
        {publicKey.isAvailable ? (
          <KeyIcon size={10} className='text-blue-600' />
        ) : (
          <div className='w-2 h-2 bg-orange-400 rounded-full'>
            <span className='text-orange-600 text-xs font-bold'>!</span>
          </div>
        )}
      </div>
      
      <PublicKeyBadge text={`Key ID: ${publicKey.keyId}`} />
      <PublicKeyBadge text={`Purpose: ${getPurposeLabel(publicKey.purpose)}`} />
      <PublicKeyBadge text={`Security: ${getSecurityLabel(publicKey.securityLevel)}`} />
      <PublicKeyBadge text={`Type: ${publicKey.type}`} />
    </div>
  </div>
)

export const IdentityPreview: React.FC<IdentityPreviewProps> = ({ identity, className = '' }) => {
  const totalKeys = identity.publicKeys.length
  const availableKeys = identity.publicKeys.filter(key => key.isAvailable).length

  return (
    <div className={`bg-gray-50 rounded-2xl p-5 ${className}`}>
      {/* Identity Header */}
      <div className='bg-white rounded-2xl p-4 mb-4'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center'>
            <Avatar username={identity.id} />
          </div>
          
          <div className='flex-1'>
            {identity.name && (
              <Text size='lg' weight='semibold' className='text-gray-900 mb-1'>
                {identity.name}
              </Text>
            )}
            <Identifier
              key={identity.id}
              middleEllipsis
              edgeChars={8}
              highlight='both'
              className='text-sm'
            >
              {identity.id}
            </Identifier>
          </div>
        </div>
      </div>

      {/* Public Keys Section */}
      <div className='mb-4'>
        <div className='flex items-center justify-between mb-3'>
          <Text size='sm' weight='medium' className='text-gray-700'>
            Public Keys:
          </Text>
          <div className='flex items-center gap-2'>
            <Text size='sm' weight='medium' className='text-gray-900'>
              {totalKeys} Public Keys:
            </Text>
            <KeyIcon size={16} className='text-gray-600' />
          </div>
        </div>

        <div className='bg-white rounded-2xl p-4'>
          <div className='space-y-3'>
            {identity.publicKeys.map((publicKey, index) => (
              <PublicKeyItem key={`${publicKey.keyId}-${index}`} publicKey={publicKey} />
            ))}
          </div>

          {availableKeys < totalKeys && (
            <div className='mt-3 pt-3 border-t border-gray-100'>
              <div className='bg-orange-50 rounded-lg p-3'>
                <Text size='sm' className='text-orange-700'>
                  Note: {totalKeys - availableKeys} key{totalKeys - availableKeys > 1 ? 's' : ''} will not be available for import
                </Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
