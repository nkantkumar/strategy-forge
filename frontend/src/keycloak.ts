import Keycloak from 'keycloak-js'

// Use type assertion so this compiles with tsc when Vite client types aren't resolved (e.g. Docker build)
const env = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, string | undefined>
const url = env.VITE_KEYCLOAK_URL
const realm = env.VITE_KEYCLOAK_REALM
const clientId = env.VITE_KEYCLOAK_CLIENT_ID

const isConfigured = Boolean(url && realm && clientId)

let keycloakInstance: Keycloak | null = null

export function isKeycloakEnabled(): boolean {
  return isConfigured
}

/**
 * Initialize Keycloak. Call once before rendering the app.
 * When configured, uses onLoad: 'login-required' so unauthenticated users are redirected to login.
 */
export async function initKeycloak(): Promise<Keycloak | null> {
  if (!url || !realm || !clientId) return null
  const k = new Keycloak({ url, realm, clientId })
  try {
    await k.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    })
    keycloakInstance = k
    return k
  } catch (e) {
    console.error('Keycloak init failed', e)
    return null
  }
}

/**
 * Return current access token, refreshing if needed (min 30s validity).
 * Returns null if Keycloak is not configured or not initialized.
 */
export async function getToken(): Promise<string | null> {
  if (!keycloakInstance) return null
  try {
    const refreshed = await keycloakInstance.updateToken(30)
    if (refreshed && keycloakInstance.token) {
      return keycloakInstance.token
    }
    return keycloakInstance.token ?? null
  } catch {
    return null
  }
}

export function getKeycloakInstance(): Keycloak | null {
  return keycloakInstance
}

export function logout(): void {
  if (keycloakInstance) {
    keycloakInstance.logout()
  }
}
