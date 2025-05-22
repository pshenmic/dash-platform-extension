import React, {useEffect, useState} from 'react'
import { useSdk } from '../../../hooks/useSdk'
import { useNavigate } from 'react-router-dom'
import { useIdentitiesStore } from '../../../stores/identitiesStore'
import { Button } from '../../components/controls/buttons'
import Textarea from '../../components/form/Textarea'
import { ValueCard } from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Indetifier'
import BigNumber from '../../components/data/BigNumber'
import { NotActive } from '../../components/data/NotActive'
import Text from '../../text/Text'

const checkHex = (string) => /\b[0-9A-F]{64}/gi.test(string)

export default function () {
  const navigate = useNavigate()
  const sdk = useSdk()
  const { uint8ArrayToBase58 } = sdk.utils
  const [privateKey, setPrivateKey] = useState(null)
  const [privateKeyWASM, setPrivateKeyWASM] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState(null)
  const setIdentities = useIdentitiesStore((state) => state.setIdentities)
  const setCurrentIdentity = useIdentitiesStore((state) => state.setCurrentIdentity)
  const setIdentityBalance = useIdentitiesStore((state) => state.setIdentityBalance)

  const checkPrivateKey = async () => {
    setError(null)

    let pkeyWASM = null

    if (privateKey.length === 52) {
      // wif
      try {
        pkeyWASM = sdk.wasm.PrivateKeyWASM.fromWIF((privateKey))
        setPrivateKeyWASM(pkeyWASM)
      } catch (e) {
        console.error(e)
        return setError('Could not decode private key from WIF')
      }
    } else if (privateKey.length === 64) {
      //hex
      try {
        pkeyWASM = sdk.wasm.PrivateKeyWASM.fromHex(privateKey, 'testnet')
        setPrivateKeyWASM(pkeyWASM)
      } catch (e) {
        console.error(e)
        return setError('Could not decode private key from hex')
      }
    } else {
      return setError('Unrecognized private key format')
    }

    try {
      const identity = await sdk.identities.getByPublicKeyHash(pkeyWASM.getPublicKeyHash())
      const balance = await sdk.identities.getBalance(uint8ArrayToBase58(identity.getId()))

      setIdentity(identity)
      setBalance(balance)
    } catch (e) {
      console.error(e)
      if (typeof e === 'string') {
        return setError(e)
      }

      if (e.code === 5) {
        return setError('Identity related to this private key was not found')
      }

      setError(e.toString())
    }
  }

  useEffect(() => {
    if (error) {
      setError(null)
    }
  }, [privateKey])

  const importIdentity = async () => {
    const identities = [{
      identifier: uint8ArrayToBase58(identity.getId()),
      raw: sdk.utils.bytesToHex(identity.toBytes()),
      privateKeys: [privateKeyWASM.getHex()]
    }]

    setIdentities(identities)
    setCurrentIdentity(identities[0].identifier)
    setIdentityBalance(identities[0].identifier, balance.toString())

    navigate('/')
  }

  return (<div className={'flex flex-col gap-2'}>
      <span className={'h1-title'}>Import your identity</span>

      {!identity &&
        <div className={'flex flex-col gap-[0.875rem]'}>
          <div className={'flex flex-col gap-2'}>
            <Text color={'blue'} size={'lg'}>
              Paste your identity <Text size={'lg'}>Private Key</Text> in <Text size={'lg'}>HEX format</Text>
            </Text>
            <Text color={'blue'} size={'lg'}>
              You can export it from the Dash Evonode Tool application
            </Text>
          </div>

          <Textarea
            rows={3}
            placeholder={'your private key...'}
            onChange={setPrivateKey}
          />

          {!!error &&
            <div className={'py-1'}>
              <span>{error}</span>
            </div>
          }

          <div>
            <Button
              colorScheme={'brand'}
              disabled={!privateKey}
              className={'w-full'}
              onClick={checkPrivateKey}
            >
              Check
            </Button>
          </div>
        </div>
      }

      {identity &&
        <div className={'flex flex-col gap-[0.875rem]'}>
          <Text size={'lg'} color={'blue'}>
            We found an identity associated with the given private key
          </Text>

          <ValueCard colorScheme={'lightBlue'}>
            <div className={'flex flex-col gap-[0.875rem]'}>
              <div className={'flex flex-col gap-[0.125rem]'}>
                <Text size={'md'} dim>Identifier</Text>
                <ValueCard colorScheme={'white'}>
                  <Identifier
                    highlight={'both'}
                    copyButton={true}
                    ellipsis={false}
                    linesAdjustment={false}
                  >
                    {identity?.getId() instanceof Uint8Array ? uint8ArrayToBase58(identity.getId()) : ''}
                  </Identifier>
                </ValueCard>
              </div>
              <div className={'flex flex-col gap-[0.125rem]'}>
                <Text dim>Balance</Text>

                <span>
                  {!Number.isNaN(Number(balance))
                    ? <Text size={'xl'} weight={'bold'} monospace>
                        <BigNumber>
                          {balance}
                        </BigNumber>
                      </Text>
                    : <NotActive>N/A</NotActive>
                  }
                  <Text
                    size={'lg'}
                    className={'ml-2'}
                  >
                    Credits
                  </Text>
                </span>
              </div>
            </div>
          </ValueCard>
          <Button
            colorScheme={'brand'}
            disabled={!privateKey}
            className={'w-full'}
            onClick={importIdentity}
          >
            Import
          </Button>
        </div>
      }
    </div>
  )
}
