# FetchQuest — hostel errands to Basti marketplace

FetchQuest connects a hostel resident who needs a small purchase with a classmate willing to collect it. The project owner reports that classmates such as Abhishek and Rudra sometimes cannot visit Basti marketplace because of work or poor health. The reported distance is around 1–1.5 km, and small online orders can involve inconvenient collection and disproportionate charges. These are the owner's initial observations, not completed interview evidence.

This repository includes the supplied React frontend, a new Node.js backend, and a CSV-based errand timing report. The report estimates typical observed trip duration so a potential runner can judge whether an errand fits their available time.

**Assignment status: incomplete until you add genuine fieldwork and submission evidence.** `data.csv` intentionally contains only a header. No observations, interview quotes, field photos, reflection, or historical commits have been invented. This extends an existing project; disclose that reuse and distinguish work done during the assignment. Confirm acceptability with the evaluator if their expectation is an entirely new build.

## Run locally

Requires Node.js 24 or later and npm. From this folder:

```powershell
npm install
Copy-Item .env.example .env
npm run server
```

In a second terminal:

```powershell
npm run dev
```

Open the Vite URL (normally http://localhost:5173). The backend listens on http://127.0.0.1:8000. Vite proxies `/api` and `/socket.io` to it. The default port 5173 must be free; otherwise update `APP_ORIGIN` to the actual frontend origin.

1. Register an account with a password of at least 10 characters.
2. In local development, open the verification link printed in the **backend terminal**. No actual email is sent without SMTP configuration.
3. Log in. Use a second account in another browser/private window to act as a runner.
4. Create a request, accept it as the runner, chat, and mark it complete as the requester.
5. Set `ADMIN_EMAIL` in `.env` **before registering that address** to enable administrator access after email verification.

SQLite data, avatar images, encrypted phone numbers, and session records persist in `runtime/fetchquest.sqlite`. The local phone encryption key is `runtime/phone.key`. Keep both private and back them up together. They are ignored by Git. Do not publish the database, keys, passwords, or private chat content as fieldwork evidence.

## Assignment output from data.csv

Collect at least 20 real entries yourself. Use the collection instructions in `ASSIGNMENT.md`. Preserve these exact columns:

```csv
observation_id,observed_at,place,route,category,duration_minutes,collection_note
```

- `observation_id`: your unique reference to one genuine observation.
- `observed_at`: actual timestamp with timezone, such as ISO format ending in `+05:30`.
- `place`: the real collection location.
- `route`: a consistent route/direction; do not combine one-way walks with full shopping round trips.
- `category`: a consistent errand type.
- `duration_minutes`: actual measured duration greater than 0, up to 1440 minutes.
- `collection_note`: how you personally measured it, including start/end points. Avoid medical details and private contact information.

Quote fields containing commas. Do not create fake requests or duplicate observations to reach 20 rows. The software checks format and count; it cannot establish authenticity.

```powershell
npm run report
npm run report -- data.csv --min-samples 5
npm run report -- data.csv --json
```

The report groups matching place, route and category, calculates their median observed duration, and shows the observed range and contributing observation IDs. Groups below the threshold (default 3) display **insufficient data**. A nonzero exit code means invalid input or fewer than 20 valid entries. Valid-group summaries may still appear to help inspect partial data; they do not mean the submission is ready.

The same report is available after login under **Errand timings** (`/fieldwork`). It rereads the server's CSV whenever refreshed. Set `MIN_ROUTE_SAMPLES` for the web report; the CLI uses its `--min-samples` argument.

### Current actual output

With the supplied header-only file, `npm run report` reports **0/0 valid observations**, no duration estimates, and exits with code 1. This is deliberately incomplete. After fieldwork, replace this paragraph with your actual run output and explain which decision it helped Abhishek or Rudra make. Add the three-minute recording link here after recording it yourself.

## Backend capabilities

- Email verification, password recovery, salted scrypt password hashes, expiring opaque sessions and logout.
- Create/list/accept/cancel/complete/delete requests with ownership and status checks. Only one runner can accept an open request.
- Profile updates, PNG/JPEG avatars (maximum 1 MB), and encrypted phone storage. The other participant's number is accessible only during an accepted request.
- Authenticated Socket.IO chat. The server derives sender identity from the session. Cancelling clears old chat before another runner can join; completed requests cannot send chat messages.
- One rating per participant per completed delivery.
- Administrator user management, suspensions, credential-checked appeals and aggregate counts.
- CSV timing report with explicit validation errors and minimum sample thresholds.

## What this gets wrong or cannot promise

- A median from a small local sample is not a delivery guarantee. Queues, route differences, weather and time of day may change duration. The minimum of 3 is a demo threshold, not statistical proof.
- Fieldwork timings are separate from app-generated activity. Creating an app request is not proof of an observed real trip.
- No payments, stock checks, runner availability guarantees, emergency delivery or automatic matching are implemented.
- Public open requests show the entered destination. Use a common pickup point rather than a private room number. Phone numbers stay private except during active delivery.
- Administrator financial figures sum entered estimated costs/tips for completed requests; they do not prove actual payments.
- The SQLite document store is intended for a small, **single-process** demo. Do not run multiple instances against the same file or deploy to ephemeral storage.
- Browser sessions are stored in localStorage to match the supplied frontend. A production service should further harden session storage, upload processing, abuse controls and retention policies.
- Email delivery requires working SMTP settings in production. The external provider must be configured separately.

## Tests and build

```powershell
npm test
npm run build
```

Tests use explicitly synthetic records and temporary databases only; these are not fieldwork data. They cover authentication, persistence, delivery authorization and state transitions, competing acceptance, privacy, password recovery, moderation, Socket.IO identity checks and malformed CSV input.

## Single-service hosting

Build the frontend with `npm run build`, then run `npm start`. The backend serves `dist` and the API on the same origin. Set `NODE_ENV=production`, `HOST=0.0.0.0`, `APP_ORIGIN` to the HTTPS public origin, `PHONE_ENCRYPTION_KEY` to a private random 32-byte hex key, and SMTP settings from `.env.example`. Mount a persistent volume at `DATA_DIR`; persist `FIELDWORK_CSV` there too if you will update it after deployment. Set `PORT` as required by the host. Keep one process/instance. No deployment has been performed.

The old Vercel configuration routed requests to a separate hard-coded backend and has been removed. This implementation uses one service; a frontend-only Vercel deploy will not run this backend.

See `ASSIGNMENT.md` for the remaining human work and submission requirements. Do not claim the assignment is complete merely because the backend runs.
