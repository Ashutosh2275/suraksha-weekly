'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useReviewQueue } from '@/lib/ReviewQueueContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number | boolean;
  badgeColor?: 'amber' | 'red' | 'green';
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = useReviewQueue();

  // Create dynamic navigation sections based on context
  const getNavSections = (): NavSection[] => [
    {
      label: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          href: '/dashboard',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ),
        },
        {
          id: 'demo',
          label: 'Live Demo',
          href: '/demo',
          badge: true,
          badgeColor: 'amber',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M6 5l8 5-8 5V5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        {
          id: 'review-queue',
          label: 'Review Queue',
          href: '/review-queue',
          badge: pendingCount > 0 ? pendingCount : false,
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="5" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: 'triggers',
          label: 'Trigger Monitor',
          href: '/triggers',
          badge: 3,
          badgeColor: 'amber',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 3v2M10 15v2M3 10h2M15 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: 'claims',
          label: 'Claims',
          href: '/claims',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 6h10M5 10h10M5 14h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'INTELLIGENCE',
      items: [
        {
          id: 'fraud',
          label: 'Fraud Center',
          href: '/fraud',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L3 7v6c0 5.55 3.84 7.74 9 9 5.16-1.26 9-3.45 9-9V7l-7-5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          id: 'ml-models',
          label: 'ML Models',
          href: '/ml-models',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="5" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="15" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 8l-1 4M12 8l1 4" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'CONFIGURATION',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          href: '/settings',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 12a2 2 0 100-4 2 2 0 000 4z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m16.24 7.76-1.804-.513A6.002 6.002 0 0013.93 6.02l.513-1.804c.094-.33-.132-.556-.462-.462l-1.804.513A6.002 6.002 0 0010.95 3.76l.513-1.804c.094-.33-.132-.556-.462-.462l-1.804.513A6.002 6.002 0 007.95 2.993L7.437 1.19c-.094-.33-.32-.094-.462.236l-.513 1.804A6.002 6.002 0 005.235 4.257L3.431 3.744c-.33-.094-.556.132-.462.462l.513 1.804A6.002 6.002 0 002.255 7.237L.451 6.724c-.33-.094-.094.32.236.462l1.804.513A6.002 6.002 0 003.518 8.926L2.005 9.439c-.33.094-.094.32.236.462l1.804.513A6.002 6.002 0 005.272 11.641l-.513 1.804c-.094.33.132.556.462.462l1.804-.513A6.002 6.002 0 008.252 14.621l.513 1.804c.094.33.32.094.462-.236l.513-1.804A6.002 6.002 0 0011.967 13.358l1.804.513c.33.094.556-.132.462-.462l-.513-1.804A6.002 6.002 0 0014.747 10.378l1.804.513c.33.094.094-.32-.236-.462l-1.804-.513A6.002 6.002 0 0013.484 8.689l.513-1.804c.094-.33-.132-.556-.462-.462z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
        {
          id: 'health',
          label: 'Health Status',
          href: '/health',
          badge: true,
          badgeColor: 'green',
          icon: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10h2l2-3 4 6 2-3h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  // Mock notification data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'High Fraud Score Detected',
      description: 'Claim #12847 has a fraud score of 0.89',
      timestamp: '2 minutes ago',
      type: 'warning',
      read: false
    },
    {
      id: '2', 
      title: 'System Maintenance',
      description: 'Scheduled maintenance in 30 minutes',
      timestamp: '15 minutes ago',
      type: 'info',
      read: false
    },
    {
      id: '3',
      title: 'Payout Processed',
      description: '₹420 paid to Worker #4738',
      timestamp: '1 hour ago', 
      type: 'success',
      read: true
    },
    {
      id: '4',
      title: 'Rate Limit Exceeded',
      description: 'API rate limit reached from IP 192.168.1.100',
      timestamp: '2 hours ago',
      type: 'error',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  const getBadgeColor = (color?: 'amber' | 'red' | 'green') => {
    switch (color) {
      case 'amber':
        return 'bg-admin-sidebar-accent text-admin-sidebar-bg';
      case 'red':
        return 'bg-red-500 text-white';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-admin-sidebar-accent text-admin-sidebar-bg';
    }
  };

  const environment = process.env.NEXT_PUBLIC_ENV || 'STAGING';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--admin-content-bg)' }}>
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-16' : 'w-60'
        } flex-shrink-0 flex flex-col transition-all duration-200`}
        style={{
          backgroundColor: 'var(--admin-sidebar-bg)',
          color: 'var(--admin-sidebar-text)',
        }}
      >
        {/* Top Section */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(148, 163, 192, 0.1)' }}>
          <div className="flex items-center gap-3 mb-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 3L4 9v7c0 7.5 5.2 14.5 12 16 6.8-1.5 12-8.5 12-16V9L16 3z"
                  fill="#1B4FCC"
                  fillOpacity="0.2"
                  stroke="#1B4FCC"
                  strokeWidth="2"
                />
                <path
                  d="M11 16l3 3 7-7"
                  stroke="#1B4FCC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {!isSidebarCollapsed && (
              <div>
                <div className="font-display font-semibold text-sm" style={{ color: 'var(--admin-sidebar-active)' }}>
                  Suraksha Weekly
                </div>
                <div className="text-xs uppercase tracking-wider" style={{ color: 'rgba(148, 163, 192, 0.6)' }}>
                  Admin
                </div>
              </div>
            )}
          </div>

          {/* Environment Badge */}
          {!isSidebarCollapsed && (
            <div
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                environment === 'PRODUCTION'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-amber-300 border'
              }`}
              style={{
                backgroundColor: environment === 'PRODUCTION' ? undefined : 'rgba(245, 166, 35, 0.2)',
                borderColor: environment === 'PRODUCTION' ? undefined : 'rgba(245, 166, 35, 0.3)',
              }}
            >
              {environment}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {getNavSections().map((section) => (
            <div className="mb-6">
              {!isSidebarCollapsed && (
                <div className="px-3 mb-2 text-xs font-semibold tracking-wider" style={{ color: 'rgba(148, 163, 192, 0.4)' }}>
                  {section.label}
                </div>
              )}

              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative ${
                      isActive(item.href)
                        ? 'text-white border-l-3'
                        : 'hover:text-white/80'
                    }`}
                    style={{
                      backgroundColor: isActive(item.href) ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      borderLeftColor: isActive(item.href) ? 'var(--admin-sidebar-accent)' : 'transparent',
                      borderLeftWidth: isActive(item.href) ? '3px' : '0',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive(item.href)) {
                        e.currentTarget.style.backgroundColor = 'rgba(148, 163, 192, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(item.href)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span className={isActive(item.href) ? 'text-white' : ''}>
                      {item.icon}
                    </span>

                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>

                        {/* Badge */}
                        {item.badge !== undefined && (
                          <>
                            {typeof item.badge === 'number' ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs font-semibold text-black"
                                style={{ backgroundColor: 'var(--admin-sidebar-accent)' }}
                              >
                                {item.badge}
                              </span>
                            ) : (
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    item.badgeColor === 'green'
                                      ? '#10B981'
                                      : item.badgeColor === 'red'
                                      ? '#EF4444'
                                      : 'var(--admin-sidebar-accent)',
                                }}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Tooltip for collapsed mode */}
                    {isSidebarCollapsed && (
                      <div
                        className="absolute left-full ml-2 px-2 py-1 border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                        style={{
                          backgroundColor: 'var(--admin-sidebar-bg)',
                          borderColor: 'rgba(148, 163, 192, 0.2)',
                        }}
                      >
                        {item.label}
                        {typeof item.badge === 'number' && (
                          <span className="ml-2" style={{ color: 'var(--admin-sidebar-accent)' }}>
                            ({item.badge})
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(148, 163, 192, 0.1)' }}>
          {!isSidebarCollapsed ? (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-semibold">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--admin-sidebar-active)' }}>
                    Admin User
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(148, 163, 192, 0.6)' }}>
                    Super Admin
                  </div>
                </div>
              </div>
              <button
                className="w-full px-3 py-2 text-sm rounded transition-colors hover:text-white"
                style={{
                  color: 'var(--admin-sidebar-text)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(148, 163, 192, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className="w-full flex items-center justify-center py-2 rounded transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(148, 163, 192, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M13 13l4 4m0-4l-4 4M3 10h10M13 10l-2-2M13 10l-2 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6" style={{
          backgroundColor: 'var(--admin-card-bg)',
          borderBottom: '1px solid var(--admin-border)'
        }}>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Dashboard
            </button>
            {pathname && pathname !== '/' && pathname !== '/dashboard' && (
              <>
                <span className="text-text-muted">/</span>
                <span className="text-text-primary font-medium capitalize">
                  {pathname.split('/').filter(Boolean).pop()?.replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative" data-dropdown>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-surface-subtle rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-80 border rounded-lg shadow-lg p-2 z-50"
                    style={{
                      backgroundColor: 'var(--admin-card-bg)',
                      borderColor: 'var(--admin-border)'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full px-3 py-2 bg-surface-subtle border-0 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div className="relative" data-dropdown>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-surface-subtle rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 4a4 4 0 014 4v2.697c0 .566.12 1.124.351 1.633l.702 1.545A1 1 0 0114.149 15H5.85a1 1 0 01-.904-1.425l.702-1.545A3 3 0 006 10.697V8a4 4 0 014-4zM8 16h4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-96 border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden"
                    style={{
                      backgroundColor: 'var(--admin-card-bg)',
                      borderColor: 'var(--admin-border)'
                    }}
                  >
                    {/* Header */}
                    <div className="p-4 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {unreadCount} unread
                            </span>
                          )}
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-brand-primary hover:text-brand-primary/80 font-medium"
                          >
                            Mark all read
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-surface-subtle/50 transition-colors cursor-pointer ${
                              !notification.read ? 'bg-blue-50/50' : ''
                            }`}
                            style={{ borderColor: 'var(--admin-border)' }}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.type === 'error' ? 'bg-red-500' :
                                notification.type === 'warning' ? 'bg-amber-500' :
                                notification.type === 'success' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.timestamp}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                        <button className="w-full text-center text-sm text-brand-primary hover:text-brand-primary/80 font-medium py-1">
                          View all notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-sm font-semibold">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto p-6">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
