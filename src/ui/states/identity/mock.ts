export const IDENTITY_MOCK = {
  dashWhole: '16',
  dashFraction: '01',
  fiat: '~ $795.01 USD',
  tokenCount: 45,
  txCount: 132,
  txReceived: 15,
  txSent: 117,
  nameCount: 2,
  lastName: 'pshenmic.dash',
  lastTxAmount: '-1.826',
  lastTxHash: 'ba406f3b20a79d59f83af9504a57b0851a7b6fdbb17b91eee1380e6af0fc609e',
  lastTxLayer: 'Platform',
  lastTxKind: 'Normal',
  operations: [
    {
      id: 'send-1',
      title: 'Send',
      detailLabel: 'To:',
      detailValue: '12345...87sj',
      creditsLabel: '-101 236 520',
      fiatLabel: '~ $0.02',
      direction: 'out' as const,
      timestamp: '2026-09-09T12:00:00.000Z'
    },
    {
      id: 'batch-1',
      title: 'Documents Batch',
      detailLabel: 'Hash:',
      detailValue: '12345...87SJ1',
      creditsLabel: '40 371 460',
      fiatLabel: '~ $0.008',
      direction: 'neutral' as const,
      timestamp: '2026-09-09T12:00:00.000Z'
    },
    {
      id: 'receive-1',
      title: 'Receive',
      detailLabel: 'From:',
      detailValue: '12345...87sj',
      creditsLabel: '+ 204 278 360',
      fiatLabel: '~ $0.04',
      direction: 'in' as const,
      timestamp: '2026-09-09T12:00:00.000Z'
    }
  ],
  tokens: [
    {
      identifier: 'HqwTqGJzL9pK2nM4vR8sW1xYcU3bE7dF',
      name: 'Dash',
      credits: '101236520',
      changePct: '1.41',
      txCount: 145
    },
    {
      identifier: 'N4bE7dFHqwTqGJzL9pK2nM4vR8sW1xYcU',
      name: 'Dash',
      credits: '378627520040',
      changePct: '2.56',
      txCount: 21
    }
  ],
  names: [
    {
      name: 'pshenmic.dash',
      status: 'ok' as const,
      registrationTime: '2026-04-17T10:12:00.000Z'
    },
    {
      name: 'wallet.dash',
      status: 'pending' as const,
      registrationTime: '2026-09-01T08:00:00.000Z'
    }
  ]
} as const
