const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

const runtimeApiBaseUrl =
  typeof window !== 'undefined' ? window.__APP_CONFIG__?.apiBaseUrl : undefined

export const apiBaseUrl = trimTrailingSlash(
  runtimeApiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api'
)
