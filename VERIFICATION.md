# Phase 0 verification report

Date: 2026-11-19

## Static checks (actually run)

| Check | Result |
|---|---|
| `npm run lint` (oxlint) | pass, exit 0 |
| `tsc -b` type check | pass |
| `npm run build` (vite) | pass; the `FIREBASE_APPCHECK_DEBUG_TOKEN = true` assignment is absent from the production bundle |

## Runtime tests: NOT RUN

The three hybrid tests (ON_DEVICE only, IN_CLOUD only, PREFER_ON_DEVICE) and the App Check token check have **not** been executed. They need your Firebase web config, the Console steps in README.md, and a desktop Chrome session with Gemini Nano. Do not treat them as passed.

Record results here after running:

| Test | inferenceSource | Result / error |
|---|---|---|
| App Check token | n/a | |
| ONLY_ON_DEVICE | | |
| ONLY_IN_CLOUD (gemini-3.5-flash-lite) | | |
| PREFER_ON_DEVICE | | |

## Sources followed

- Hybrid get-started and configuration-options docs: `firebase/ai` v13, `getAI` + `GoogleAIBackend`, `InferenceMode`, `initializeDeviceModel()` on user gesture, `response.inferenceSource`, default cloud model `gemini-3.5-flash-lite`.
- App Check debug provider doc: `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, token registered in Console.
