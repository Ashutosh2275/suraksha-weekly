"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShieldStatus {
  isActive: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'ACTIVE'
  zone?: string
  triggerType?: string
}

interface ShieldBannerProps {
  className?: string
}

export function ShieldBanner({ className }: ShieldBannerProps) {
  const [shieldStatus, setShieldStatus] = useState<ShieldStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShieldStatus = async () => {
      try {
        // Check if policy is active
        const policyResponse = await fetch('/api/v1/policies', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('suraksha_token')}`
          }
        })

        if (!policyResponse.ok) {
          setLoading(false)
          return
        }

        const policies = await policyResponse.json()
        const activePolicy = policies.data?.find((p: { status: string }) => p.status === 'active')

        if (!activePolicy) {
          setLoading(false)
          return
        }

        // Check risk level for worker's zone
        const riskResponse = await fetch('/api/v1/pricing/risk-today', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('suraksha_token')}`
          }
        })

        if (riskResponse.ok) {
          const riskData = await riskResponse.json()
          setShieldStatus({
            isActive: true,
            riskLevel: riskData.data.risk_level,
            zone: riskData.data.zone,
            triggerType: riskData.data.active_trigger_type
          })
        } else {
          setShieldStatus({ isActive: true, riskLevel: 'LOW' })
        }
      } catch (error) {
        console.error('Failed to fetch shield status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShieldStatus()

    // Refresh every 30 seconds
    const interval = setInterval(fetchShieldStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !shieldStatus?.isActive) {
    return null
  }

  const shouldShowBanner = shieldStatus.riskLevel === 'HIGH' || shieldStatus.riskLevel === 'ACTIVE'

  if (!shouldShowBanner) {
    return null
  }

  const isActiveTrigger = shieldStatus.riskLevel === 'ACTIVE'

  return (
    <Alert
      className={cn(
        "relative overflow-hidden border-2 mb-6",
        isActiveTrigger
          ? "border-red-200 bg-red-50 dark:bg-red-950/10 animate-pulse"
          : "border-amber-200 bg-amber-50 dark:bg-amber-950/10 animate-pulse",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isActiveTrigger ? (
          <Zap className="h-5 w-5 text-red-600 animate-bounce" />
        ) : (
          <Shield className="h-5 w-5 text-amber-600" />
        )}

        <div className="flex-1">
          <AlertTitle className={cn(
            "font-bold text-base",
            isActiveTrigger ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"
          )}>
            {isActiveTrigger ? "🚨 Your Shield is ACTIVE!" : "⚡ Your Shield is Active"}
          </AlertTitle>

          <AlertDescription className={cn(
            "text-sm",
            isActiveTrigger ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
          )}>
            {isActiveTrigger ? (
              <>
                <strong>{shieldStatus.triggerType}</strong> detected in {shieldStatus.zone}.
                Your claim is being processed automatically. No action needed!
              </>
            ) : (
              <>
                <strong>High risk conditions</strong> detected in {shieldStatus.zone || 'your area'}.
                Monitor weather and stay safe. Your coverage is ready.
              </>
            )}
          </AlertDescription>
        </div>

        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold",
          isActiveTrigger
            ? "bg-red-600 text-white"
            : "bg-amber-600 text-white"
        )}>
          {isActiveTrigger ? "CLAIM ACTIVE" : "HIGH RISK"}
        </div>
      </div>

      {/* Pulse effect overlay */}
      <div className={cn(
        "absolute inset-0 opacity-20 animate-pulse",
        isActiveTrigger
          ? "bg-gradient-to-r from-red-400 to-red-600"
          : "bg-gradient-to-r from-amber-400 to-amber-600"
      )} />
    </Alert>
  )
}