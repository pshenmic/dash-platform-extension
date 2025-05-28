import React, { createContext, useContext, useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

/**
 * Context value shape for theme switching.
 */
export interface ThemeContextValue {
  /** Current theme, either 'light' or 'dark'. */
  theme: Theme
  /** Set the theme explicitly. */
  setTheme: (theme: Theme) => void
  /** Toggle between 'light' and 'dark'. */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/**
 * Props for the ThemeProvider component.
 */
export interface ThemeProviderProps {
  /** Initial theme; if not provided, reads from localStorage or defaults to 'light'. */
  initialTheme?: Theme
  /** React children that will have access to the theme context. */
  children: React.ReactNode
}

/**
 * Provides theme context to its descendants and syncs theme with localStorage
 * and the root HTML element's class list ('light' or 'dark').
 *
 * @param initialTheme - Optional initial theme override.
 * @param children - React children.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ initialTheme, children }) => {
  /**
   * Retrieve stored theme from localStorage, if available.
   */
  const getStoredTheme = (): Theme | null => {
    if (typeof window === 'undefined') return null
    return (localStorage.getItem('theme') as Theme) || null
  }

  const [theme, setThemeState] = useState<Theme>(() => {
    return initialTheme ?? getStoredTheme() ?? 'light'
  })

  // Sync theme changes to document <html> class and localStorage.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Ignore localStorage.
    }
  }, [theme])

  /**
   * Update theme state explicitly.
   * @param newTheme - The theme to set ('light' or 'dark').
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  /**
   * Toggle between 'light' and 'dark' theme.
   */
  const toggleTheme = () => {
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access the theme context.
 * @returns ThemeContextValue - Contains `theme`, `setTheme`, and `toggleTheme`.
 * @throws If used outside of a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
