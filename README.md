# FetchQuest — hostel errands to Basti marketplace

FetchQuest connects a hostel resident who needs a small purchase with a classmate willing to collect it from Basti marketplace. Aman Kumar collected observations at the Hostel K gate on 17 November 2026. The primary beneficiary is Abhishek, a classmate who described needing a lab notebook but being unable to make the trip; the friends he asked were busy. His interview also describes collecting online orders at the main gate and additional charges for small baskets. These are participant-reported experiences, not independently verified delivery-platform policies. The reported marketplace distance is around 1–1.5 km.

This repository includes the supplied React frontend, a new Node.js backend, and a CSV-based errand timing report. The report estimates typical observed trip duration so a potential runner can judge whether an errand fits their available time.

The repository contains [20 recorded trips](data.csv), [fieldwork notes](fieldwork.md), and [two field photos](fieldwork-photos/). The CSV passes the report's format and minimum-row-count checks. The collector confirms the entries are personally recorded hostel-departure-to-hostel-return trips after visiting Basti marketplace; software validation does not independently verify their authenticity.

This extends an existing React frontend. AI assisted with the backend, report, documentation and data formatting. The existing work and AI assistance should be disclosed separately from work completed during the assignment window. The demonstration recording is linked below. The personally written reflection and actual AI chat exports still need to be added before final submission.

## Run locally

Requires Node.js 24 or later and npm. From this folder:

```powershell
npm.cmd install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run server
```

In a second terminal:

```powershell
npm.cmd run dev
```

