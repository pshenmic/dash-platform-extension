import type { TransactionRowItem } from '../../components/transactions/TransactionRow'
import { CORE_MOCK } from '../core/mock'

const CORE_MOCK_ROW_COUNT = 27
const HOURS_BETWEEN_ROWS = 7

/** Core rows for the full list. Core has no tx API yet, so these are generated. */
export function buildCoreMockRows (): TransactionRowItem[] {
  const templates = CORE_MOCK.operations
  const start = Date.parse(templates[0].timestamp)

  return Array.from({ length: CORE_MOCK_ROW_COUNT }, (unused, index) => {
    const template = templates[index % templates.length]
    const timestamp = new Date(start - index * HOURS_BETWEEN_ROWS * 3600_000).toISOString()

    return {
      ...template,
      id: `core-mock-${index}`,
      hash: null,
      timestamp
    }
  })
}
