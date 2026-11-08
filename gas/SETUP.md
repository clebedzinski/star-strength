# SIC bug-report receiver — owner setup

This is not deployed. The app will keep saying **not configured** until you finish these steps and a real submission returns `{ "ok": true, "id": "..." }`.

No billing account. No paid Google plan. Use the normal consumer Google account that should own the reports.

## What you do

1. Open Google Sheets and create a private spreadsheet named `SIC bug reports`. Do not share it publicly. Anyone with the link is still more open than it needs to be; keep it private to your account.
2. Extensions → Apps Script. Replace the default script with the full contents of `gas/Code.gs` in this repository.
3. Save. Deploy → New deployment → type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize the script when Google asks. Copy the URL that ends in `/exec`.
5. In the SIC app, open Settings → Console & privacy, and paste that `/exec` URL into the bug endpoint field if the build you are running exposes it. Otherwise set `bugReportEndpoint` in `js/sic-config.js` to that URL and leave `bugReportVerified` false.
6. Submit one real report from the app. The app may follow the Apps Script redirect to `script.googleusercontent.com`. It shows **Submitted** only when the response body parses as `{ "ok": true, "id": "<the same report id>" }`.
7. Open the private Sheet. The row should be there, including the same id. Only after that check may you treat bug reports as working.

## If you cannot deploy yet

That is a hard dependency on the owner Google account. The client, the script, and this checklist are the deliverable. Reports stay on the device with a stable id. Do not describe the feature as live.

## Limits

- Message cap: 4 KB. Honeypot field `company` must be empty.
- Server cap: 200 accepted new reports per UTC day, then `{ "ok": false, "error": "daily-cap" }`.
- The same report id is acknowledged again and does not add a second row.
- Apps Script consumer quotas can change and can still block the script before this cap. The app then says the report was not confirmed and keeps the local copy.
- The `/exec` URL is public. There is no client secret. Do not add one.
- Google processes request metadata. The UI says that. Workout history is not attached. Diagnostics are included only when the person checks the box and can see the preview first.
