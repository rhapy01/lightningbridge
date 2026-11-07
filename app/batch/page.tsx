'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { init, NimiqProviderError } from '@nimiq/mini-app-sdk'
import { ArrowRight } from 'lucide-react'
import { useWalletSession } from '../../components/wallet-session'
import { savePaymentHistoryEntry } from '../../lib/payment-history'
import { BrandLogo } from '../../components/brand-logo'

type ItemState = 'ready' | 'invalid' | 'paying' | 'submitted' | 'cancelled' | 'failed' | 'unknown'
type BatchItem = { invoice: string; amountSats?: number; expiresAt?: number; state: ItemState; note?: string; reference?: string }

export default function BatchPage() {
  const { walletAddress, inNimiqPay, network, connectWallet } = useWalletSession()
  const [input, setInput] = useState('')
  const [items, setItems] = useState<BatchItem[]>([])
  const [checking, setChecking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const provider = useRef<ReturnType<typeof init> | null>(null)
  const total = useMemo(() => items.reduce((sum, item) => item.state === 'ready' || item.state === 'submitted' ? sum + (item.amountSats || 0) : sum, 0), [items])
  const readyCount = items.filter((item) => item.state === 'ready').length
  const canStart = walletAddress && network === 'mainnet' && !running && readyCount > 0

  useEffect(() => { if (inNimiqPay) provider.current = init({ timeout: 10_000 }) }, [inNimiqPay])

  async function connect() {
    setConnecting(true)
    setError('')
    try { await connectWallet(); provider.current = init({ timeout: 10_000 }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect your Nimiq Pay wallet.') }
    finally { setConnecting(false) }
  }

  async function checkInvoices() {
    const invoices = input.split(/[\r\n,;]+/).map((value) => value.trim()).filter(Boolean)
    const unique = [...new Set(invoices)]
    if (!unique.length) { setError('Paste one fixed amount Lightning invoice per line.'); return }
    if (unique.length > 20) { setError('Batch is limited to 20 invoices at a time.'); return }
    setChecking(true)
    setError('')
    setItems(unique.map((invoice) => ({ invoice, state: 'invalid' as const, note: 'Checking invoice…' })))
    const checked = await Promise.all(unique.map(async (invoice): Promise<BatchItem> => {
      try {
        const response = await fetch('/api/payment/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoice }) })
        const result = await response.json()
        if (!response.ok || !result.valid) return { invoice, state: 'invalid', note: result.message || 'Invoice could not be validated.' }
        return { invoice, state: 'ready', amountSats: result.amountSats, expiresAt: result.expiresAt }
      } catch { return { invoice, state: 'invalid', note: 'Could not check this invoice.' } }
    }))
    setItems(checked)
    setChecking(false)
  }

  async function runBatch() {
    if (!canStart || !provider.current || !walletAddress) return
    setRunning(true)
    setError('')
    let nimiq
    try { nimiq = await provider.current }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach the Nimiq Pay wallet.')
      setRunning(false)
      return
    }
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      if (item.state !== 'ready') continue
      setItems((current) => current.map((entry, i) => i === index ? { ...entry, state: 'paying', note: 'Review and approve this payment in Nimiq Pay.' } : entry))
      try {
        const result = await nimiq.payLightningInvoice({ invoice: item.invoice })
        const reference = result.swapId || result.hash
        const id = reference || crypto.randomUUID()
        savePaymentHistoryEntry({ id, wallet: walletAddress, recipient: 'Batch Lightning invoice', amountSats: item.amountSats || 0, status: 'submitted', createdAt: Date.now(), reference, paymentType: 'bolt11' })
        setItems((current) => current.map((entry, i) => i === index ? { ...entry, state: 'submitted', note: 'Submitted to Nimiq Pay.', reference } : entry))
      } catch (cause) {
        const duplicate = NimiqProviderError.is(cause) && cause.type === 'DUPLICATE_PAYMENT'
        const uncertain = NimiqProviderError.is(cause) && cause.type === 'TRANSACTION_OUTCOME_UNKNOWN'
        const cancelled = NimiqProviderError.is(cause) && cause.type === 'PERMISSION_DENIED'
        const state: ItemState = duplicate || uncertain ? 'unknown' : cancelled ? 'cancelled' : 'failed'
        const note = duplicate ? 'Nimiq Pay says this invoice was already submitted. Check its status before retrying.' : uncertain ? 'Payment result is uncertain. Check Activity before retrying.' : cancelled ? 'Approval was cancelled. The batch is paused.' : cause instanceof Error ? cause.message : 'Payment failed. The batch is paused.'
        if (duplicate || uncertain) {
          const ref = NimiqProviderError.is(cause) && cause.data && typeof cause.data === 'object' ? cause.data as { hash?: string; swapId?: string } : {}
          const reference = ref.swapId || ref.hash
          savePaymentHistoryEntry({ id: reference || crypto.randomUUID(), wallet: walletAddress, recipient: 'Batch Lightning invoice', amountSats: item.amountSats || 0, status: 'unknown', createdAt: Date.now(), reference, paymentType: 'bolt11' })
        }
        setItems((current) => current.map((entry, i) => i === index ? { ...entry, state, note } : entry))
        setError('Batch paused. Review this invoice before continuing. Remaining invoices have not been submitted.')
        setRunning(false)
        return
      }
    }
    setRunning(false)
  }

  function retryCancelled(index: number) {
    setItems((current) => current.map((entry, i) => i === index ? { ...entry, state: 'ready', note: undefined } : entry))
  }

  return <main className="workspace-shell">
    <header className="site-header workspace-header">
      <Link className="brand-image" href="/" aria-label="LightningBridge home"><BrandLogo /></Link>
      <nav className="workspace-nav" aria-label="Mini App"><Link href="/pay">Pay</Link><Link className="nav-active" href="/batch">Batch</Link><Link href="/activity">Activity</Link><Link href="/account">Account</Link></nav>
      <div className="app-wallet-chip"><span className={`status-dot ${walletAddress ? '' : 'host-unavailable'}`} />{walletAddress ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-5)}` : inNimiqPay ? 'Wallet not connected' : 'Open in Nimiq Pay'}</div>
    </header>

    <section className="batch-content">
      <div className="batch-heading"><div className="eyebrow"><span /> MULTIPLE PAYMENTS</div><h1>Pay several Lightning invoices</h1><p>Paste fixed amount BOLT11 invoices. LightningBridge checks them together, then sends them one at a time through Nimiq Pay.</p></div>
      <div className="batch-layout">
        <section className="batch-compose">
          <div className="batch-step-label">INVOICES <span>Up to 20</span></div>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={'Paste one lnbc… invoice per line\n\nlnbc…\nlnbc…\nlnbc…'} rows={8} disabled={running} />
          <p className="batch-hint">Use fixed amount Bitcoin mainnet invoices. Duplicate invoices are removed before checking.</p>
          {error && <p className="inline-error" role="alert">{error}</p>}
          {!walletAddress && inNimiqPay && <button className="continue-button" onClick={connect} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect wallet'}</button>}
          {!inNimiqPay && <p className="inline-error">Open LightningBridge inside Nimiq Pay to connect a wallet and approve payments.</p>}
          {network === 'testnet' && <p className="inline-error">Lightning batch payments are available on mainnet.</p>}
          <button className="continue-button" onClick={checkInvoices} disabled={checking || running || !input.trim()}>{checking ? 'Checking invoices…' : 'Check invoices'}</button>
        </section>

        <section className="batch-review">
          <div className="batch-review-head"><div><span className="muted-overline">BATCH REVIEW</span><h2>{items.length ? `${items.length} invoices` : 'Your payments'}</h2></div><span className="batch-network">{network === 'mainnet' ? 'MAINNET' : 'LIGHTNING'}</span></div>
          {!items.length ? <div className="batch-empty"><strong>Paste invoices to begin</strong><span>We’ll check each amount and expiry before you send anything.</span></div> : <div className="batch-items">{items.map((item, index) => <article className="batch-item" key={`${item.invoice}-${index}`}><span className="batch-index">{String(index + 1).padStart(2, '0')}</span><div className="batch-item-detail"><strong>{item.amountSats !== undefined ? `${item.amountSats.toLocaleString(undefined, { maximumFractionDigits: 3 })} sats` : 'Invoice'}</strong><small>{item.invoice.slice(0, 20)}…{item.invoice.slice(-8)}</small>{item.note && <small className={`batch-note state-${item.state}`}>{item.note}</small>}</div><span className={`batch-state state-${item.state}`}>{item.state === 'ready' ? 'Ready' : item.state === 'paying' ? 'Approve' : item.state === 'submitted' ? 'Sent' : item.state === 'cancelled' ? 'Cancelled' : item.state === 'unknown' ? 'Check' : item.state === 'failed' ? 'Failed' : 'Invalid'}</span>{item.state === 'cancelled' && <button className="batch-retry" onClick={() => retryCancelled(index)}>Retry</button>}</article>)}</div>}
          <div className="batch-total"><span>Total to send</span><strong>{total.toLocaleString(undefined, { maximumFractionDigits: 3 })} sats</strong></div>
          <button className="continue-button batch-send" onClick={runBatch} disabled={!canStart}>{running ? 'Waiting for Nimiq Pay…' : `Start batch · ${readyCount} ${readyCount === 1 ? 'payment' : 'payments'}`}</button>
          <p className="batch-disclaimer">Each invoice gets its own Nimiq Pay approval and swap. If a payment is cancelled or uncertain, the batch pauses; later invoices stay untouched.</p>
          {items.some((item) => item.state === 'unknown') && <Link className="batch-activity-link" href="/activity">Review payment activity <ArrowRight size={14} /></Link>}
        </section>
      </div>
    </section>
    <footer className="workspace-footer"><Link href="/pay">Single payment</Link><span>Each Lightning invoice is paid separately</span><Link href="/activity">Activity</Link></footer>
  </main>
}
