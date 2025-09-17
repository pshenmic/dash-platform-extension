import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { TitleBlock } from '../../components/layout/TitleBlock'
import { UsernameInput } from '../../components/forms'
import { Text, Identifier, Button, ValueCard, DashLogo } from 'dash-ui-kit/react'
import type { LayoutContext } from '../../components/layout/Layout'
import { useAsyncState, useSdk, usePlatformExplorerClient } from '../../hooks'
import { NetworkType } from '../../../types'
type Step = 1 | 2

const NameRegistrationState: React.FC = () => {
  const sdk = useSdk()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const { currentNetwork, currentIdentity } = useOutletContext<LayoutContext>()
  const [username, setUsername] = useState('')
  const [isContested, setIsContested] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [rateState, loadRate] = useAsyncState<number>()
  const platformClient = usePlatformExplorerClient()

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setIsValid(value.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(value))
  }

  const handleStep2Confirm = async () => {
    try {
      // TODO: Implement actual name registration logic
      console.log('Registering username:', username)
      
      // For now, just navigate back to home
      navigate('/home')
    } catch (error) {
      console.log('Failed to register username:', error)
      // TODO: Handle error properly
    }
  }

  // load rate
  useEffect(() => {
    loadRate(async () => {
      const result = await platformClient.fetchRate(currentNetwork as NetworkType)
      if (result.data !== null && result.data !== undefined) {
        return result.data
      }
      throw new Error(result.error ?? 'Failed to load rate')
    }).catch(e => console.log('loadRate error:', e))
  }, [currentNetwork, platformClient, loadRate])

  useEffect(() => {
    if (username) {
      try {
        const fullName = username.includes('.dash') ? username : `${username}.dash`
        const contested = sdk.names.testNameContested(fullName)
        setIsContested(contested)
      } catch (error) {
        console.log('Error checking contested name:', error)
        setIsContested(false)
      }
    } else {
      setIsContested(false)
    }
  }, [username, sdk])

  const NameBlock = useCallback(() => {
    switch (currentStep) {
      case 1: return (
        <UsernameInput
          value={username}
          onChange={handleUsernameChange}
          placeholder='username'
          autoFocus
        />
      )
      case 2: return (
        <div className='text-center'>
          <Text weight='bold' className='font-mono text-gray-900 !text-3xl'>
            {username}
          </Text>
          <Text size='sm' color='blue'>
            .dash
          </Text>
        </div>
      )
    }
  }, [currentStep, username, handleUsernameChange])

  const BottomBlock = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {isContested && (
              <>
                {username && !isValid && (
                  <div className='mb-8'>
                    <Text size='xs' color='error' className='text-center'>
                      Username must be at least 3 characters and contain only letters, numbers, hyphens, and underscores
                    </Text>
                  </div>
                )}
                <ValueCard
                  border={false}
                  className='mb-[0.675rem] !text-[0.75rem] dash-shadow-xl text-dash-primary-dark-blue/75'
                >
                  This username falls under the rules of a contested username. Masternodes will vote for your username
                  approval
                </ValueCard>
              </>
            )}
            <Button
              colorScheme='brand'
              size='md'
              onClick={() => setCurrentStep(2)}
              disabled={!isValid}
              className='w-full'
            >
              Request Username
            </Button>
          </>
        )
      case 2:
        return (
          <div className='flex flex-col gap-[0.675rem] w-full'>
            <ValueCard border={false} colorScheme='lightGray' className='flex justify-between items-center'>
              <Text size='md' weight='medium' color='muted' className='text-dash-primary-dark-blue/75'>
                Payment amount:
              </Text>
              <div className='flex flex-col items-end gap-1'>
                <div className='flex items-center gap-1 !text-dash-primary-dark-blue'>
                  0.25 <DashLogo size={10} className='!text-dash-primary-dark-blue' />
                </div>
                <div className='bg-brand/5 px-1 py-0.5 flex items-center rounded'>
                  <Text size='xs' className='!text-dash-brand' >
                    ~ ${(0.25 * (rateState.data ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </div>
              </div>
            </ValueCard>
            <div className='flex gap-[0.675rem]'>
              <Button
                variant='outline'
                colorScheme='brand'
                size='md'
                onClick={() => setCurrentStep(1)}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button
                colorScheme='brand'
                size='md'
                onClick={handleStep2Confirm}
                className='flex-1'
              >
                Confirm
              </Button>
            </div>
          </div>
        )
    }
  }, [currentStep, username])

  return (
    <div className='flex flex-col h-full'>
      <TitleBlock
        title={<>{currentStep === 1 ? 'Create' : 'Confirm'} your<br/>Dash Username</>}
        description={currentStep === 1
          ? 'You will not be able to change it in the future'
          : `You have chosen ${username} as your username. Please note that you can\'t change your name once it is registered.`}
        showLogo={false}
      />

      <div className='flex flex-col gap-6 flex-grow'>
        <div className='flex justify-center'>
          <NameBlock/>
        </div>

        <div className='text-center leading-none'>
          <Text size='xs' dim className='mb-1 inline-block'>
            This username will be created for identity
          </Text>

          <Identifier
            highlight='both'
            size='xs'
            className='text-center text-xs'
          >
            {currentIdentity}
          </Identifier>
        </div>
      </div>
      <div className='flex flex-col gap-[0.675rem] w-full'>
        <BottomBlock/>
      </div>
    </div>
  )
}

export default NameRegistrationState
