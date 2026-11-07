'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { NimiqProviderError, init } from '@nimiq/mini-app-sdk'
import { savePaymentHistoryEntry, updatePaymentHistoryEntry } from '../../lib/payment-history'
import { useWalletSession } from '../../components/wallet-session'
import { BrandLogo } from '../../components/brand-logo'

type PaymentStatus = 'idle' | 'review' | 'approving' | 'submitted' | 'settled' | 'settlement_failed' | 'failed' | 'unknown'

function parseInvoice(value: string) {
  const normalized = value.trim().toLowerCase()
  if (/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) return { valid: true, isAddress: true, amount: 'Choose amount', description: 'Lightning Address', expiry: 'Fresh invoice created at checkout' }
  const looksLikeLightningRequest = normalized.startsWith('lnbc')
  return looksLikeLightningRequest
    ? { valid: true, isAddress: false, amount: 'Checked before payment', description: 'Lightning payment request', expiry: 'Verified before approval' }
    : { valid: false, isAddress: false, amount: '', description: '', expiry: '', message: 'Enter a Lightning Address or paste a fixed-amount BOLT11 invoice.' }
}

function formatExpiry(expiresAt: number) {
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  const expiryDate = new Date(expiresAt)
  const dayLabel = expiryDate.toDateString() === new Date().toDateString()
    ? 'today'
    : expiryDate.toDateString() === new Date(Date.now() + 86_400_000).toDateString()
      ? 'tomorrow'
      : expiryDate.toLocaleDateString()
  return `Expires in ${hours}h ${minutes}m ${seconds}s · ${dayLabel} at ${expiryDate.toLocaleTimeString()}`
}

