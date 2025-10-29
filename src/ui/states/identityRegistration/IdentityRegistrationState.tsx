import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Text, Avatar, CopyButton, ChevronIcon, Input } from 'dash-ui-kit/react'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { useStaticAsset } from '../../hooks/useStaticAsset'
import { QRCodeSVG } from 'qrcode.react'

type Stage = 1 | 2 | 3 | 4 | 5

const mockIdentity = {
  id: 'EWNwtGEC1qAbgNgo2UgadmQhB9DaZtB942x8bXgJrPNS',
  name: 'test.dash'
}

const mockPaymentAddress = 'QMfCRPcjXoTnZa9sA9JR2KWgGGDFGDHJDGASFS'

const ProgressSteps: React.FC<{ currentStage: Stage }> = ({ currentStage }) => (
  <div className='flex gap-2 w-full'>
    {[1, 2, 3, 4, 5].map((step) => (
      <div
        key={step}
        className={`h-[5px] flex-1 rounded-full transition-colors ${
          step <= currentStage ? 'bg-blue-600' : 'bg-blue-600/15'
        }`}
      />
    ))}
  </div>
)

function IdentityRegistrationState (): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showKeys, setShowKeys] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [transactionHash, setTransactionHash] = useState('')
  const coinBagelImage = useStaticAsset('coin_bagel.png')
  const coinImage = useStaticAsset('coin.png')
  
  const stage = parseInt(searchParams.get('stage') ?? '1', 10) as Stage

  // Stage 3: Auto-advance after 5 seconds
  useEffect(() => {
    if (stage === 3) {
      const timer = setTimeout(() => {
        void navigate('/register-identity?stage=4')
      }, 50000)

      return () => clearTimeout(timer)
    }
  }, [stage, navigate])

  // Stage 4: Auto-advance after 5 seconds
  useEffect(() => {
    if (stage === 4) {
      const timer = setTimeout(() => {
        void navigate('/register-identity?stage=5')
      }, 100000)

      return () => clearTimeout(timer)
    }
  }, [stage, navigate])

  const handleNext = (): void => {
    void navigate('/register-identity?stage=2')
  }

  const handleProceedToPayment = (): void => {
    void navigate('/register-identity?stage=3')
  }

  const handleDone = (): void => {
    void navigate('/home')
  }

  // Stage 1: Introduction (image is in header)
  if (stage === 1) {
    return (
      <div className='flex flex-col h-full'>
        <div className='px-[15px] pt-[176px]'>
          <TitleBlock
            title='Identity Registration'
            description='Lets start the identity creation process. A small fee will be taken for the registration. To continue press next.'
            logoSize='3rem'
            showLogo
            containerClassName='mb-0'
          />
        </div>

        <div className='flex-1' />

        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={handleNext}
          >
            Next
          </Button>
          <ProgressSteps currentStage={stage} />
        </div>
      </div>
    )
  }

  // Stage 2: Fee information with coin image
  if (stage === 2) {
    return (
      <div className='flex flex-col h-full'>
        <TitleBlock
          title='Registration Fee'
          description='Identity registration on Dash Platform requires a small network fee. This one-time payment covers the cost of storing your identity on the blockchain.'
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='flex-1 flex items-center justify-center relative'>
          <div className='w-[200px] h-[200px]'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
          <div className='absolute top-[10px] right-[24px] w-[100px] h-[100px] rotate-34'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
          <div className='absolute bottom-[34px] left-[24px] w-[100px] h-[100px] -rotate-31'>
            <img src={coinImage} alt='Dash coin' className='w-full h-full object-contain' />
          </div>
        </div>

        <div className='flex flex-col gap-4'>
          <Button
            colorScheme='brand'
            className='w-full'
            onClick={handleProceedToPayment}
          >
            Continue To Payment
          </Button>
          <ProgressSteps currentStage={stage} />
        </div>
      </div>
    )
  }

  // Stage 3: Waiting for payment with QR code
  if (stage === 3) {
    return (
      <div className='flex flex-col h-full'>
        <TitleBlock
          title='Waiting for Payment'
          description="Your private keys are stored securely and never leave this device. Send a any desired amount to an address below and we'll do the process of Identity registration for you."
          logoSize='3rem'
          showLogo
          containerClassName='mb-0'
        />

        <div className='mt-6 px-[15px]'>
          <div className='bg-dash-primary-dark-blue/[0.04] rounded-3xl p-6 flex gap-6 items-center'>
            <div className='flex-shrink-0'>
              <QRCodeSVG value='https://dash.org/' fgColor='#4C7EFF' bgColor='transparent' size={100}/>
            </div>
            <div className='flex flex-col gap-1 flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <Text
                  size='sm'
                  weight='medium'
                  className='text-dash-primary-dark-blue leading-[1.366em] tracking-[-0.01em] break-all'
                >
                  {mockPaymentAddress}
                </Text>
                <div className='flex-shrink-0'>
                  <CopyButton text={mockPaymentAddress} />
                </div>
              </div>
              <Text className='text-xs' dim>
                You can send any amount convenient for you (over 0.1 Dash). We are ready to accept a transfer at any time!
              </Text>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-4 mt-6'>
          {!showManualEntry ? (
            <Button
              colorScheme='lightBlue'
              className='w-full'
              onClick={() => setShowManualEntry(true)}
            >
              Enter Manually
            </Button>
          ) : (
            <div className='flex flex-col gap-2'>
              <Text dim>
                Transaction Hash
              </Text>
              <Input
                placeholder='Enter transaction hash'
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
              />
              <Button
                colorScheme='lightBlue'
                className='w-full'
                onClick={() => void navigate('/register-identity?stage=4')}
              >
                Confirm
              </Button>
            </div>
          )}
          <ProgressSteps currentStage={stage} />
        </div>
      </div>
    )
  }

  // Stage 4: Payment received with animated coin
  if (stage === 4) {
    return (
      <div className='flex flex-col h-full relative'>
        <div className='absolute right-[-1rem] top-[100%] w-full h-[240px] overflow-hidden pointer-events-none translate-y-[-40%] translate-y-[-100%]'>
          <img src={coinBagelImage} alt='' className='w-[552px] h-[513px] object-cover object-left' />
        </div>
        <div
          className='absolute h-[130px]'
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 85%)',
            top: '100%',
            width: 'calc(100% + 1rem)',
            transform: 'translateY(calc(-100% + 0.875rem))'
          }}
        />

        <div className='relative z-10 flex flex-col h-full'>
          <TitleBlock
            title={<>We received your<br />payment</>}
            description='Please kindly wait for all Identity registration transactions to be processed by the network. Usually, it takes less than 10 seconds.'
            logoSize='3rem'
            showLogo
            containerClassName='mb-0'
          />

          <div className='flex-1' />

          <div>
            <ProgressSteps currentStage={stage} />
          </div>
        </div>
      </div>
    )
  }

  // Stage 5: Success with identity card
  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title='Congratulations!'
        description="Now you have your first Identity and you're ready to dive into the space of truly decentralized Web3 applications. Check out latest Dash Platform DApps on dashdapps.com"
        logoSize='3rem'
        showLogo
        containerClassName='mb-0'
      />

      <div className='mt-6 px-[15px]'>
        <div className='bg-dash-primary-dark-blue/[0.05] rounded-2xl p-[10px_15px_18px] flex flex-col gap-6'>
          <div className='flex items-center gap-3'>
            <div className='w-[58.5px] h-[58.5px] rounded-[75px] overflow-hidden flex-shrink-0'>
              <Avatar username={mockIdentity.id} />
            </div>
            <div className='flex flex-col gap-2 flex-1 min-w-0'>
              <Text size='md' weight='medium' className='text-dash-primary-dark-blue'>
                {mockIdentity.name}
              </Text>
              <Text className='text-xs leading-[1.366em] text-dash-primary-dark-blue break-all'>
                {mockIdentity.id}
              </Text>
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <button
              onClick={() => setShowKeys(!showKeys)}
              className='flex items-center justify-between w-full'
            >
              <Text size='sm' weight='medium' className='text-dash-primary-dark-blue'>
                4 Public Keys:
              </Text>
              <ChevronIcon
                className={`w-4 h-4 transition-transform ${showKeys ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className='flex-1' />

      <div className='px-[15px] pb-[15px] flex flex-col gap-4'>
        <Button
          colorScheme='brand'
          className='w-full'
          onClick={handleDone}
        >
          Done
        </Button>
        <ProgressSteps currentStage={stage} />
      </div>
    </div>
  )
}

export default IdentityRegistrationState

