'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Guard: the ! assertion only satisfies TypeScript — it does nothing at runtime.
    // Without this check, posthog.init(undefined!) runs if the env var is missing,
    // leaving PostHog in a broken state with no error thrown.
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set. Analytics will not initialize.')
      return
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/ingest',                 // proxy through your own domain — ad-blocker safe
      ui_host: 'https://us.posthog.com',   // PostHog dashboard (swap for eu.posthog.com if on EU cloud)
      person_profiles: 'identified_only',
      capture_pageview: false,             // handled manually in PostHogPageView.tsx
      capture_pageleave: true,
    })
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}