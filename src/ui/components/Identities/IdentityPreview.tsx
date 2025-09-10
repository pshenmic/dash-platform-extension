import React from 'react'
import { Text, Identifier, Avatar, CheckmarkIcon, Accordion, KeyIcon } from 'dash-ui-kit/react'
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

const PublicKeyBadge: React.FC<{ title: string, value: string }> = ({ title, value }) => (
  <div className='flex gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium'>
    <span>
      {title}:
    </span>
    <span className='font-bold'>
      {value}
    </span>
  </div>
)

const PublicKeyItem: React.FC<{ publicKey: PublicKeyData }> = ({publicKey}) => (
  <div className={`bg-white rounded-xl p-2 shadow-sm border border-gray-100 ${!publicKey.isAvailable ? 'opacity-50' : ''}`}>
    <div className='flex items-center flex-wrap gap-1'>
      <div className='flex items-center justify-center w-5 h-5 rounded-full mr-1'>
        {publicKey.isAvailable ? (
          <div className='w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center'>
            <CheckmarkIcon size={10} className='text-blue-600' />
          </div>
        ) : (
          <div className='w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center'>
            <Text size='xs' className='text-orange-600 font-bold'>!</Text>
          </div>
        )}
      </div>

      <PublicKeyBadge title='Key ID' value={`${publicKey.keyId}`} />
      <PublicKeyBadge title='Purpose' value={`${getPurposeLabel(publicKey.purpose)}`} />
      <PublicKeyBadge title='Security' value={`${getSecurityLabel(publicKey.securityLevel)}`} />
      <PublicKeyBadge title='Type' value={`${publicKey.type}`} />
    </div>
  </div>
)

export const IdentityPreview: React.FC<IdentityPreviewProps> = ({ identity, className = '' }) => {
  const totalKeys = identity.publicKeys.length
  const availableKeys = identity.publicKeys.filter(key => key.isAvailable).length

  return (
    <div className={`bg-gray-50 rounded-2xl p-5 ${className}`}>
      <div className='bg-dash-primary-dark-blue/[0.05] rounded-2xl p-3 mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-14 h-14 rounded-full overflow-hidden'>
            <Avatar username={identity.id} />
          </div>

          <div className='flex-1'>
            {identity.name && (
              <Text size='md' weight='medium' className='text-gray-900 mb-1'>
                {identity.name}
              </Text>
            )}
            <Identifier
              key={identity.id}
              highlight='both'
              className='text-xs'
              linesAdjustment={false}
            >
              {identity.id}
            </Identifier>
          </div>
        </div>
      </div>

      <div className='flex gap-2 items-center mb-3'>
        <KeyIcon className='text-gray-700 ml-1 w-4 h-4' />
        <Text size='sm' weight='medium' className='text-gray-700 opacity-50'>
          Public Keys:
        </Text>
      </div>

      <Accordion
        title={`${availableKeys} / ${totalKeys} Public Keys:`}
        showSeparator={true}
      >
        <div className='space-y-3'>
          {identity.publicKeys.map((publicKey, index) => (
            <PublicKeyItem key={`${publicKey.keyId}-${index}`} publicKey={publicKey}/>
          ))}
        </div>
      </Accordion>
    </div>
  )
}
