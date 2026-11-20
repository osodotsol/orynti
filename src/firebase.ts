import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'firebase/app-check'
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai'

const env = import.meta.env
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_APPCHECK_RECAPTCHA_SITE_KEY',
] as const

export const missingEnv = required.filter((k) => !env[k] || String(env[k]).startsWith('your-'))

export const CLOUD_MODEL: string = env.VITE_CLOUD_MODEL || 'gemini-3.5-flash-lite'

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)

// Only constructed when config is present, so the UI can show a clear setup message otherwise.
const app =
  missingEnv.length === 0
    ? initializeApp({
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      })
    : null

if (app && import.meta.env.DEV && isLocalhost) {
  // Official debug provider: the SDK prints "AppCheck debug token: ..." in the browser console.
  // Register that token in Console > App Check > Apps > Manage debug tokens. Never commit it.
  const g = self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }
  g.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

const appCheck = app
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  : null

export async function checkAppCheck(): Promise<string> {
  if (!appCheck) throw new Error('Firebase not configured')
  await getToken(appCheck) // throws if the debug token is not registered or App Check fails
  return 'App Check token obtained'
}

export type ModeName = 'ONLY_ON_DEVICE' | 'ONLY_IN_CLOUD' | 'PREFER_ON_DEVICE'

export function makeModel(mode: ModeName) {
  if (!app) throw new Error('Firebase not configured')
  const ai = getAI(app, { backend: new GoogleAIBackend() })
  return getGenerativeModel(ai, {
    mode: InferenceMode[mode],
    inCloudParams: { model: CLOUD_MODEL },
  })
}
