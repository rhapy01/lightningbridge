'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { readPaymentHistory, type PaymentHistoryEntry } from '../../lib/payment-history'
import { useWalletSession } from '../../components/wallet-session'
import { BrandLogo } from '../../components/brand-logo'

function shortReference(value: string) { return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value }

export default function ActivityPage() {
  const { inNimiqPay: hosted, network, walletAddress: wallet, connectWallet } = useWalletSession()
  const [payments, setPayments] = useState<PaymentHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (wallet) setPayments(readPaymentHistory(wallet)) }, [wallet])

  async function loadHistory() {
    setLoading(true)
    setError('')
    try {
      const account = wallet || await connectWallet()
      setPayments(readPaymentHistory(account))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load this wallet’s activity.') }
    finally { setLoading(false) }
  }

  return <main className="workspace-shell">
    <header className="site-header workspace-header">
      <Link className="brand-image" href="/" aria-label="LightningBridge home"><BrandLogo /></Link>
      <nav className="workspace-nav" aria-label="Mini App"><Link href="/pay">Pay</Link><Link href="/batch">Batch</Link><Link className="nav-active" href="/activity">Activity</Link><Link href="/account">Account</Link></nav>
      <Link className="header-cta" href="/pay">New payment <ArrowRight size={15} /></Link>
    </header>

    <section className="activity-content">
      <div className="activity-title"><div><div className="eyebrow"><span /> PAYMENT RECORDS</div><h1>Activity</h1><p>{wallet ? `Local payments for ${wallet.slice(0, 8)}…${wallet.slice(-6)}` : 'Your recent LightningBridge payments.'}</p></div><div className="account-network"><span className={`status-dot ${hosted ? '' : 'host-unavailable'}`} />{hosted ? `Nimiq Pay · ${network || 'Network'}` : 'Open inside Nimiq Pay'}</div></div>
      {!wallet ? <div className="activity-empty"><strong>Connect your Nimiq Pay wallet</strong><p>Payment records are stored on this device and shown for the wallet you connect.</p>{hosted ? <button className="primary-cta" disabled={loading} onClick={loadHistory}>{loading ? 'Loading activity…' : 'Connect wallet'} <ArrowRight size={15} /></button> : <a className="primary-cta" href="https://nimpay.app/miniapps/open/lightningbridge.vercel.app">Open inside Nimiq Pay <ArrowRight size={15} /></a>}{error && <p className="inline-error" role="alert">{error}</p>}</div> : payments.length === 0 ? <div className="activity-empty"><strong>No payments yet</strong><p>Payments you submit with this wallet will appear here.</p><Link className="primary-cta" href="/pay">Make a payment <ArrowRight size={15} /></Link></div> : <div className="activity-table"><div className="activity-table-head"><span>RECIPIENT</span><span>DATE</span><span>AMOUNT</span><span>STATUS</span></div>{payments.map((payment) => <article className="activity-row" key={payment.id}><div><strong>{payment.recipient}</strong><small>{payment.paymentType === 'lightning-address' ? 'Lightning Address' : 'BOLT11 invoice'}</small></div><span>{new Date(payment.createdAt).toLocaleString()}</span><strong>{payment.amountSats ? `${payment.amountSats.toLocaleString()} sats` : '—'}</strong><span className={`history-status status-${payment.status}`}>{payment.status === 'settled' ? 'Paid · Blink confirmed' : payment.status === 'unknown' ? 'Outcome unknown' : 'Submitted to Nimiq Pay'}</span>{payment.reference && <small className="activity-reference">Reference {shortReference(payment.reference)}</small>}</article>)}</div>}
      <p className="activity-note">“Submitted to Nimiq Pay” means the swap request was sent; it does not confirm Lightning settlement. “Paid · Blink confirmed” means Blink reported the invoice as paid. Other invoices may need confirmation from the recipient or their wallet. These records stay on this device and are not a synced wallet ledger.</p>
    </section>
    <footer className="workspace-footer"><Link href="/account">Account settings</Link><span>Wallet approval stays in Nimiq Pay</span></footer>
  </main>
}
