'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Badge } from '@/components/ui'

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [autoRenewal, setAutoRenewal] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/auth')
  }

  const settingsItems = [
    {
      category: 'Account',
      items: [
        { 
          title: 'Phone Number', 
          subtitle: user?.phone || '+91 98765 43210', 
          action: 'View' 
        },
        { 
          title: 'Verification Status', 
          subtitle: 'Verified', 
          badge: 'VERIFIED' 
        },
      ]
    },
    {
      category: 'Coverage',
      items: [
        { 
          title: 'Auto Renewal', 
          subtitle: 'Automatically renew coverage', 
          toggle: { value: autoRenewal, onChange: setAutoRenewal }
        },
        { 
          title: 'Coverage Zones', 
          subtitle: '3 zones selected', 
          action: 'Manage' 
        },
      ]
    },
    {
      category: 'Notifications',
      items: [
        { 
          title: 'Weather Alerts', 
          subtitle: 'Get notified about weather triggers', 
          toggle: { value: notifications, onChange: setNotifications }
        },
        { 
          title: 'Payout Updates', 
          subtitle: 'Payment confirmations and status', 
          action: 'Enabled' 
        },
      ]
    },
    {
      category: 'Support',
      items: [
        { 
          title: 'Help & FAQs', 
          subtitle: 'Get answers to common questions', 
          action: 'Open' 
        },
        { 
          title: 'Contact Support', 
          subtitle: 'Chat with our support team', 
          action: 'Chat' 
        },
        { 
          title: 'Report Issue', 
          subtitle: 'Technical problems or feedback', 
          action: 'Report' 
        },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-surface-page pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border-default">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-muted transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-xl font-semibold font-sora">Settings</h1>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">
                {user?.name?.charAt(0) || 'D'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.name || 'Delivery Partner'}</h2>
              <p className="text-white/80 text-sm">Premium Member</p>
              <Badge variant="outline" className="mt-2 border-white/30 text-white">
                Active Coverage
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings Categories */}
      <div className="px-4 space-y-6">
        {settingsItems.map((category, categoryIndex) => (
          <motion.div
            key={category.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
          >
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
              {category.category}
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-border-default overflow-hidden">
              {category.items.map((item, itemIndex) => (
                <div
                  key={item.title}
                  className={`flex items-center justify-between p-4 ${
                    itemIndex < category.items.length - 1 ? 'border-b border-border-default' : ''
                  }`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{item.title}</h4>
                    <p className="text-sm text-text-muted mt-0.5">{item.subtitle}</p>
                  </div>
                  
                  {item.badge && (
                    <Badge variant="success" size="sm">
                      {item.badge}
                    </Badge>
                  )}
                  
                  {item.toggle && (
                    <button
                      onClick={() => item.toggle!.onChange(!item.toggle!.value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.toggle.value ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.toggle.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                  
                  {item.action && !item.toggle && (
                    <button className="text-indigo-600 text-sm font-medium">
                      {item.action}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logout Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-4 mt-8"
      >
        <div className="bg-white rounded-xl shadow-sm border border-border-default p-4">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </motion.div>

      {/* Version Info */}
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-text-muted">
          Suraksha Weekly v1.0.0
        </p>
      </div>
    </div>
  )
}