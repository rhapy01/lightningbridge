'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getHostNetwork, init } from '@nimiq/mini-app-sdk'

type WalletSessionValue = {
  walletAddress: string
  network: ReturnType<typeof getHostNetwork>
  inNimiqPay: boolean
  connectWallet: () => Promise<string>
}

const WalletSession = createContext<WalletSessionValue | null>(null)

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState('')
  const [network, setNetwork] = useState<ReturnType<typeof getHostNetwork>>(undefined)
  const [inNimiqPay, setInNimiqPay] = useState(false)
  const providerRef = useRef<Awaited<ReturnType<typeof init>> | null>(null)

  useEffect(() => {
    const hosted = Reflect.get(window, 'nimiqPay') !== undefined
    setInNimiqPay(hosted)
    setNetwork(getHostNetwork())
    if (hosted) {
      const saved = window.sessionStorage.getItem('lightningbridge:wallet')
      if (saved) setWalletAddress(saved)
    }

    if (!hosted) return

    let active = true
    let provider: Awaited<ReturnType<typeof init>> | null = null
    const syncAccounts = (accounts: string[]) => {
      if (!active) return
      const nextWallet = accounts[0] || ''
      setWalletAddress(nextWallet)
      if (nextWallet) window.sessionStorage.setItem('lightningbridge:wallet', nextWallet)
      else window.sessionStorage.removeItem('lightningbridge:wallet')
    }

    void init({ timeout: 10_000 }).then((nimiq) => {
      if (!active) return
      provider = nimiq
      providerRef.current = nimiq
      nimiq.on('accountsChanged', syncAccounts)
    }).catch(() => {
      // Wallet access stays user initiated; cached session state remains available.
    })

    return () => {
      active = false
      if (provider) {
        provider.removeListener('accountsChanged', syncAccounts)
        if (providerRef.current === provider) providerRef.current = null
      }
    }
  }, [])

  const connectWallet = useCallback(async () => {
    const nimiq = await init({ timeout: 10_000 })
    providerRef.current = nimiq
    const accounts = await nimiq.listAccounts()
    if (!accounts[0]) throw new Error('Nimiq Pay did not return an approved wallet account.')
    setWalletAddress(accounts[0])
    setNetwork(getHostNetwork())
    setInNimiqPay(true)
    window.sessionStorage.setItem('lightningbridge:wallet', accounts[0])
    return accounts[0]
  }, [])

  const value = useMemo(() => ({ walletAddress, network, inNimiqPay, connectWallet }), [walletAddress, network, inNimiqPay, connectWallet])
  return <WalletSession.Provider value={value}>{children}</WalletSession.Provider>
}

export function useWalletSession() {
  const session = useContext(WalletSession)
  if (!session) throw new Error('WalletSessionProvider is missing from the app layout.')
  return session
}
