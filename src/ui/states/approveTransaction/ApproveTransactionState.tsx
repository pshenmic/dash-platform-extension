import React, {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {base64 as base64Decoder} from '@scure/base'
import {useSdk} from '../../hooks/useSdk'
import hash from 'hash.js'
import TransactionDetails from './TransactionDetails'
import ValueCard from '../../components/containers/ValueCard'
import Identifier from '../../components/data/Identifier'
import Text from '../../text/Text'
import Button from '../../components/controls/buttons'
import {useMessagingAPI} from "../../hooks/useMessagingAPI";
import {Identity} from "../../../types/Identity";

export default function () {
    const navigate = useNavigate()
    const sdk = useSdk()
    const messagingAPI = useMessagingAPI()

    const params = useParams()

    const [transactionDecodeError, setTransactionDecodeError] = useState(null)
    const [txHash, setTxHash] = useState(null)

    const [identities, setIdentities] = useState<Identity[]>([])
    const [currentIdentity, setCurrentIdentity] = useState<Identity>(null)

    const [stateTransition, setStateTransition] = useState(null)

    if (!identities?.length) {
        return <div>No identities</div>
    }

    useEffect(() => {
        messagingAPI
            .getStateTransition(params.hash)
            .then(stateTransitionResponse => {
                try {
                    const {StateTransitionWASM} = sdk.wasm

                    setStateTransition(StateTransitionWASM.fromBytes(base64Decoder.decode(stateTransitionResponse.stateTransition.unsigned)))
                } catch (e) {
                    setTransactionDecodeError(e.toString())
                }

            })
            .catch(console.error)
    }, [])

    const reject = () => {
        window.postMessage({target: 'window', method: 'rejectSigning'})
        window.close()
    }

    const doSign = () => {
        messagingAPI.requestStateTransitionApproval(stateTransition)
            .then(response=> {})
            .catch(console.error)


        sdk.stateTransitions.broadcast(stateTransition)
            .then(() => {
                const state_transition_hash = hash.sha256().update(stateTransition.toBytes()).digest('hex')

                setTxHash(state_transition_hash)
            }).catch((error) => {
            console.error('failz', error)
        })
    }

    if (txHash) {
        return (
            <div className={'screen-content'}>
                <h1 className={'h1-title'}>Transaction was successfully broadcasted</h1>

                <ValueCard colorScheme={'lightBlue'} className={'flex flex-col items-start gap-1'}>
                    <Text size={'md'} dim>Transaction hash</Text>

                    <ValueCard colorScheme={'white'} className={'flex justify-between w-full'}>
                        <Identifier
                            highlight={'both'}
                            copyButton={true}
                            ellipsis={false}
                            className={'w-full justify-between'}
                        >
                            {txHash}
                        </Identifier>
                    </ValueCard>
                </ValueCard>

                <div className={'flex gap-5 mt-5 w-full'}>
                    <Button className={'w-full'} onClick={() => window.close()}>Close</Button>
                </div>
            </div>
        )
    }

    return (
        <div className={'screen-content'}>
            <h1 className={'h1-title'}>Transaction approval</h1>

            <ValueCard colorScheme={'lightBlue'} className={'flex flex-col items-start gap-1'}>
                <Text size={'md'} dim>Transaction hash</Text>

                <ValueCard colorScheme={'white'} className={'flex justify-between w-full'}>
                    <Identifier
                        highlight={'both'}
                        copyButton={true}
                        ellipsis={false}
                        className={'w-full justify-between'}
                    >
                        {params.txhash}
                    </Identifier>
                </ValueCard>

                <div className={'mt-2'}>
                    {!stateTransition
                        ? <Text color={'red'} weight={'bold'}>Could not find transaction with hash</Text>
                        : transactionDecodeError
                            ? <Text color={'red'} weight={'bold'}>Error decoding state transition, please report the
                                issue</Text>
                            : <TransactionDetails stateTransition={stateTransition}/>
                    }
                </div>
            </ValueCard>

            {!stateTransition
                ? <Button onClick={() => navigate('/')} className={'mt-2'}>Close</Button>
                : <div>
                    <Text>Sign with identity:</Text>
                    <select>
                        <option>{currentIdentity.identifier}</option>
                    </select>

                    <div className={'flex gap-5 mt-5'}>
                        <Button onClick={reject} colorScheme={'red'} variant={'outline'}
                                className={'w-1/2'}>Reject</Button>
                        <Button onClick={doSign} colorScheme={'mint'} className={'w-1/2'}>Sign</Button>
                    </div>
                </div>
            }
        </div>
    )
}
