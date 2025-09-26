export interface NameStatusStyle {
  iconBg: string
  iconColor: string
  statusBg: string
  statusText: string
  statusLabel: string
}

export const nameStatusStyles: Record<'ok' | 'locked' | 'pending', NameStatusStyle> = {
  ok: {
    iconBg: 'bg-[rgba(76,126,255,0.05)]',
    iconColor: 'stroke-[#4C7EFF]',
    statusBg: 'bg-[rgba(76,126,255,0.15)]',
    statusText: '!text-[#4C7EFF]',
    statusLabel: 'Finished'
  },
  locked: {
    iconBg: 'bg-[rgba(233,54,54,0.05)]',
    iconColor: 'stroke-[#E93636]',
    statusBg: 'bg-[rgba(233,54,54,0.15)]',
    statusText: '!text-[#E93636]',
    statusLabel: 'Locked'
  },
  pending: {
    iconBg: 'bg-[rgba(255,193,7,0.05)]',
    iconColor: 'stroke-[#FFC107]',
    statusBg: 'bg-[rgba(255,193,7,0.15)]',
    statusText: '!text-[#FFC107]',
    statusLabel: 'Pending'
  }
}
