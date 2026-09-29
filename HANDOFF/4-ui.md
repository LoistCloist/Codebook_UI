# Agent 4: Participant UI handoff

## Done
- `src/app/layout.tsx`: skip link, header with a "Sign out" button (shown only when a session exists), `<main id="main">` in a `max-w-2xl` column, and a footer with the researcher contact. Metadata uses a title template, and the pages are `noindex`.
- `src/app/globals.css`: Tailwind 4 `@theme` tokens (neutral light palette with AA contrast pairs noted in the file), a system font stack (no web fonts), a global `:focus-visible` outline and reduced-motion handling.
- `src/app/page.tsx` (landing/consent):
  - Consent copy from `study.consent`: purpose, time, anonymity, right to stop, 18+ eligibility and contact.
  - Required checkbox `name="consent"`, in a `<form action={consentAndSignIn}>`.
  - `?error=consent` shows a focused error summary linking to the checkbox. Any other `?error=` value gets a generic message.
  - A participant whose step isn't `consent` is redirected to their step.
- `src/app/(study)/demographics/page.tsx`: radio groups for age, drives and coursework, plus a native country `<select>` with "Prefer not to say" first. POSTs to `/api/demographics`.
- `src/app/(study)/primer/page.tsx`: the two primer paragraphs and the two-question comprehension form. It POSTs `{answers:[v1,v2]}` (option values) to `/api/comprehension`.
- `src/app/(study)/scenario/page.tsx`:
  - Calls `serveCurrentScenario(participant.id)` and shows "Scenario {position+1} of {total}" with a progress bar.
  - Renders the title and text, plus an optional `next/image` (`fill` in a 16:9 box, `object-contain`).
  - The U and K questions appear in `questionOrder`. Own-choice and confidence (1–5) appear only when their flags are on.
  - POSTs `{scenarioId, utilitarian, kantian, own?, confidence?}` to `/api/responses`. The form is keyed by scenario id.
- `src/app/(study)/debrief/page.tsx` and `completed/page.tsx`: both require step `completed`. They show thanks, the explanation and the contact, and never the answer key.
- `src/components/`:
  - `server/require-step.ts` (server-only page guard):
    - Calls `connection()` and then `getCurrentParticipant()`.
    - No participant: redirect to `/`.
    - Step path not in the allowed list: redirect to the step path.
  - `server/session-bar.tsx`: sign-out form, rendered only if `getParticipantHash()` returns a value.
  - `ui/radio-group.tsx`: fieldset and legend, full-row labels at least 44px tall, `aria-invalid`/`aria-describedby`, and inline errors.
  - `ui/error-summary.tsx` (client): takes focus whenever its contents change. Its links focus the first radio of the matching field.
  - `ui/submit-button.tsx`, `ui/progress.tsx`, `ui/page-heading.tsx`.
  - `forms/use-post-json.ts` (client hook): POSTs JSON with `Content-Type: application/json` and a same-origin fetch. Responses are handled as follows:
    - `ok`: goes to `next` with `router.replace`, or `router.refresh()` when `next` equals the current path, as with `/scenario` → next scenario.
    - An error with `next`: goes to `next` the same way.
    - 401: `/`.
    - 403 `bad_origin`: message asking the participant to reload.
    - Other 403, and 409: message, then `router.refresh()` so the guard redirects.
    - 422: message.
    - 429: message with a wait time from `retryAfterSec` in the body or the `Retry-After` header.
    - Network, 415 and any other status: generic message.
    - Only `next` values that are paths starting with `/` (not `//`) are followed.
  - `forms/{demographics,comprehension,scenario}-form.tsx`: client forms with `noValidate`. They validate on the client (the zod schemas or the `Choice` enum) and show a focusable error summary. They import only `@/config/study`, `@/config/countries`, `@/lib/schemas` and the components.

## Not done
- There are no UI unit or E2E tests, since the brief didn't ask for them. I couldn't check the pages at runtime because they call Agent 2 and Agent 3 stubs. Typecheck and build pass.
- There is no `error.tsx` or `not-found.tsx`. They aren't in my ownership list.

## Decisions made
1. Signed in but `getCurrentParticipant()` returns null (for example, an expired consent cookie): the participant is sent to `/` to consent again.
2. Every participant page (and the layout's session bar) calls `await connection()`, so it's always rendered per request and never prerendered. Pages are `ƒ (Dynamic)` in the build.
3. The layout calls `getParticipantHash()` unguarded. Until Agent 2's implementation is merged, every page errors at runtime. That is expected.
4. Image alt text is `(s as {imageAlt?: string}).imageAlt ?? s.title` (see Requested changes).
5. `/debrief` is reachable by any participant whose step is `completed`, including on a later visit. That's harmless, since it shows only static thank-you text. Returning participants are routed to `/completed` by `/study`.
6. The final scenario's button reads "Save and finish". The scenario page shows "Answers are final once saved."
7. There's no sign-out on the consent form. Sign-out appears only in the header, and only when a session exists.

## Requested changes
- **Agent 6 → `src/lib/scenarios.ts`:** add optional `imageAlt: z.string().trim().min(1).optional()` to `ScenarioSchema`. Pass it through in `PublicScenario` and `toPublicScenario`, and document it in the README scenario schema. The user approved this. The scenario page already reads it without a type error, before and after the change.
- **Agent 2:** `consentAndSignIn` should read the checkbox field `consent` and redirect to `/?error=consent` when it's missing. This is already agreed. Any other error code shows a generic message.
- **Agent 3:**
  - The API response shape `{ok, next}` / `{ok:false, error, next?}` is as agreed.
  - `/api/responses` should return `next: "/debrief"` after the last scenario, and `next: "/scenario"` otherwise. The UI refreshes in place for the latter.
  - A 429 may include `retryAfterSec` in the body or a `Retry-After` header.

## How to verify
```bash
export PATH=/home/zarni/.nvm/versions/node/v22.23.3/bin:$PATH
npm run typecheck && npm test && npm run lint && npm run build
grep -rl "answerKey\|COMPREHENSION_CORRECT\|comprehension-answers" .next/static   # expect no output
```
After merging with Agents 2 and 3, run `npm run dev` and walk the flow at 360px width. Check each of these:
1. Submitting without ticking consent shows the error summary.
2. Google sign-in lands on `/study`, which redirects to `/demographics`.
3. The primer leads to the scenarios, which show "Scenario 1 of N".
4. After the last scenario you reach `/debrief`.
5. Signing in again lands on `/completed`.
6. Tab through each page: focus is always visible, and a submit with missing answers focuses the error summary.
