import { ImageResponse } from 'next/og'

export const alt = 'LightningBridge — Pay Bitcoin Lightning with NIM or USDT from Nimiq Pay'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: 'linear-gradient(125deg,#f7faf6 0%,#e8f3e9 62%,#d6eadd 100%)', color: '#15221f', fontFamily: 'Arial,sans-serif' }}>
    <div style={{ position: 'absolute', right: -70, top: -110, width: 620, height: 620, borderRadius: 310, border: '1px solid #c6ddcb', display: 'flex' }} />
    <div style={{ position: 'absolute', right: 28, top: -50, width: 470, height: 470, borderRadius: 235, border: '1px solid #c6ddcb', display: 'flex' }} />
    <div style={{ position: 'absolute', right: 0, bottom: -180, width: 500, height: 500, borderRadius: 250, background: 'rgba(11,114,88,.08)', display: 'flex' }} />
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '54px 66px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><div style={{ width: 46, height: 46, borderRadius: 14, background: '#0b7258', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="31" height="31" viewBox="0 0 48 48" fill="none"><path d="M5 30h7c4 0 5-13 11-13s7 13 11 13h9" stroke="#eaf8ec" strokeWidth="3.3" strokeLinecap="round"/><path d="m25 5-8 17h6l-1 12 10-19h-7l1-10Z" fill="#f8bd66"/></svg></div><div style={{ display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>lightning<span style={{ color: '#0b7258', fontWeight: 500 }}>bridge</span></div><div style={{ marginLeft: 12, padding: '8px 12px', borderRadius: 99, background: '#e4f1e5', color: '#537360', fontSize: 12, letterSpacing: 1.5 }}>NIMIQ PAY MINI APP</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 690, gap: 22 }}><div style={{ display: 'flex', color: '#0b7258', fontSize: 15, letterSpacing: 3, fontWeight: 700 }}>BITCOIN LIGHTNING, PAID FROM NIMIQ PAY</div><div style={{ display: 'flex', flexDirection: 'column', fontSize: 66, lineHeight: 1.05, letterSpacing: -3, fontWeight: 700 }}>Pay over Lightning<br/><span style={{ color: '#0b7258' }}>with NIM or USDT.</span></div><div style={{ display: 'flex', maxWidth: 650, color: '#64766a', fontSize: 22, lineHeight: 1.45 }}>Pay a Lightning Address or invoice from your Nimiq Pay wallet. The recipient receives Bitcoin in their existing Lightning wallet.</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#75867a', fontSize: 15 }}><span style={{ display: 'flex', width: 8, height: 8, borderRadius: 4, background: '#41a56a' }} />Your Nimiq wallet pays. Their Lightning wallet receives.</div>
    </div>
    <div style={{ position: 'absolute', right: 62, top: 247, width: 118, height: 118, borderRadius: 32, background: '#fff', boxShadow: '0 20px 55px rgba(27,70,45,.12)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><svg width="66" height="66" viewBox="0 0 48 48" fill="none"><path d="M9 28h5c4 0 5-10 10-10s6 10 10 10h5" stroke="#0b7258" strokeWidth="3.4" strokeLinecap="round"/><circle cx="9" cy="28" r="3" fill="#0b7258"/><circle cx="39" cy="28" r="3" fill="#e29a4d"/><path d="m25 5-8 17h6l-1 12 10-19h-7l1-10Z" fill="#e29a4d"/></svg></div>
    </div>, size)
}
