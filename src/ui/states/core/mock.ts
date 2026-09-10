/** Core transaction rows, still generated: Core has no transaction API yet. */
export const CORE_MOCK = {
  operations: [
    {
      id: 'send-1',
      title: 'Send',
      detailLabel: 'To:',
      detailValue: 'EWNwtGEC1qAbgF5DfvNUbaZtBXgJrPNS',
      credits: '1.46',
      timestamp: '2026-09-09T11:24:00.000Z',
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
      timestamp: '2026-09-09T08:02:00.000Z',
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
      timestamp: '2026-09-08T19:41:00.000Z',
      fiatLabel: '~ $1,028.54',
      direction: 'in' as const,
      unit: 'Dash',
      detailAsIdentifier: true
    }
  ]
} as const
