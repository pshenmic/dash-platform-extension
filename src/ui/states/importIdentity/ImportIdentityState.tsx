import React, { useState } from 'react'
import { useSdk } from '../../../hooks/useSdk'
import { useNavigate } from 'react-router-dom'
import { useIdentitiesStore } from '../../../stores/identitiesStore'
import './import.identity.state.css'

const checkHex = (string) => /\b[0-9A-F]{64}/gi.test(string)

export default function () {
  const navigate = useNavigate()
  const sdk = useSdk()

  const { uint8ArrayToBase58 } = sdk.utils

  const [privateKey, setPrivateKey] = useState(null)
  const [privateKeyWASM, setPrivateKeyWASM] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')
  const setIdentities = useIdentitiesStore((state) => state.setIdentities)
  const setCurrentIdentity = useIdentitiesStore((state) => state.setCurrentIdentity)
  const setIdentityBalance = useIdentitiesStore((state) => state.setIdentityBalance)

  const handlePrivateKeyChange = (e) => {
    setPrivateKey(e.target.value)
  }

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

  return (<div>
      <span className={'h1-title'}>Import your identity</span>

      {!identity && <div>
        <div className={'ImportIdentityState__Description'}>
          <div className={'ImportIdentityState__Description__Item'}>Paste your identity Private Key in HEX format</div>
          <div className={'ImportIdentityState__Description__Item'}>You can export it from the Dash Evonode Tool
            application
          </div>
        </div>
        <div className={'ImportIdentityState__PrivateKey'}>
          <span className={'ImportIdentityState__PrivateKey__Title'}>Private Key:</span>
          <textarea className={'ImportIdentityState__PrivateKey__Input'} value={privateKey}
                    onChange={handlePrivateKeyChange}></textarea>
        </div>

        {!!error && <div className={'ImportIdentityState__Check_Message'}>
          <span>{error}</span>
        </div>}

        <div>
          <button className={'ImportIdentityState__Check_Button'} disabled={!privateKey}
                  onClick={checkPrivateKey}>Check
          </button>
        </div>
      </div>}

      {identity && <div className={'ImportIdentityState__Identity'}>
        <span className={'ImportIdentityState__Identity_Description'}>We found an identity associated with the given private key</span>
        <div className={'ImportIdentityState__Identity__Identity'}>
          <span className={'ImportIdentityState__Identity__Identity__Item'}>Identifier:</span>
          <span
            className={'ImportIdentityState__Identity__Identity__Item'}>{uint8ArrayToBase58(identity.getId())}</span>
        </div>
        <div className={'ImportIdentityState__Identity__Balance'}>
          <span className={'ImportIdentityState__Identity__Identity__Item'}>Balance:</span>
          <span className={'ImportIdentityState__Identity__Identity__Item'}>{balance} credits</span>
        </div>
        <div className={'ImportIdentityState__Identity__Import'}>
          <button className={'ImportIdentityState__Identity__Import__Button'} onClick={() => importIdentity()}>
            Import
          </button>
        </div>
      </div>}
    </div>
  )
}
