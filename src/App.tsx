import { useState } from 'react'
import { CLOUD_MODEL, checkAppCheck, makeModel, missingEnv, type ModeName } from './firebase'

// Fictional, non-sensitive prompt used for every test.
const PROMPT = 'In one sentence, describe a fictional lighthouse keeper named Mira.'

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

export default function App() {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [appCheck, setAppCheck] = useState('not checked')

  const set = (k: string, r: Result) => setResults((p) => ({ ...p, [k]: r }))

  async function run(mode: ModeName) {
    set(mode, { status: 'running' })
    const t0 = performance.now()
    try {
      const model = makeModel(mode)
      if (mode !== 'ONLY_IN_CLOUD') {
        // Must run from a user gesture (this click) and before generateContent.
        const init = model.initializeDeviceModel((v) =>
          set(mode, { status: 'running', note: `Model download ${(v * 100).toFixed(1)}%` }),
        )
        if (mode === 'ONLY_ON_DEVICE') await init
        else init.catch(() => {}) // PREFER_ON_DEVICE must not block; it falls back to cloud
      }
      const result = await model.generateContent(PROMPT)
      set(mode, {
        status: 'ok',
        source: String(result.response.inferenceSource ?? 'not reported'),
        text: result.response.text(),
        ms: Math.round(performance.now() - t0),
      })
    } catch (e) {
      const err = e as { name?: string; code?: string; message?: string }
      set(mode, {
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
    </main>
  )
}
