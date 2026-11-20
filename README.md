# Orynti — Phase 0 hybrid AI verification

Minimal Vite + React + TypeScript app that checks Firebase AI Logic hybrid inference (Chrome on-device Gemini Nano + Gemini Developer API cloud) behind App Check. No document features, no database, no deploy.

## Status

Phase 0 only. Static checks (lint, type check, production build) pass. **Runtime tests are still pending**: the ON_DEVICE, IN_CLOUD and PREFER_ON_DEVICE tests and the App Check token check have not been run yet. Results will be recorded in [VERIFICATION.md](VERIFICATION.md).

## Run it

1. `npm install`
2. `cp .env.example .env.local` and fill in the values from Firebase console > Project settings > Your apps > Orynti Web. Also set `VITE_APPCHECK_RECAPTCHA_SITE_KEY` (see manual steps).
3. `npm run dev`, then open http://localhost:5173 in **desktop Chrome 139+**.
4. Open DevTools > Console. Copy the line `AppCheck debug token: "..."` and register it (manual step 3). Never commit it.
5. For on-device tests, enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, restart Chrome, and (optionally) pre-download the model by running `await LanguageModel.create()` in the console.
6. Click **Check App Check token**, then the three test buttons.

## Manual Console actions (required, cannot be done from code)

1. **AI Logic**: Firebase console > AI Services > AI Logic > Get started, choose **Gemini Developer API** (no billing needed). This also enforces App Check for AI Logic.
2. **App Check app registration**: Security > App Check > Apps > register Orynti Web with **reCAPTCHA Enterprise** (create the site key in Google Cloud/reCAPTCHA; put the public site key in `.env.local`). Do not add `localhost` to reCAPTCHA allowed domains.
3. **Debug token**: App Check > Apps > Orynti Web > overflow menu > **Manage debug tokens**, add the token printed in the console.

## Files

- `src/firebase.ts` — config from env, App Check (debug mode only when `DEV` and host is localhost/127.0.0.1), model factory.
- `src/App.tsx` — status page with three tests; shows `inferenceSource`, result, timing and errors.

## License

Apache-2.0. See [LICENSE](LICENSE).