export default function Page() {
  const [invoice, setInvoice] = useState('')
  const [amountSats, setAmountSats] = useState('')
  const [resolvedInvoice, setResolvedInvoice] = useState('')
  const [blinkTracked, setBlinkTracked] = useState(false)
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState('')
  const [reference, setReference] = useState<{ hash?: string; swapId?: string }>({})
  const [validatedInvoice, setValidatedInvoice] = useState<{ amountSats?: number; expiresAt?: number; description?: string }>({})
  const { walletAddress, network: hostNetwork, inNimiqPay, connectWallet: connectSessionWallet } = useWalletSession()
  const [providerReady, setProviderReady] = useState(false)
  const [providerError, setProviderError] = useState('')
  const walletConnected = Boolean(walletAddress)
  const [historyEntryId, setHistoryEntryId] = useState('')
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const providerRef = useRef<ReturnType<typeof init> | null>(null)
  const [checking, setChecking] = useState(false)
  const [settlementCheckAttempt, setSettlementCheckAttempt] = useState(0)
  const [settlementCheckTimedOut, setSettlementCheckTimedOut] = useState(false)
  const parsed = useMemo(() => parseInvoice(invoice), [invoice])
  const showReview = status !== 'idle'
  const canPay = hostNetwork === 'mainnet' && walletConnected

  function connectProvider() {
    setProviderReady(false)
    setProviderError('')
    providerRef.current = init({ timeout: 10_000 })
    providerRef.current
      .then(() => setProviderReady(true))
      .catch((cause) => setProviderError(cause instanceof Error ? cause.message : 'Nimiq Pay provider did not become ready.'))
  }

  async function connectWallet() {
    if (!providerRef.current) return
    setConnectingWallet(true)
    setConnectionError('')
    try {
      await connectSessionWallet()
    } catch (cause) {
      setConnectionError(NimiqProviderError.is(cause) && cause.type === 'PERMISSION_DENIED'
        ? 'Wallet access was cancelled. You can connect whenever you are ready.'
        : cause instanceof Error ? cause.message : 'Could not connect to the Nimiq Pay wallet.')
    } finally {
      setConnectingWallet(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setInvoice(params.get('invoice') ?? '')
    setBlinkTracked(params.get('source') === 'blink')
    const isHosted = Reflect.get(window, 'nimiqPay') !== undefined
    if (isHosted) connectProvider()
  }, [])

  useEffect(() => {
    if (!walletAddress || !historyEntryId) return
    if (status === 'settled') updatePaymentHistoryEntry(walletAddress, historyEntryId, 'settled')
    if (status === 'unknown') updatePaymentHistoryEntry(walletAddress, historyEntryId, 'unknown')
  }, [walletAddress, historyEntryId, status])

  useEffect(() => {
    if (status !== 'submitted' || !blinkTracked || !invoice || !invoice.toLowerCase().startsWith('lnbc')) return

    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const stopAt = Date.now() + 2 * 60_000
    setSettlementCheckTimedOut(false)
    const poll = async () => {
      try {
        const query = new URLSearchParams({ invoice })
        const response = await fetch(`/api/payment/status?${query.toString()}`, { cache: 'no-store' })
        const result = await response.json()
        if (!active) return
        if (response.ok && result.state === 'paid') { setStatus('settled'); return }
        if (response.ok && result.state === 'failed') { setStatus('settlement_failed'); return }
        if (Date.now() < stopAt) timer = setTimeout(poll, 2500)
        else { setError('Blink has not confirmed settlement yet. You can check again or contact the merchant.'); setSettlementCheckTimedOut(true) }
      } catch {
        if (active && Date.now() < stopAt) timer = setTimeout(poll, 4000)
        else if (active) { setError('Could not confirm settlement yet. You can check again or contact the merchant.'); setSettlementCheckTimedOut(true) }
      }
    }
    void poll()
    return () => { active = false; if (timer) clearTimeout(timer) }
  }, [status, blinkTracked, invoice, settlementCheckAttempt])

  async function payInvoice() {
    setError('')
    setStatus('approving')
    try {
      const validation = await fetch('/api/payment/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoice: resolvedInvoice || invoice }),
      })
      const checked = await validation.json()
      if (!validation.ok || !checked.valid) {
        setStatus('review')
        setError(checked.message || 'This invoice is no longer valid. Ask the merchant for a new one.')
        return
      }
      if (!providerRef.current) throw new Error('Nimiq Pay provider is not ready. Reopen the app inside Nimiq Pay.')
      const nimiq = await providerRef.current
      const result = await nimiq.payLightningInvoice({ invoice: (resolvedInvoice || invoice).trim() })
      setReference(result)
      setStatus('submitted')
      if (walletAddress) {
        const id = result.swapId || result.hash || crypto.randomUUID()
        setHistoryEntryId(id)
        savePaymentHistoryEntry({ id, wallet: walletAddress, recipient: parsed.isAddress ? invoice.trim() : 'Lightning invoice', amountSats: validatedInvoice.amountSats || 0, status: 'submitted', createdAt: Date.now(), reference: result.swapId || result.hash, paymentType: parsed.isAddress ? 'lightning-address' : 'bolt11' })
      }
    } catch (cause) {
      if (NimiqProviderError.is(cause) && cause.type === 'DUPLICATE_PAYMENT') {
        setStatus('submitted')
        setReference(cause.data && typeof cause.data === 'object' ? cause.data as { hash?: string; swapId?: string } : {})
        setError('This invoice was already submitted. Checking its Lightning status; do not submit it again.')
        if (walletAddress) {
          const ref = cause.data && typeof cause.data === 'object' ? cause.data as { hash?: string; swapId?: string } : {}
          const id = ref.swapId || ref.hash || crypto.randomUUID()
          setHistoryEntryId(id)
          savePaymentHistoryEntry({ id, wallet: walletAddress, recipient: parsed.isAddress ? invoice.trim() : 'Lightning invoice', amountSats: validatedInvoice.amountSats || 0, status: 'unknown', createdAt: Date.now(), reference: ref.swapId || ref.hash, paymentType: parsed.isAddress ? 'lightning-address' : 'bolt11' })
        }
      } else if (NimiqProviderError.is(cause) && cause.type === 'TRANSACTION_OUTCOME_UNKNOWN') {
        setStatus('submitted')
        setReference(cause.data && typeof cause.data === 'object' ? cause.data as { hash?: string; swapId?: string } : {})
        setError('Submission outcome is uncertain. Checking the Lightning invoice status; do not retry yet.')
        if (walletAddress) {
          const ref = cause.data && typeof cause.data === 'object' ? cause.data as { hash?: string; swapId?: string } : {}
          const id = ref.swapId || ref.hash || crypto.randomUUID()
          setHistoryEntryId(id)
          savePaymentHistoryEntry({ id, wallet: walletAddress, recipient: parsed.isAddress ? invoice.trim() : 'Lightning invoice', amountSats: validatedInvoice.amountSats || 0, status: 'unknown', createdAt: Date.now(), reference: ref.swapId || ref.hash, paymentType: parsed.isAddress ? 'lightning-address' : 'bolt11' })
        }
      } else {
        setStatus('failed')
        setError(cause instanceof Error ? cause.message : 'Could not submit this payment. Open LightningBridge inside Nimiq Pay and try again.')
      }
    }
  }

  function reset() { setInvoice(''); setAmountSats(''); setResolvedInvoice(''); setBlinkTracked(false); setStatus('idle'); setError(''); setReference({}); setValidatedInvoice({}) }

  async function reviewPayment() {
    setError('')
    setChecking(true)
    setResolvedInvoice('')
    try {
      if (parsed.isAddress) {
        const response = await fetch('/api/payment/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: invoice.trim(), amountSats: Number(amountSats) }) })
        const result = await response.json()
        if (!response.ok || !result.valid) { setError(result.message || 'Could not resolve this Lightning Address.'); return }
        setResolvedInvoice(result.invoice)
        setValidatedInvoice({ amountSats: result.amountSats, expiresAt: result.expiresAt, description: result.description })
      } else {
        const response = await fetch('/api/payment/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoice }) })
        const result = await response.json()
        if (!response.ok || !result.valid) { setError(result.message || 'This payment request could not be checked.'); return }
        setValidatedInvoice({ amountSats: result.amountSats, expiresAt: result.expiresAt, description: 'Fixed amount Lightning invoice' })
      }
      setStatus('review')
    } catch { setError('Could not check this payment. Check your connection and try again.') }
    finally { setChecking(false) }
  }

  return (
    <main className="workspace-shell">
      <header className="site-header workspace-header">
        <Link className="brand-image" href="/" aria-label="LightningBridge home"><BrandLogo /></Link>
      <nav className="workspace-nav" aria-label="Mini App"><Link className="nav-active" href="/pay">Pay</Link><Link href="/batch">Batch</Link><Link href="/activity">Activity</Link><Link href="/account">Account</Link></nav>
        <div className="app-wallet-chip"><span className={`status-dot ${inNimiqPay ? '' : 'host-unavailable'}`} />{walletConnected ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : inNimiqPay ? `Nimiq Pay · ${hostNetwork || 'network unknown'}` : 'Nimiq Pay required'}</div>
      </header>

      <section className="wallet-page-content">
        <div className="wallet-page-heading"><div className="eyebrow"><span /> SEND</div><h1>Pay Bitcoin over Lightning</h1><p>Pay a Lightning Address or invoice with NIM or USDT through Nimiq Pay.</p></div>
        <div className="wallet-account-strip"><span>NIMIQ PAY WALLET</span><strong>{walletConnected ? `${walletAddress.slice(0, 9)}…${walletAddress.slice(-6)}` : inNimiqPay ? 'Connect to continue' : 'Open this app in Nimiq Pay'}</strong><span className={`status-dot ${walletConnected ? '' : 'host-unavailable'}`} /></div>
        <section className="payment-card wallet-send-card" aria-label="Lightning payment">
          {!showReview ? (
            <>
              <div className="card-topline"><span className="step-label">PAYMENT DETAILS</span><span className="secure-label">Nimiq Pay approval</span></div>
              <h2>{walletConnected ? 'Pay with Lightning' : 'Connect your Nimiq Pay wallet'}</h2>
              <p className="card-intro">{walletConnected ? 'Enter recipient details. You’ll review the payment before Nimiq Pay asks for approval.' : 'Connect your Nimiq Pay wallet to start. Connecting does not send a payment.'}</p>
              {!inNimiqPay && <div className="inline-error" role="status">Open LightningBridge inside Nimiq Pay to connect your wallet and pay.<br /><a className="back-button" href="https://nimpay.app/miniapps/open/lightningbridge.vercel.app">Open in Nimiq Pay</a></div>}
              {inNimiqPay && !providerReady && <div className="inline-error" role="status">{providerError ? <>Could not reach the Nimiq Pay wallet provider. <button className="back-button" onClick={connectProvider}>Retry</button></> : 'Connecting to the Nimiq Pay provider…'}</div>}
              {inNimiqPay && providerReady && !walletConnected && <div className="wallet-connect-block"><p className="card-footnote">Connecting only grants wallet access. It does not send a payment.</p><button className="continue-button" disabled={connectingWallet} onClick={connectWallet}>{connectingWallet ? 'Waiting for wallet…' : 'Connect wallet'}</button>{connectionError && <p className="inline-error" role="alert">{connectionError}</p>}</div>}
              {hostNetwork === 'testnet' && <p className="inline-error" role="status">Lightning payments are only available on Nimiq Pay mainnet.</p>}
              {inNimiqPay && !hostNetwork && providerReady && <p className="inline-error" role="status">This Nimiq Pay version did not report its network. Update Nimiq Pay before making a mainnet payment.</p>}
              {inNimiqPay && providerReady && walletConnected && hostNetwork === 'mainnet' && <><div className="form-field"><label className="invoice-label" htmlFor="invoice">Recipient</label><textarea className="wallet-input" id="invoice" value={invoice} onChange={(event) => { setInvoice(event.target.value); setResolvedInvoice(''); setBlinkTracked(false); setError('') }} placeholder="Lightning Address or BOLT11 invoice" rows={2} /><button className="paste-button" onClick={async () => { try { setInvoice(await navigator.clipboard.readText()); setResolvedInvoice(''); setBlinkTracked(false) } catch { setError('Clipboard access was not granted.') } }}>Paste from clipboard</button></div>{parsed.isAddress && <div className="form-field amount-field"><label className="invoice-label" htmlFor="amount-sats">Amount <span>SAT</span></label><div className="amount-input-row"><input id="amount-sats" type="number" min="1" max="10000000" step="1" value={amountSats} onChange={(event) => setAmountSats(event.target.value)} placeholder="0" /><span>sats</span></div></div>}{error && <p className="inline-error" role="alert">{error}</p>}<button className="continue-button" disabled={!parsed.valid || (parsed.isAddress && !amountSats) || checking || !canPay} onClick={reviewPayment}>{checking ? (parsed.isAddress ? 'Requesting invoice…' : 'Checking invoice…') : 'Continue'}</button><p className="card-footnote">A fresh invoice is requested when you continue. Nimiq Pay will show the asset and fees before asking you to approve.</p></>}
            </>
          ) : (
            <>
              <div className="card-topline"><button className="back-button" onClick={() => setStatus('idle')}>Back</button><span className="step-label">REVIEW</span><span className="secure-label">Nimiq Pay approval</span></div>
              <h2>{status === 'approving' ? 'Waiting for Nimiq Pay' : status === 'submitted' ? 'Payment submitted' : status === 'settled' ? 'Lightning payment received' : status === 'settlement_failed' ? 'Invoice not paid' : status === 'unknown' ? 'Check payment status' : status === 'failed' ? 'Payment not submitted' : 'Review payment'}</h2>
              <p className="card-intro">{status === 'approving' ? 'Approve or cancel the payment in the Nimiq Pay dialog.' : status === 'submitted' ? blinkTracked ? 'Nimiq Pay submitted the swap. Waiting for Blink to confirm Lightning settlement.' : 'Nimiq Pay submitted the swap. LightningBridge cannot independently verify settlement for this invoice; check with the recipient.' : status === 'settled' ? 'Blink confirms that this Lightning invoice has been paid.' : status === 'settlement_failed' ? 'Blink reports that payment failed. Confirm the invoice status before trying again.' : 'Nimiq Pay checks the request, shows the asset and fees, and asks for your approval.'}</p>
              <div className="invoice-summary"><div><span>Recipient</span><strong>{parsed.isAddress ? invoice : 'Lightning invoice'}</strong><small>{validatedInvoice.expiresAt ? formatExpiry(validatedInvoice.expiresAt) : 'Fixed amount request'}</small></div></div>
              <div className="amount-row"><span>Lightning amount</span><strong>{validatedInvoice.amountSats !== undefined ? `${validatedInvoice.amountSats.toLocaleString(undefined, { maximumFractionDigits: 3 })} sats` : parsed.amount}</strong></div>
              <div className="asset-choice"><span>Pay with</span><strong>Choose NIM or USDT in Nimiq Pay</strong></div>
              {error && <div className="payment-alert" role="alert"><span>{error}</span></div>}
              {status === 'submitted' && blinkTracked && !settlementCheckTimedOut && <div className="pending-state"><span className="spinner" /> Waiting for Blink to confirm Lightning settlement…</div>}
              {status === 'submitted' && blinkTracked && settlementCheckTimedOut && <button className="secondary-button" onClick={() => { setError(''); setSettlementCheckAttempt((attempt) => attempt + 1) }}>Check settlement again</button>}
              {status === 'settled' && <div className="paid-state">Lightning payment confirmed by Blink</div>}
              {status === 'settlement_failed' && <div className="payment-alert">Invoice payment was not completed. Confirm its current state before trying again.</div>}
              {status === 'unknown' && <div className="payment-alert">Status unknown. Check with the recipient before submitting again.</div>}
              {status === 'failed' && <div className="payment-alert">Payment was not submitted. You can try again.</div>}
              {status === 'review' && <button className="continue-button" onClick={payInvoice}>Approve in Nimiq Pay</button>}
              {(status === 'failed' || status === 'unknown') && <button className="secondary-button" onClick={reset}>Start a new payment</button>}
              {(status === 'submitted' || status === 'settled' || status === 'unknown') && (reference.hash || reference.swapId) && <div className="receipt-refs"><span>Payment reference</span><button onClick={() => navigator.clipboard?.writeText(reference.swapId || reference.hash || '')}>Copy reference</button></div>}
            </>
          )}
        </section>
      </section>

      <footer className="workspace-footer"><Link href="/">Home</Link><span>Your payment is approved in Nimiq Pay</span><Link href="/activity">Activity</Link></footer>
    </main>
  )
}
