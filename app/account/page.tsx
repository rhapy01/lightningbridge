'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useWalletSession } from '../../components/wallet-session'
import { BrandLogo } from '../../components/brand-logo'

export default function AccountPage() {
  const { inNimiqPay, network, walletAddress: wallet, connectWallet } = useWalletSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connectAccount() {
    setLoading(true)
    setError('')
    try {
      await connectWallet()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your Nimiq Pay account.')
    } finally { setLoading(false) }
  }

  return <main className="workspace-shell">
    <header className="site-header workspace-header">
      <Link className="brand-image" href="/" aria-label="LightningBridge home"><BrandLogo /></Link>
      <nav className="workspace-nav" aria-label="Mini App"><Link href="/pay">Pay</Link><Link href="/batch">Batch</Link><Link href="/activity">Activity</Link><Link className="nav-active" href="/account">Account</Link></nav>
      <Link className="header-cta" href="/pay">New payment <ArrowRight size={15} /></Link>
    </header>

    <section className="account-content account-only">
      <div className="account-title"><div><div className="eyebrow"><span /> ACCOUNT</div><h1>Wallet settings</h1><p>Manage the wallet connection LightningBridge uses for payments.</p></div><div className="account-network"><span className={`status-dot ${inNimiqPay ? '' : 'host-unavailable'}`} />{inNimiqPay ? `Nimiq Pay · ${network || 'Network'}` : 'Nimiq Pay not connected'}</div></div>
      <section className="account-card account-wallet-card">
        <span className="muted-overline">NIMIQ PAY WALLET</span>
        <h2>{wallet ? `${wallet.slice(0, 12)}…${wallet.slice(-8)}` : 'No wallet connected'}</h2>
        <p>{wallet ? 'This is the public Nimiq address currently approved for LightningBridge.' : 'Connect your wallet to see which Nimiq account is active. This does not start a payment.'}</p>
        {!wallet && (inNimiqPay ? <button className="primary-cta" onClick={connectAccount} disabled={loading}>{loading ? 'Connecting…' : 'Connect wallet'} <ArrowRight size={15} /></button> : <a className="primary-cta" href="https://nimpay.app/miniapps/open/lightningbridge.vercel.app">Open inside Nimiq Pay <ArrowRight size={15} /></a>)}
        {wallet && <button className="copy-address" onClick={() => navigator.clipboard?.writeText(wallet)}>Copy wallet address</button>}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>
      <div className="account-preferences">
        <div><strong>Payment history</strong><span>Saved on this device for each wallet. It does not sync or replace your Nimiq wallet records.</span></div><Link href="/activity">Open activity <ArrowRight size={15} /></Link>
        <div><strong>Privacy</strong><span>LightningBridge stores no private keys or wallet secrets. Local payment records can be removed by clearing this Mini App’s site data.</span></div><Link href="/">About LightningBridge <ArrowRight size={15} /></Link>
      </div>
    </section>
    <footer className="workspace-footer"><Link href="/">Home</Link><span>Wallet approval stays in Nimiq Pay</span></footer>
  </main>
}
