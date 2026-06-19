'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'

// Query params that must never be forwarded to analytics.
// These commonly carry tokens, credentials, or PII.
const SENSITIVE_PARAMS = new Set([
  'token',
  'code',
  'auth',
  'key',
  'secret',
  'password',
  'email',
  'reset_token',
  'access_token',
  'refresh_token',
  'id_token',
  'session',
  'api_key',
])

function sanitizeSearchParams(params: URLSearchParams): string {
  const safe = new URLSearchParams()
  params.forEach((value, key) => {
    if (!SENSITIVE_PARAMS.has(key.toLowerCase())) {
      safe.set(key, value)
    }
  })
  return safe.toString()
}

export default function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.location.origin + pathname
      const safeParams = sanitizeSearchParams(searchParams)
      if (safeParams) {
        url = url + '?' + safeParams
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, posthog])

  return null
}