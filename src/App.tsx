import { useState } from 'react'
import type { Part } from 'firebase/ai'
import { CLOUD_MODEL, checkAppCheck, makeModel, missingEnv, type ModeName } from './firebase'

// Fictional, non-sensitive prompt used for every test.
const PROMPT = 'In one sentence, describe a fictional lighthouse keeper named Mira.'

// Fallback test input: a solid-colour WebP drawn in the browser (fictional, no real data).
// On-device inference only accepts JPEG/PNG images, so the SDK itself should route this to the cloud.
async function makeWebpPart(): Promise<[string, Part]> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#1e66f5'
  ctx.fillRect(0, 0, 64, 64)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp'))
  if (!blob || blob.type !== 'image/webp') throw new Error('Browser could not encode image/webp')
  const data = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())))
  return ['Name the dominant colour of this fictional swatch in one word.', { type: 'inlineData', inlineData: { data, mimeType: 'image/webp' } }]
}

const FALLBACK_KEY = 'FALLBACK_UNSUPPORTED_INPUT'

type Result = {
  status: 'idle' | 'running' | 'ok' | 'error'
  source?: string
  text?: string
  error?: string
  ms?: number
  note?: string
}

const TESTS: { mode: ModeName; label: string; hint: string }[] = [
  { mode: 'ONLY_ON_DEVICE', label: 'ON_DEVICE only', hint: 'Fails if Gemini Nano is unavailable. May wait minutes for the model download.' },
  { mode: 'ONLY_IN_CLOUD', label: `IN_CLOUD only (${CLOUD_MODEL})`, hint: 'Gemini Developer API via Firebase AI Logic.' },
  { mode: 'PREFER_ON_DEVICE', label: 'PREFER_ON_DEVICE', hint: 'On-device if available, otherwise falls back to cloud.' },
]

const FALLBACK_TEST = {
  label: 'PREFER_ON_DEVICE + WebP input (fallback test)',
  hint: 'Real SDK fallback, not a simulation: on-device rejects WebP, so inferenceSource should be in_cloud. Run PREFER_ON_DEVICE first; it should show on_device.',
}

export default function App() {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [appCheck, setAppCheck] = useState('not checked')

  const set = (k: string, r: Result) => setResults((p) => ({ ...p, [k]: r }))

  async function run(mode: ModeName, key: string = mode, buildInput?: () => Promise<[string, Part]>) {
    set(key, { status: 'running' })
    const t0 = performance.now()
    try {
      const model = makeModel(mode)
      if (mode !== 'ONLY_IN_CLOUD') {
        // Must run from a user gesture (this click) and before generateContent.
        const init = model.initializeDeviceModel((v) =>
          set(key, { status: 'running', note: `Model download ${(v * 100).toFixed(1)}%` }),
        )
        if (mode === 'ONLY_ON_DEVICE') await init
        else init.catch(() => {}) // PREFER_ON_DEVICE must not block; it falls back to cloud
      }
      const result = await model.generateContent(buildInput ? await buildInput() : PROMPT)
      set(key, {
        status: 'ok',
        source: String(result.response.inferenceSource ?? 'not reported'),
        text: result.response.text(),
        ms: Math.round(performance.now() - t0),
      })
    } catch (e) {
      const err = e as { name?: string; code?: string; message?: string }
      set(key, {
        status: 'error',
        error: [err.name, err.code, err.message].filter(Boolean).join(' | ') || String(e),
        ms: Math.round(performance.now() - t0),
      })
    }
  }

  async function runAppCheck() {
    try {
      setAppCheck(await checkAppCheck())
    } catch (e) {
      setAppCheck(`FAILED: ${(e as Error).message}`)
    }
  }

  const blocked = missingEnv.length > 0

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Orynti — Phase 0 hybrid AI check</h1>
      {blocked && (
        <p style={{ color: 'crimson' }}>
          Missing or placeholder values in .env.local: {missingEnv.join(', ')}. Copy .env.example and restart the dev server.
        </p>
      )}
      <p>
        Prompt (fictional): <em>{PROMPT}</em>
      </p>
      <section>
        <button onClick={runAppCheck} disabled={blocked}>
          Check App Check token
        </button>{' '}
        <span>{appCheck}</span>
      </section>
      {TESTS.map((t) => {
        const r = results[t.mode] ?? { status: 'idle' }
        return (
          <section key={t.mode} style={{ border: '1px solid #8884', borderRadius: 8, padding: 12, margin: '12px 0' }}>
            <button onClick={() => run(t.mode)} disabled={blocked || r.status === 'running'}>
              {t.label}
            </button>
            <small style={{ marginLeft: 8 }}>{t.hint}</small>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
              {`status: ${r.status}`}
              {r.note ? `\n${r.note}` : ''}
              {r.source ? `\ninferenceSource: ${r.source}` : ''}
              {r.ms !== undefined ? `\nelapsed: ${r.ms} ms` : ''}
              {r.text ? `\nresult: ${r.text}` : ''}
              {r.error ? `\nerror: ${r.error}` : ''}
            </pre>
          </section>
        )
      })}
      {(() => {
        const r = results[FALLBACK_KEY] ?? { status: 'idle' }
        return (
          <section style={{ border: '1px dashed #8886', borderRadius: 8, padding: 12, margin: '12px 0' }}>
            <button onClick={() => run('PREFER_ON_DEVICE', FALLBACK_KEY, makeWebpPart)} disabled={blocked || r.status === 'running'}>
              {FALLBACK_TEST.label}
            </button>
            <small style={{ marginLeft: 8 }}>{FALLBACK_TEST.hint}</small>
            <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
              {`status: ${r.status}`}
              {r.source ? `\ninferenceSource: ${r.source}  (expected: in_cloud)` : ''}
              {r.source ? `\nfallback verdict: ${r.source === 'in_cloud' ? 'GENUINE SDK FALLBACK to cloud' : 'no fallback occurred'}` : ''}
              {r.ms !== undefined ? `\nelapsed: ${r.ms} ms` : ''}
              {r.text ? `\nresult: ${r.text}` : ''}
              {r.error ? `\nerror: ${r.error}` : ''}
            </pre>
          </section>
        )
      })()}
    </main>
  )
}
