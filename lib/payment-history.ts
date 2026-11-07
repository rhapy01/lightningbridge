export type PaymentHistoryEntry = {
  id: string
  wallet: string
  recipient: string
  amountSats: number
  status: 'submitted' | 'settled' | 'unknown'
  createdAt: number
  reference?: string
  paymentType: 'lightning-address' | 'bolt11'
}

function storageKey(wallet: string) {
  return `lightningbridge:history:${wallet.toLowerCase()}`
}

export function readPaymentHistory(wallet: string): PaymentHistoryEntry[] {
  if (typeof window === 'undefined' || !wallet) return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(storageKey(wallet)) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((entry): entry is PaymentHistoryEntry => entry && typeof entry.id === 'string' && typeof entry.createdAt === 'number')
  } catch {
    return []
  }
}

export function savePaymentHistoryEntry(entry: PaymentHistoryEntry) {
  const entries = readPaymentHistory(entry.wallet).filter((existing) => existing.id !== entry.id)
  window.localStorage.setItem(storageKey(entry.wallet), JSON.stringify([entry, ...entries].slice(0, 50)))
}

export function updatePaymentHistoryEntry(wallet: string, id: string, status: PaymentHistoryEntry['status']) {
  const entries = readPaymentHistory(wallet).map((entry) => entry.id === id ? { ...entry, status } : entry)
  window.localStorage.setItem(storageKey(wallet), JSON.stringify(entries))
}
