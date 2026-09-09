import React, { useCallback, useEffect, useState } from 'react'
import { Button, Text } from 'dash-ui-kit/react'
import { withAccessControl } from '../../components/auth/withAccessControl'
import { TransactionsList, type TransactionRowItem } from '../../components/transactions'
import { useExtensionAPI, useOpenTransactions } from '../../hooks'
import { ActionRow } from '../home/ActionRow'
import { LastTransaction } from '../home/LastTransaction'
import { CoreBalance } from './CoreBalance'
import { CoreStatistics } from './CoreStatistics'
import { CORE_MOCK } from './mock'

/**
 * Core layer home (Figma 10698:112). Mock balances / txs until Core APIs wire in.
 */
function CoreHomeState (): React.JSX.Element {
  const extensionAPI = useExtensionAPI()
  const openTransactions = useOpenTransactions('core')
  const [hideBalance, setHideBalance] = useState(false)

  useEffect(() => {
    extensionAPI.getSettings()
      .then(settings => { setHideBalance(settings.hideBalance) })
      .catch(e => console.log('getSettings error', e))
  }, [extensionAPI])

  const toggleHide = useCallback((): void => {
    const next = !hideBalance
    setHideBalance(next)
    extensionAPI.setSettings(next).catch(e => console.log('setSettings error', e))
  }, [extensionAPI, hideBalance])

  const refresh = useCallback((): void => {
    extensionAPI.getIdentities().catch(e => console.log('refresh identities error', e))
  }, [extensionAPI])

  return (
    <div className='flex flex-col gap-6'>
      <CoreBalance hide={hideBalance} onToggleHide={toggleHide} onRefresh={refresh} />
      <ActionRow scope='core' />
      <div className='flex flex-col gap-4'>
        <TransactionsList
          items={CORE_MOCK.operations.map((op): TransactionRowItem => ({ ...op }))}
          hideAmounts={hideBalance}
          groupByDate={false}
          limit={3}
          footer={(
            <Button
              type='button'
              colorScheme='lightBlue'
              className='!h-auto !min-h-0 !rounded-xl !py-2 !px-6'
              onClick={openTransactions}
            >
              <Text size='sm' weight='medium' className='!text-dash-brand'>
                See All Transactions
              </Text>
            </Button>
          )}
        />
        <CoreStatistics hide={hideBalance} />
        <LastTransaction
          hide={hideBalance}
          amount={CORE_MOCK.lastTxAmount}
          hash={CORE_MOCK.lastTxHash}
          layer={CORE_MOCK.lastTxLayer}
          kind={CORE_MOCK.lastTxKind}
        />
      </div>
    </div>
  )
}

export default withAccessControl(CoreHomeState, { requireWallet: false })