Open the Vite URL (normally http://localhost:5173). The backend listens on http://127.0.0.1:8000. Vite proxies `/api` and `/socket.io` to it. The default port 5173 must be free; otherwise update `APP_ORIGIN` to the actual frontend origin.

1. Register an account with a password of at least 10 characters.
2. In local development, open the verification link printed in the **backend terminal**. No actual email is sent without SMTP configuration.
3. Log in. Use a second account in another browser/private window to act as a runner.
4. Create a request, accept it as the runner, chat, and mark it complete as the requester.
5. Set `ADMIN_EMAIL` in `.env` **before registering that address** to enable administrator access after email verification.

SQLite data, avatar images, encrypted phone numbers, and session records persist in `runtime/fetchquest.sqlite`. The local phone encryption key is `runtime/phone.key`. Keep both private and back them up together. They are ignored by Git. Do not publish the database, keys, passwords, or private chat content as fieldwork evidence.

## Assignment output from data.csv

The current dataset contains 20 observations dated **17 November 2026**, with timestamps in **IST (+05:30)**. Recorded departures run from **2:30 PM to 11:05 PM**, and the last recorded return is **11:27 PM**. Durations range from **19 to 45 minutes**. There are **7 walking trips, 7 cycle trips and 6 auto trips**; travel mode is retained in the route label so these are not pooled into one estimate.

Each row contains the departure timestamp, route/mode, purchase category, calculated elapsed minutes, and notes preserving departure/return times and the collector's original delay description. “Stationary” was corrected to “stationery”; “snacks” and “packaged snacks” remain separate categories. The notes describe phone-based timing as approximate. Use the raw notes to interpret the numbers, rather than treating them as precise controlled measurements.

The exact CSV columns are:

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

Running `npm.cmd run report` against the current `data.csv` produces the following output and exits with code **0**:

```text
FetchQuest observed errand timing report
Valid observations: 20/20. Required for assignment: at least 20.
Minimum samples per place / route / category: 3.
hostel | main path - foot | stationery: 40 minutes (median); n=3; observed range 30–41 minutes; observations OBS001, OBS004, OBS016
hostel | main path - cycle | food: insufficient data; n=2; observed range 20–23 minutes; observations OBS002, OBS011
hostel | main path - foot | print: insufficient data; n=2; observed range 44–45 minutes; observations OBS003, OBS007
hostel | back gate - cycle | food: insufficient data; n=2; observed range 20–21 minutes; observations OBS005, OBS017
hostel | main road - auto | groceries: insufficient data; n=2; observed range 20–21 minutes; observations OBS006, OBS018
hostel | main road - auto | dinner: insufficient data; n=2; observed range 21–22 minutes; observations OBS009, OBS015
hostel | main path - cycle | snacks: insufficient data; n=1; observed range 22–22 minutes; observations OBS008
hostel | back gate - foot | print: insufficient data; n=1; observed range 40–40 minutes; observations OBS010
hostel | main road - auto | print: insufficient data; n=1; observed range 19–19 minutes; observations OBS012
hostel | short cut - cycle | packaged snacks: insufficient data; n=1; observed range 21–21 minutes; observations OBS013
hostel | main road - auto | pharmacy: insufficient data; n=1; observed range 22–22 minutes; observations OBS014
hostel | short cut - foot | print: insufficient data; n=1; observed range 30–30 minutes; observations OBS019
hostel | main path - cycle | dinner: insufficient data; n=1; observed range 22–22 minutes; observations OBS020
These are observed trip durations, not guaranteed delivery times. Small samples and different traffic, queues, weather or time of day can change the result. Row count does not verify genuine fieldwork or assignment compliance.
```

### How to use this result

For a stationery errand on foot via the main path, the three observed trips took **41, 30 and 40 minutes**, giving a **40-minute median**. A potential runner with only 20 minutes available can use that evidence to question whether they have enough time for a comparable errand. This is an intended use, not a claim that a participant actually made that decision or that FetchQuest saved time or money.

There are **13 distinct place/route/category groups**. Only the stationery group reaches the default minimum of three observations; the other **12 groups** correctly show insufficient data. Increasing the threshold to five makes every group insufficient. Collect more comparable trips instead of lowering the threshold simply to obtain more estimates.

### Fieldwork evidence and demonstration

- [Fieldwork notes and interview](fieldwork.md): the collector's account of the visit, conversation, collection method and photos.
- [Photo 1](fieldwork-photos/photo-01.jpeg): Rudra Ranjan holding Maggi, reported by the collector as taken at 8:43 PM IST on 17 November 2026.
- [Photo 2](fieldwork-photos/photo-02.jpeg): Prateek holding medicine, reported by the collector as taken at 8:50 PM IST on 17 November 2026.
- The collector confirms both people agreed to public GitHub use of the photos. The supplied WhatsApp copies contain no detected capture timestamps; the times above are collector-reported, not independently verified photo metadata. The photos alone do not demonstrate an app-mediated delivery.
- **Screen recording:** [Watch the FetchQuest demonstration on Google Drive](https://drive.google.com/file/d/1lGaUjHYLH0xo3QHuFA6zRzt8hCEvkKGz/view?usp=sharing).

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
- The dataset covers one evening, includes approximate phone timings, and has only 1–3 entries per group. It cannot support reliable predictions across days or establish that one travel mode is faster than another.
- Trip durations cover the full reported errand, including shopping and any waits, rather than walking time alone. Notes such as “fast,” “nothing” and “delayed” do not quantify causes. Preserve them as descriptions rather than inventing reasons for differences.
- No actual fare, basket-price or platform-fee columns were collected, so the report cannot calculate savings or prove FetchQuest is cheaper than online ordering.
- Fieldwork timings are separate from app-generated activity. Creating an app request is not proof of an observed real trip.
- No payments, stock checks, runner availability guarantees, emergency delivery or automatic matching are implemented.
- Public open requests show the entered destination. Use a common pickup point rather than a private room number. Phone numbers stay private except during active delivery.
- Administrator financial figures sum entered estimated costs/tips for completed requests; they do not prove actual payments.
- The SQLite document store is intended for a small, **single-process** demo. Do not run multiple instances against the same file or deploy to ephemeral storage.
- Browser sessions are stored in localStorage to match the supplied frontend. A production service should further harden session storage, upload processing, abuse controls and retention policies.
- Email delivery requires working SMTP settings in production. The external provider must be configured separately.

## Tests and build

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run report
```

