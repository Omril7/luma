'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAdminStore } from '@/stores/adminStore'
import { api } from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const { token, setAuth } = useAdminStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (token) router.replace('/admin')
  }, [token, router])

  // Focus email on mount
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // Announce error to screen readers
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('נא להזין כתובת דוא"ל')
      return
    }
    if (!password) {
      setError('נא להזין סיסמה')
      return
    }

    setLoading(true)
    try {
      const data = await api.post<{ token: string; email: string }>('/api/admin/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      })
      setAuth(data.token, data.email)
      router.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? 'אימייל או סיסמה שגויים' : 'שגיאה בהתחברות, נסו שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4" dir="rtl" lang="he">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-primary tracking-tight">Luma</span>
          <p className="mt-1 text-sm text-text-muted">פנל ניהול</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-lg border border-border shadow-soft p-8">
          <h1 className="text-xl font-bold text-text-main mb-6">כניסה לניהול</h1>

          {/* Error banner */}
          {error && (
            <motion.div
              ref={errorRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5 outline-none"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1.5">
                דוא&quot;ל
                <span aria-hidden="true" className="text-accent ms-0.5">
                  *
                </span>
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-shadow min-h-[44px]"
                placeholder="admin@luma.co.il"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-main mb-1.5">
                סיסמה
                <span aria-hidden="true" className="text-accent ms-0.5">
                  *
                </span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-bg ps-4 pe-11 py-2.5 text-sm text-text-main placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-shadow min-h-[44px]"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  className="absolute inset-y-0 start-3 flex items-center pe-3 text-text-muted hover:text-text-main transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-surface font-semibold text-sm py-3 rounded-lg hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 min-h-[44px] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>מתחבר...</span>
                </>
              ) : (
                'כניסה'
              )}
            </button>
          </form>
        </div>

        {/* Back to storefront */}
        <p className="text-center mt-6 text-xs text-text-muted">
          <Link
            href="/he"
            className="hover:text-text-main transition-colors underline underline-offset-2"
          >
            חזרה לאתר
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
