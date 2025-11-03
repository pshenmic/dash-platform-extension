import React, { useState, useEffect } from 'react'
import {
  Button,
  Dialog,
  Input,
  Text,
  ValueCard,
  InfoCircleIcon,
  Heading,
  CopyButton,
  EyeOpenIcon,
  EyeClosedIcon
} from 'dash-ui-kit/react'

export interface PublicKey {
  keyId: number
  securityLevel: string
  purpose: string
  hash: string
  type: string
  data: string
  readOnly: boolean
}

export interface PrivateKeyDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  publicKey: PublicKey | null
  onSubmitPassword: (password: string) => Promise<void>
  privateKeyData: string | null
  isLoading: boolean
  error: string | null
}

export const PrivateKeyDialog: React.FC<PrivateKeyDialogProps> = ({
  isOpen,
  onOpenChange,
  publicKey,
  onSubmitPassword,
  privateKeyData,
  isLoading,
  error
}) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setPassword('')
      setShowPassword(false)
      setLocalError(null)
    }
  }, [isOpen])

  useEffect(() => {
    setLocalError(error)
  }, [error])

  const handleSubmit = async (): Promise<void> => {
    if (password.trim() === '') {
      setLocalError('Password is required')
      return
    }

    try {
      await onSubmitPassword(password)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to fetch private key')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading && privateKeyData == null) {
      void handleSubmit()
    }
  }

  const handleClose = (): void => {
    onOpenChange(false)
  }

  if (publicKey == null) return null

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onOpenChange}
      className='w-[390px] max-w-[390px]'
      showCloseButton={false}
      position='bottom'
      bottomOffset={20}
      horizontalMargin={20}
    >
      <div className='flex flex-col gap-4'>
        {/* Key Info */}
        <div className='flex gap-3'>
          <ValueCard
            colorScheme='lightGray'
            size='sm'
            className='flex items-center gap-3 p-3 rounded-xl'
          >
            <InfoCircleIcon size={18} className='text-blue-500' />
            <Text size='sm' monospace weight='500'>
              {publicKey.data.slice(0, 5)}...{publicKey.data.slice(-5)}
            </Text>
          </ValueCard>

          <ValueCard
            colorScheme='lightGray'
            size='sm'
            className='flex items-center p-3 rounded-xl'
          >
            <Text size='sm' monospace weight='500'>
              {publicKey.purpose}
            </Text>
          </ValueCard>
        </div>

        {/* Content Card */}
        <div className='flex flex-col gap-3'>
          <Heading size='xl' className='!text-[1.5rem]'>
            {privateKeyData != null ? 'Your Private Key' : 'To Show your Private Key, Enter Your Wallet Password'}
          </Heading>

          <Text size='sm' weight='medium' dim>
            Do NOT share your private keys with anyone.
          </Text>

          {privateKeyData == null
            ? (
              /* Password Input State */
              <div className='flex flex-col gap-2.5'>
                <Text dim>
                  Password
                </Text>

                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Your Password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className='w-full pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity'
                  >
                    {showPassword
                      ? (
                        <EyeClosedIcon className='w-4 h-4' />
                        )
                      : (
                        <EyeOpenIcon className='w-4 h-4' />
                        )}
                  </button>
                </div>

                {localError != null && (
                  <Text size='sm' className='text-red-600'>
                    {localError}
                  </Text>
                )}
              </div>
              )
            : (
               /* Private Key Display State */
               <div className='bg-white shadow-[0px_0px_25px_0px_rgba(0,0,0,0.05)] rounded-[20px] p-[15px]'>
                 <div className='flex items-center justify-between gap-6'>
                   <Text
                     size='sm'
                     weight='500'
                     className='break-all flex-1'
                     monospace
                   >
                     {privateKeyData}
                   </Text>
                   <CopyButton
                     text={privateKeyData}
                     value={privateKeyData}
                     className='p-[5px] bg-[rgba(12,28,51,0.05)] rounded-[5px] hover:bg-[rgba(12,28,51,0.1)] transition-colors shrink-0'
                   />
                 </div>
               </div>
              )}
          </div>

        {/* Action Button */}
        <Button
          onClick={privateKeyData != null ? handleClose : () => { void handleSubmit() }}
          variant='solid'
          colorScheme='brand'
          size='md'
          className='w-full rounded-[15px]'
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : privateKeyData != null ? 'Close' : 'Show Private Key'}
        </Button>
      </div>
    </Dialog>
  )
}

