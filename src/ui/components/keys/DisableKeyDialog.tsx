import React from 'react'
import {
  Button,
  Dialog,
  Text,
  ValueCard,
  Heading,
  InfoCircleIcon
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

export interface DisableKeyDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  publicKey: PublicKey | null
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export const DisableKeyDialog: React.FC<DisableKeyDialogProps> = ({
  isOpen,
  onOpenChange,
  publicKey,
  onConfirm,
  isLoading = false
}) => {
  const handleConfirm = (): void => {
    void Promise.resolve(onConfirm())
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
      <div className='flex flex-col gap-[18px]'>
        {/* Key Info */}
        <div className='flex gap-3'>
          <ValueCard
            colorScheme='lightGray'
            size='sm'
            className='flex items-center gap-3 p-3 rounded-xl'
            border={false}
          >
            <InfoCircleIcon size={18} className='text-blue-500' />
            <Text size='sm' monospace weight='medium'>
              {publicKey.data.slice(0, 5)}...{publicKey.data.slice(-5)}
            </Text>
          </ValueCard>

          <ValueCard
            colorScheme='lightGray'
            size='sm'
            className='flex items-center p-3 rounded-xl'
            border={false}
          >
            <Text size='sm' monospace weight='medium'>
              {publicKey.purpose}
            </Text>
          </ValueCard>
        </div>

        {/* Warning Card */}
        <div className='bg-white shadow-[0px_0px_25px_0px_rgba(0,0,0,0.05)] rounded-xl p-4 flex flex-col gap-3'>
          <Heading size='xl' className='!text-[1.5rem] !leading-[1.2em]'>
            Are you sure you want to disable this key?
          </Heading>

          <Text size='sm' weight='medium' dim>
            Proceed carefully. This action can not be undone.
          </Text>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleConfirm}
          variant='solid'
          colorScheme='red'
          size='md'
          className='w-full rounded-[15px]'
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Disable Key'}
        </Button>
      </div>
    </Dialog>
  )
}

