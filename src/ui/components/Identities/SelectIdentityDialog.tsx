import React from 'react'
import { Dialog, Button, Identifier, Text, BigNumber } from 'dash-ui/react'

interface SelectIdentityDialogProps {
  identities: string[]
  currentIdentity: string | null
  onSelectIdentity: (identity: string) => void
  children: React.ReactNode
}

function SelectIdentityDialog ({ identities, currentIdentity, onSelectIdentity, children }: SelectIdentityDialogProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false)

  const handleSelectIdentity = (identity: string): void => {
    onSelectIdentity(identity)
    setOpen(false)
  }

  return (
    <div>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      
      <Dialog
        open={open}
        onOpenChange={setOpen}
        className='w-[390px] max-w-[390px] max-h-[500px] overflow-y-auto'
        title='Your identity'
        size='xl'
        showCloseButton={true}
      >
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            {identities.map((identity) => (
              <div
                key={identity}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                  identity === currentIdentity ? 'border-blue-500 border-l-2' : 'border-gray-200'
                }`}
                onClick={() => {
                  handleSelectIdentity(identity)
                }}
              >
                <Identifier avatar size='lg'>
                  {identity}
                </Identifier>
                
                <div className='flex flex-col flex-1 gap-1'>
                  <div className='flex items-center gap-2'>
                    <Identifier
                      middleEllipsis
                      edgeChars={6}
                      className='text-sm font-light'
                    >
                      {identity}
                    </Identifier>
                    <button className='text-gray-400 hover:text-gray-600'>
                      <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                        <path d='M2 2h6v6H2V2z' stroke='currentColor' strokeWidth='0.75'/>
                        <path d='M6 0H0v6h2V2h4V0z' fill='currentColor'/>
                      </svg>
                    </button>
                  </div>
                  <Text size='sm' className='text-gray-500'>
                    Main_account
                  </Text>
                </div>
                
                <div className='flex flex-col items-end gap-1'>
                  <Text weight='semibold' size='sm'>
                    <BigNumber>0</BigNumber> Credits
                  </Text>
                  <Text size='xs' className='text-gray-500'>
                    ~ $0.00
                  </Text>
                </div>
              </div>
            ))}
          </div>
          
          <Button variant='outline' className='w-full'>
            + Create an identity
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export default SelectIdentityDialog
