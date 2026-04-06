'use client'

import { useAuth } from '@/contexts/AuthContext'

// Import the actual auth page content
import AuthPageContent from '../(auth)/page'

export default function AuthRoute() {
  const { isAuthenticated } = useAuth()

  // If authenticated, redirect via window location to break any loops
  if (isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Render the auth page content directly
  return <AuthPageContent />
}