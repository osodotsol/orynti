# Phase 0 verification report

Date: 2026-11-20

Phase 0 verifies Firebase AI Logic hybrid inference (Chrome on-device Gemini Nano plus Gemini Developer API cloud) behind App Check. Nothing about document handling is verified here.

## Observed: static checks (run locally)

| Check | Result |
|---|---|
| `npm run lint` (oxlint) | pass, exit 0 |
| `tsc -b` type check | pass |
| `npm run build` (vite) | pass; the `FIREBASE_APPCHECK_DEBUG_TOKEN = true` assignment is absent from the production bundle |

## Observed: runtime tests (production deployment, desktop Chrome)

These results were reported from actual runs of the deployed app, with the fictional, non-sensitive prompts built into the app.

| Test | Status | inferenceSource | Elapsed | Notes |
|---|---|---|---|---|
| Firebase App Check | ok | n/a | n/a | Token obtained successfully |
| ONLY_ON_DEVICE | ok | `on_device` | 57316 ms | |
| ONLY_IN_CLOUD (`gemini-3.5-flash-lite`) | ok | `in_cloud` | 9264 ms | |
| PREFER_ON_DEVICE | ok | `on_device` | 72338 ms | Used the local model, so no fallback occurred in this test |
| PREFER_ON_DEVICE + WebP input | ok | `in_cloud` | 2766 ms | Verdict "GENUINE SDK FALLBACK to cloud"; result "Blue" |

## Fallback conclusion

- **Passed (observed):** with `PREFER_ON_DEVICE`, a text request ran on-device (`on_device`), while a request containing an inline `image/webp` part ran in the cloud (`in_cloud`). On-device inference supports only JPEG and PNG images, and the SDK itself chose the cloud path. The `inferenceSource` value is the SDK's own report, not simulated or mocked.
- **Not tested:** fallback when the on-device model itself is unavailable (for example Chrome flag disabled, model not downloaded, or unsupported hardware). The WebP test exercises the incompatible-request branch only, not the model-unavailable branch.

## Assumptions (not observed)

- The WebP fallback was caused by the unsupported image type. This follows from the SDK source and docs (`isOnDeviceRequest` rejects non-JPEG/PNG inline data) and from on-device being available in the adjacent PREFER_ON_DEVICE run; no SDK debug logging was captured to confirm the rejection reason.
- Elapsed times are single runs. On-device times may include model initialization and are not a benchmark.

## Limitations

- No document masking is verified. No document features exist in Phase 0.
- No sensitive-data leakage audit has been performed. Cloud tests used only fictional prompts and a generated solid-colour image; this says nothing about how real documents would be handled.
- Local inference performance remains variable: on-device runs took 57 to 72 seconds here versus 2.8 to 9.3 seconds in the cloud, and results will vary with hardware, model download state and Chrome version.
- Results come from one environment (desktop Chrome, one machine, one deployment). Other browsers and devices are untested.

## Sources followed

- Hybrid get-started and configuration-options docs: `firebase/ai` v13, `getAI` + `GoogleAIBackend`, `InferenceMode`, `initializeDeviceModel()` on user gesture, `response.inferenceSource`, default cloud model `gemini-3.5-flash-lite`.
- App Check debug provider doc: `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, token registered in Console (localhost development only).
- Production App Check uses reCAPTCHA Enterprise (Fraud Defense).
