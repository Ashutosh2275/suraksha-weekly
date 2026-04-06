'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

const PREDEFINED_RESPONSES = [
  {
    keywords: ['weather', 'rain', 'trigger', 'event'],
    response: "I can help you track weather events! Right now, there are no active triggers in your coverage zones. You'll get automatic notifications when weather conditions meet our payout criteria."
  },
  {
    keywords: ['payout', 'payment', 'money', 'claim'],
    response: "Your payouts are processed automatically when weather triggers occur! No claim forms needed. Payments typically arrive within 30 minutes of trigger confirmation. You can view all payouts in the Payouts tab."
  },
  {
    keywords: ['coverage', 'zone', 'area'],
    response: "Your current coverage includes 3 zones around Mumbai. Coverage is active until April 30th, 2026. You can update your zones in Settings → Coverage Zones."
  },
  {
    keywords: ['help', 'support', 'problem'],
    response: "I'm here to help! You can ask me about:\n• Weather alerts & payouts\n• Coverage zones\n• Account settings\n• Technical issues\n\nFor complex issues, visit Settings → Contact Support."
  },
  {
    keywords: ['hi', 'hello', 'hey'],
    response: "Hello! 👋 I'm your Suraksha assistant. I can help you with weather alerts, payouts, coverage details, and more. What would you like to know?"
  }
]

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi there! I'm your Suraksha assistant. I can help you with weather alerts, payouts, and coverage questions. What would you like to know?",
      isBot: true,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateBotResponse = (userText: string): string => {
    const lowercaseText = userText.toLowerCase()
    
    for (const response of PREDEFINED_RESPONSES) {
      if (response.keywords.some(keyword => lowercaseText.includes(keyword))) {
        return response.response
      }
    }
    
    return "I understand you're asking about that. For detailed assistance with specific issues, I recommend checking our Help section in Settings or contacting our support team directly."
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsTyping(true)

    // Simulate bot typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    const botResponse = generateBotResponse(inputText)
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      isBot: true,
      timestamp: new Date()
    }

    setIsTyping(false)
    setMessages(prev => [...prev, botMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickActions = [
    "Check weather alerts",
    "View my coverage",
    "Recent payouts",
    "How payouts work"
  ]

  return (
    <div className="min-h-screen bg-surface-page flex flex-col">
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold font-sora">Assistant</h1>
                <p className="text-xs text-text-muted">Always here to help</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-4 flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[80%] flex gap-2 ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                {message.isBot && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">🤖</span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.isBot
                      ? 'bg-white border border-border-default'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.isBot ? 'text-text-muted' : 'text-indigo-100'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex justify-start"
          >
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div className="bg-white border border-border-default rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="w-2 h-2 rounded-full bg-text-muted"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: dot * 0.2
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-text-muted mb-3">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => setInputText(action)}
                className="px-3 py-2 text-sm bg-surface-muted rounded-full border border-border-default hover:bg-surface-card transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-border-default p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-border-default focus:border-indigo-600 focus:outline-none resize-none"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="px-4 py-3 rounded-2xl"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M18 2L9 11M18 2l-7 16-2-7-7-2L18 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}