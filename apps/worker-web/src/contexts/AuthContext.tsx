'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  user: { phone: string; name: string } | null
  login: (phone: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ phone: string; name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedAuth = localStorage.getItem('suraksha-auth')
    if (savedAuth) {
      const { user } = JSON.parse(savedAuth)
      setUser(user)
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const login = (phone: string) => {
    const userData = { 
      phone, 
      name: 'Delivery Partner' // In real app, this would come from API
    }
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('suraksha-auth', JSON.stringify({ user: userData }))
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('suraksha-auth')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}