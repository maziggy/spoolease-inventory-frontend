import { createContext } from 'preact'
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'
import { api, Spool, SpoolsInPrinters, KInfo, PrintersFilamentPa } from '../lib/api'
import { getSecurityKeyFromUrl } from '../lib/crypto'
import type { ComponentChildren } from 'preact'

interface AppState {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  spools: Spool[]
  spoolsInPrinters: SpoolsInPrinters
  spoolsCatalog: string[]
  filamentBrands: string[]
}

interface AppContextValue extends AppState {
  refreshSpools: () => Promise<void>
  addSpool: (spool: Partial<Spool>, kInfo?: KInfo) => Promise<void>
  editSpool: (spool: Partial<Spool>, kInfo?: KInfo) => Promise<void>
  deleteSpool: (id: string) => Promise<void>
  authenticate: (key: string) => Promise<boolean>
  getSpoolKInfo: (id: string) => Promise<KInfo | null>
  getPrintersFilamentPa: (slicerFilamentCode: string) => Promise<PrintersFilamentPa | null>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ComponentChildren }) {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    isAuthenticated: false,
    error: null,
    spools: [],
    spoolsInPrinters: {},
    spoolsCatalog: [],
    filamentBrands: [],
  })

  const authenticate = useCallback(async (key: string): Promise<boolean> => {
    try {
      await api.init(key)
      // Test the connection by fetching spools
      const spools = await api.getSpools()
      const spoolsInPrinters = await api.getSpoolsInPrinters()

      setState(s => ({
        ...s,
        isAuthenticated: true,
        spools,
        spoolsInPrinters,
        error: null,
      }))

      // Store key in URL hash for persistence
      window.location.hash = `sk=${key}`
      return true
    } catch (e) {
      console.error('Authentication failed:', e)
      setState(s => ({
        ...s,
        isAuthenticated: false,
        error: 'Invalid security key or connection failed',
      }))
      return false
    }
  }, [])

  const refreshSpools = useCallback(async () => {
    if (!api.isInitialized()) return

    try {
      const [spools, spoolsInPrinters] = await Promise.all([
        api.getSpools(),
        api.getSpoolsInPrinters(),
      ])
      setState(s => ({ ...s, spools, spoolsInPrinters, error: null }))
    } catch (e) {
      console.error('Failed to refresh spools:', e)
      setState(s => ({ ...s, error: 'Failed to fetch spools' }))
    }
  }, [])

  const addSpool = useCallback(async (spool: Partial<Spool>, kInfo?: KInfo) => {
    try {
      const result = await api.addSpool(spool, kInfo)
      setState(s => ({ ...s, spools: result.spools, error: null }))
    } catch (e) {
      console.error('Failed to add spool:', e)
      setState(s => ({ ...s, error: 'Failed to add spool' }))
      throw e
    }
  }, [])

  const editSpool = useCallback(async (spool: Partial<Spool>, kInfo?: KInfo) => {
    try {
      const result = await api.editSpool(spool, kInfo)
      setState(s => ({ ...s, spools: result.spools, error: null }))
    } catch (e) {
      console.error('Failed to edit spool:', e)
      setState(s => ({ ...s, error: 'Failed to edit spool' }))
      throw e
    }
  }, [])

  const getSpoolKInfo = useCallback(async (id: string): Promise<KInfo | null> => {
    try {
      return await api.getSpoolKInfo(id)
    } catch (e) {
      console.error('Failed to get spool K info:', e)
      return null
    }
  }, [])

  const getPrintersFilamentPa = useCallback(async (slicerFilamentCode: string): Promise<PrintersFilamentPa | null> => {
    try {
      return await api.getPrintersFilamentPa(slicerFilamentCode)
    } catch (e) {
      console.error('Failed to get printers filament PA:', e)
      return null
    }
  }, [])

  const deleteSpool = useCallback(async (id: string) => {
    try {
      const spools = await api.deleteSpool(id)
      setState(s => ({ ...s, spools, error: null }))
    } catch (e) {
      console.error('Failed to delete spool:', e)
      setState(s => ({ ...s, error: 'Failed to delete spool' }))
      throw e
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      // Load unencrypted data first
      try {
        const [catalogText, brandsText] = await Promise.all([
          api.getSpoolsCatalog(),
          api.getFilamentBrands(),
        ])

        const spoolsCatalog = catalogText.split('\n').filter(Boolean)
        const filamentBrands = brandsText.split('\n').filter(Boolean)

        setState(s => ({ ...s, spoolsCatalog, filamentBrands }))
      } catch (e) {
        console.error('Failed to load catalog data:', e)
      }

      // Try to authenticate with key from URL
      const keyFromUrl = getSecurityKeyFromUrl()
      if (keyFromUrl) {
        await authenticate(keyFromUrl)
      }

      setState(s => ({ ...s, isLoading: false }))
    }

    init()
  }, [authenticate])

  return (
    <AppContext.Provider
      value={{
        ...state,
        refreshSpools,
        addSpool,
        editSpool,
        deleteSpool,
        authenticate,
        getSpoolKInfo,
        getPrintersFilamentPa,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
