export const PurposeLabelsInfo = {
  AUTHENTICATION: {
    label: 'Authentication',
    description: 'Key used for authentication purposes'
  },
  ENCRYPTION: {
    label: 'Encryption', 
    description: 'Key used for encryption purposes'
  },
  DECRYPTION: {
    label: 'Decryption',
    description: 'Key used for decryption purposes'
  },
  MASTER: {
    label: 'Master',
    description: 'Master key with full privileges'
  }
}

export const SecurityLabelsInfo = {
  MASTER: {
    label: 'Master',
    description: 'Highest security level with full access',
    colorScheme: 'red'
  },
  CRITICAL: {
    label: 'Critical', 
    description: 'Critical security level for sensitive operations',
    colorScheme: 'orange'
  },
  HIGH: {
    label: 'High',
    description: 'High security level for important operations',
    colorScheme: 'yellow'
  },
  MEDIUM: {
    label: 'Medium',
    description: 'Medium security level for standard operations',
    colorScheme: 'blue'
  },
  LOW: {
    label: 'Low',
    description: 'Low security level for basic operations',
    colorScheme: 'gray'
  }
}

export type PurposeCode = keyof typeof PurposeLabelsInfo
export type SecurityCode = keyof typeof SecurityLabelsInfo

// Helper functions to get labels
export const getPurposeLabel = (purpose: string): string => {
  const purposeKey = purpose as PurposeCode
  return PurposeLabelsInfo[purposeKey]?.label || 'Master'
}

export const getSecurityLabel = (security: string): string => {
  const securityKey = security as SecurityCode
  return SecurityLabelsInfo[securityKey]?.label || 'Low'
}
