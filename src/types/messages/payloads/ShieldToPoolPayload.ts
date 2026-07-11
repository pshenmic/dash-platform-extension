export interface ShieldToPoolPayload {
  // amount in credits to move into the shielded pool, as a string (bigint does
  // not serialize across messaging)
  amountCredits: string
  password: string
  // optional source transparent platform address; when omitted, the largest
  // funded address covering amount + fee is chosen automatically
  fromAddress?: string
  // optional UTF-8 memo carried inside the shielded output
  memo?: string
}
