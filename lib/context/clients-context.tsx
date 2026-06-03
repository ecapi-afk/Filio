"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

export interface ClientListItem {
  id: string
  name: string
  email: string | null
  portal_email: string | null
  is_starred: boolean
  health_status: string
  portal_status: string
  management_status: string
  xero_not_found: boolean
  last_upload: string | null
  created_at: string
  next_deadline?: { date: string; type: string }
  upload_progress?: { uploaded: number; required: number }
}

interface ClientsContextType {
  clients: ClientListItem[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: (showLoading?: boolean) => Promise<void>
  allClientsCount: number
  deletedCount: number
}

const ClientsContext = createContext<ClientsContextType | null>(null)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [allClientsCount, setAllClientsCount] = useState(0)
  const [deletedCount, setDeletedCount] = useState(0)

  // Fetches active/dormant/archived clients (excludes deleted by default)
  const fetchActiveClients = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/clients')
      if (!response.ok) {
        // Don't show error for 401 (user not logged in)
        if (response.status === 401) {
          setInitialized(true)
          return
        }
        throw new Error('Failed to fetch clients')
      }
      const { data } = await response.json()
      setClients(data || [])
      setLastUpdated(new Date())
      setInitialized(true)
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError('Failed to load clients')
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  // Fetches deleted clients only
  const fetchDeletedClients = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/clients?management_status=deleted')
      if (!response.ok) throw new Error('Failed to fetch deleted clients')
      const { data } = await response.json()
      setClients(data || [])
      setDeletedCount(data?.length || 0)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching deleted clients:', err)
      setError('Failed to load deleted clients')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Prefetch active clients on mount
  useEffect(() => {
    if (!initialized) {
      fetchActiveClients(false)
    }
  }, [initialized, fetchActiveClients])

  // Also fetch deleted count on mount (for tab visibility)
  useEffect(() => {
    async function fetchCounts() {
      try {
        const response = await fetch('/api/clients?management_status=deleted')
        if (response.ok) {
          const { data } = await response.json()
          setDeletedCount(data?.length || 0)
        }
      } catch {
        // ignore
      }
      try {
        const response = await fetch('/api/clients')
        if (response.ok) {
          const { data } = await response.json()
          setAllClientsCount(data?.length || 0)
        }
      } catch {
        // ignore
      }
    }
    fetchCounts()
  }, [])

  const refresh = useCallback(async (showLoading = false) => {
    await fetchActiveClients(showLoading)
    // Also refresh deleted count
    try {
      const response = await fetch('/api/clients?management_status=deleted')
      if (response.ok) {
        const { data } = await response.json()
        setDeletedCount(data?.length || 0)
      }
    } catch {
      // ignore
    }
  }, [fetchActiveClients])

  return (
    <ClientsContext.Provider value={{ clients, isLoading, error, lastUpdated, refresh, allClientsCount, deletedCount }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const context = useContext(ClientsContext)
  if (!context) {
    throw new Error('useClients must be used within ClientsProvider')
  }
  return context
}
