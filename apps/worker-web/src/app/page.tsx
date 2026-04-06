'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Only redirect if we're on the root path to prevent infinite loops
    if (pathname === '/') {
      if (isAuthenticated) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth')
      }
    }
  }, [isAuthenticated, router, pathname])

  // Show loading spinner 
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
