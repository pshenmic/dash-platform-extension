export const PLATFORM_MOCK = {
  dashWhole: '320',
  dashFraction: '00',
  fiat: '~ $6221.00 USD',
  shieldedWhole: '2',
  shieldedFraction: '06',
  shieldedFiat: '~ $48.01 USD',
  addressesWhole: '0',
  addressesFraction: '71',
  addressesFiat: '~ $12.01 USD',
  identitiesWhole: '16',
  identitiesFraction: '01',
  identitiesFiat: '~ $795.01 USD',
  identityCountFallback: 36,
  tokenCount: 45,
  txCount: 132,
  txReceived: 15,
  txSent: 117,
  nameCount: 2,
  lastName: 'pshenmic.dash',
  lastTxAmount: '-1.826',
  lastTxHash: 'ba406f3b20a79d59f83af9504a57b0851a7b6fdbb17b91eee1380e6af0fc609e',
  lastTxLayer: 'Platform',
  lastTxType: 'Normal',
  identities: [
    {
      identifier: 'EWNwtGEC1qAbgF5DfvNUbaZtBXgJrPNS',
      name: 'wallet.dash',
      credits: '101236520',
      changePct: '1.41',
      txCount: 145
    },
    {
      identifier: 'EWNwtGEC1qAbgF5DfvNUbaZtBXgJrPNS',
      name: null,
      credits: '378627520040',
      changePct: '2.56',
      txCount: 21
    },
    {
      identifier: 'EWNwtGEC1qAbgF5DfvNUbaZtBXgJrPNS',
      name: null,
      credits: '378627520040',
      changePct: '2.56',
      txCount: 21
    }
  ],
  operations: [
    {
      id: 'send-1',
      title: 'Send',
      detailLabel: 'To:',
      detailValue: '12345...87sj',
      credits: '101236520',
      fiatLabel: '~ $0.02',
      direction: 'out'
    },
    {
      id: 'batch-1',
      title: 'Documents Batch',
      detailLabel: 'Hash:',
      detailValue: '12345...87SJ1',
      credits: '40371460',
      fiatLabel: '~ $0.008',
      direction: 'neutral'
    },
    {
      id: 'receive-1',
      title: 'Receive',
      detailLabel: 'From:',
      detailValue: '12345...87sj',
      credits: '204278360',
      fiatLabel: '~ $0.04',
      direction: 'in'
    }
  ]
} as const
