export const CORE_MOCK = {
  dashWhole: '320',
  dashFraction: '00',
  fiat: '~ $6221.00 USD',
  credits: '32000000000',
  txCount: 132,
  txReceived: 15,
  txSent: 117,
  dataContractCount: 45,
  documentsCreated: 12,
  totalSent: '1.826',
  totalReceived: '1.826',
  lastTxAmount: '-1.826',
  lastTxHash: 'ba406f3b20a79d59f83af9504a57b0851a7b6fdbb17b91eee1380e6af0fc609e',
  lastTxLayer: 'Core',
  lastTxKind: 'Normal',
  operations: [
    {
      id: 'send-1',
      title: 'Send',
      detailLabel: 'To:',
      detailValue: 'EWNwtGEC1qAbgF5DfvNUbaZtBXgJrPNS',
      credits: '1.46',
      fiatLabel: '~ $46.31',
      direction: 'out' as const,
      unit: 'Dash',
      detailAsIdentifier: true
    },
    {
      id: 'send-2',
      title: 'Send',
      detailLabel: 'To:',
      detailValue: '1234567890abcdef87SJ1',
      credits: '1',
      fiatLabel: '~ $31.68',
      direction: 'out' as const,
      unit: 'Dash',
      detailAsIdentifier: true
    },
    {
      id: 'receive-1',
      title: 'Receive',
      detailLabel: 'From:',
      detailValue: '1234567890abcdef87sj',
      credits: '34',
      fiatLabel: '~ $1,028.54',
      direction: 'in' as const,
      unit: 'Dash',
      detailAsIdentifier: true
    }
  ]
} as const
