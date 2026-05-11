import { createContext, useContext, useEffect, useState } from 'react'

const PlatformOverviewContext = createContext({
  loading: true,
  data: null,
  error: null,
})

export function usePlatformOverview() {
  return useContext(PlatformOverviewContext)
}

export function PlatformOverviewProvider({ url, children }) {
  const [state, setState] = useState({ loading: true, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null, error: null })
    fetch(url, { credentials: 'include' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        const errMsg =
          !r.ok && (typeof j?.error === 'string' ? j.error : `HTTP ${r.status}`)
        setState({ loading: false, data: j, error: errMsg || null })
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            loading: false,
            data: null,
            error: e instanceof Error ? e.message : 'Falha na rede',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [url])

  return <PlatformOverviewContext.Provider value={state}>{children}</PlatformOverviewContext.Provider>
}
