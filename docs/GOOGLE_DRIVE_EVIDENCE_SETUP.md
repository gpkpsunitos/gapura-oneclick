# Google Drive Evidence Setup

## 1. Choose Drive Authentication Mode

Use one mode:

- `oauth`: recommended when the evidence folder is inside a personal **My Drive**.
- `service_account`: recommended only when the evidence folder is inside a Google Workspace **Shared Drive**.

Google Sheets can continue using the existing service account credentials independently.

## 2. Enable Google Drive API

1. Open Google Cloud Console for the OAuth project.
2. Enable **Google Drive API**.
3. Keep existing **Google Sheets API** enabled.

## 3. Configure Personal My Drive OAuth

1. Configure an OAuth consent screen in Google Auth Platform.
2. Add the account that owns the evidence folder as a test user while the app is in **Testing** mode.
3. Add the `https://www.googleapis.com/auth/drive.file` scope.
4. Create a **Web application** OAuth client.
5. Add this redirect URI:

```text
https://developers.google.com/oauthplayground
```

6. Use OAuth 2.0 Playground with **Use your own OAuth credentials** enabled.
7. Authorize the `https://www.googleapis.com/auth/drive.file` scope with the storage account.
8. Exchange the authorization code and save the refresh token in deployment secrets.

Do not expose the client secret or refresh token to the browser. If the OAuth consent screen stays in **Testing**, refresh tokens expire after seven days. Switch the app to **In production** for stable operation.

## 4. Set Environment Variables

Add these server-side env vars in local `.env` and deployment for personal My Drive:

```bash
GOOGLE_DRIVE_AUTH_MODE=oauth
GOOGLE_DRIVE_OAUTH_CLIENT_ID=<oauth-client-id>
GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=<oauth-refresh-token>
GOOGLE_DRIVE_EVIDENCE_FOLDER_ID=<oauth-created-folder-id>
GOOGLE_DRIVE_EVIDENCE_CREATE_SUBFOLDERS=true
```

Existing Google service account vars remain required when Google Sheets still uses them:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=<spreadsheet-id>
```

Do not prefix Drive vars with `NEXT_PUBLIC_`.

For Google Workspace Shared Drive instead, use:

```bash
GOOGLE_DRIVE_AUTH_MODE=service_account
```

Add `GOOGLE_SERVICE_ACCOUNT_EMAIL` as a **Content manager** on the Shared Drive.

## 5. Apply Database Migration

Run migration against Supabase:

```bash
supabase db push
```

Migration adds:

- `evidence_upload_sessions`
- `evidence_files`
- `reports.evidence_file_ids`
- `reports.evidence_submission_id`
- `reports_sync.evidence_file_ids`
- `reports_sync.evidence_submission_id`

## 6. Update Google Sheets Headers

Add optional columns to both report tabs (`NON CARGO`, `CGO`) if audit visibility is wanted:

```text
Evidence File IDs
Evidence Submission ID
```

Existing evidence links still write to:

```text
Upload Irregularity Photo
```

If optional columns are absent, app still writes Drive links to existing evidence column.

## 7. Verify

1. Restart app after env changes.
2. Submit Quick Access public report with reporter name/email and one image.
3. Confirm:
   - file appears under `IRRS Evidence/<year>/<month>/<station>/<submission_id>`
   - `evidence_files.status = linked`
   - Google Sheets evidence column contains Drive link
4. Submit internal report with one image and generated Word document.
5. Confirm Drive links open for intended Google users.

## 8. Operational Notes

- Public uploads are owned by `reporter_email`; if email matches `users.email`, ledger also stores `user_id`.
- Client never owns final URL authority; report submit validates `evidence_file_ids` against server ledger.
- If the Drive upload succeeds but Supabase ledger insert fails, the API deletes the newly uploaded Drive file.
- If report submit cannot link evidence metadata after writing Sheets, code deletes created sheet row as rollback.
- My Drive or Shared Drive permissions decide who can open links. Avoid `anyone with link` unless company policy requires it.
