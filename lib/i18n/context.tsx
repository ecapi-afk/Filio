"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type Locale = "en" | "zh"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  isLoading: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem("filio-locale", newLocale)
    // Also save to user's profile if logged in
    saveLanguageToProfile(newLocale)
  }

  // Save language to user's profile
  const saveLanguageToProfile = async (lang: Locale) => {
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
    } catch (err) {
      console.error('Failed to save language to profile:', err)
    }
  }

  // Fetch user's profile language on mount
  useEffect(() => {
    async function fetchProfileLanguage() {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          // Use profile language if set and valid
          if (data.language && (data.language === "en" || data.language === "zh")) {
            setLocaleState(data.language)
            localStorage.setItem("filio-locale", data.language)
            setIsLoading(false)
            return
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile language:', err)
      }
      // Fall back to localStorage or default
      const savedLocale = localStorage.getItem("filio-locale") as Locale | null
      if (savedLocale && (savedLocale === "en" || savedLocale === "zh")) {
        setLocaleState(savedLocale)
      }
      setIsLoading(false)
    }
    fetchProfileLanguage()
  }, [])

  useEffect(() => {
    if (isLoading) return
    import(`@/lib/i18n/locales/${locale}`).then((module) => {
      setTranslations(module.default)
    })
  }, [locale, isLoading])

  const t = (key: string): string => {
    return translations[key] || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  )
}
