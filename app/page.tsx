'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'
import { ArrowRight, ArrowUpRight, LockKeyhole, ShieldCheck, Zap } from 'lucide-react'
import { BrandLogo } from '../components/brand-logo'

export default function HomePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('invoice')) window.location.replace(`/pay${window.location.search}`)
  }, [])

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand-image" href="/" aria-label="LightningBridge home"><BrandLogo /></Link>
        <nav className="site-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><Link href="/batch">Batch payments</Link></nav>
        <Link className="header-cta" href="/pay">Open app <ArrowUpRight size={16} /></Link>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow"><span /> BITCOIN LIGHTNING, PAID FROM NIMIQ PAY</div>
          <h1>Pay a Lightning<br />invoice with<br /><em>NIM or USDT.</em></h1>
          <p>LightningBridge connects your Nimiq Pay wallet to the Bitcoin Lightning network. Pay a freelancer, creator or merchant without first moving funds into a separate Bitcoin wallet. They receive Bitcoin through the Lightning wallet they already use.</p>
          <div className="landing-actions"><Link className="primary-cta" href="/pay">Make a Lightning payment <ArrowRight size={17} /></Link><span><ShieldCheck size={16} /> You review and approve in Nimiq Pay</span></div>
          <div className="landing-trust"><span><LockKeyhole size={15} /> Your keys stay in Nimiq Pay</span><span><Zap size={15} /> Recipient keeps their Lightning wallet</span></div>
        </div>

        <div className="hero-visual"><Image src="/bridge-hero.svg" alt="A Nimiq Pay user sends NIM or USDT and the recipient receives Bitcoin over Lightning" width={760} height={640} priority /><div className="visual-caption"><span>THE PAYMENT, CLEARLY</span><strong>You spend NIM or USDT. They receive Bitcoin.</strong></div></div>
      </section>

      <section className="proof-strip" id="why-lightning"><div><strong>Spend what you hold</strong><span>Use NIM or USDT already in Nimiq Pay</span></div><div><strong>Pay their way</strong><span>The recipient gets Bitcoin in their Lightning wallet</span></div><div><strong>No recipient migration</strong><span>They don’t need to adopt Nimiq or open a new account</span></div></section>

      <section className="how-section" id="how-it-works">
        <div className="how-intro"><div className="eyebrow"><span /> THE PRODUCT</div><h2>A bridge between<br />two payment networks.</h2><p>LightningBridge is for the moment a Nimiq Pay user needs to pay someone who accepts Bitcoin Lightning.</p></div>
        <div className="steps-grid"><article><span className="step-number">01</span><h3>Use their payment details</h3><p>Enter a Lightning Address and amount, or paste the fixed amount invoice they sent you.</p></article><article><span className="step-number">02</span><h3>Get a payable request</h3><p>For an address, we ask its Lightning provider for a fresh invoice for your chosen amount.</p></article><article><span className="step-number">03</span><h3>Pay from Nimiq Pay</h3><p>Review the amount and fees, choose NIM or USDT, then approve the Bitcoin payment in your wallet.</p></article></div>
      </section>

      <section className="batch-feature"><div><div className="eyebrow"><span /> FOR REPEAT PAYMENTS</div><h2>Pay several invoices<br />from one review list.</h2><p>Paste up to 20 fixed amount Lightning invoices. LightningBridge checks them and totals the sats, then runs the payments in order. Nimiq Pay asks you to approve each payment separately.</p></div><Link className="primary-cta" href="/batch">Open batch payments <ArrowRight size={17} /></Link></section>

      <section className="landing-bottom"><div><span className="bottom-icon"><Zap size={17} fill="currentColor" /></span><div><strong>Built for paying across networks</strong><span>Your Nimiq wallet funds a Bitcoin Lightning payment.</span></div></div><Link className="primary-cta" href="/pay">Start a payment <ArrowRight size={17} /></Link></section>
      <footer className="site-footer"><Link className="brand-image footer-brand" href="/" aria-label="LightningBridge home"><BrandLogo small /></Link><span>Bitcoin Lightning payments from Nimiq Pay</span><Link href="/activity">Payment activity <ArrowRight size={14} /></Link></footer>
    </main>
  )
}
