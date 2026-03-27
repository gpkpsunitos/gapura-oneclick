# Google Sheets Webhook Bridge

Google Sheets tidak menyediakan webhook native untuk input row manual di UI. Implementasi di repo ini memakai Google Apps Script installable trigger yang memanggil endpoint aplikasi, lalu endpoint tersebut menjalankan sync yang sudah punya dedupe fingerprint.

## File Terkait

- `app/api/integrations/google-sheets/webhook/route.ts`
- `scripts/google-sheets-webhook.gs`
- `lib/services/sync-service.ts`

## Environment

Tambahkan secret bersama antara aplikasi dan Apps Script:

```env
GOOGLE_SHEETS_WEBHOOK_SECRET=replace-with-a-long-random-string
```

Setelah mengubah environment, restart server aplikasi.

## Endpoint

Apps Script harus mengirim `POST` ke:

```text
https://your-app.example.com/api/integrations/google-sheets/webhook
```

Header yang wajib:

```text
X-IRRS-Webhook-Secret: <GOOGLE_SHEETS_WEBHOOK_SECRET>
```

Payload minimal:

```json
{
  "triggerType": "ON_EDIT",
  "sheetName": "NON CARGO",
  "rowNumber": 12,
  "rowSignature": "..."
}
```

## Setup Apps Script

1. Buka spreadsheet Google Sheets.
2. Pilih `Extensions -> Apps Script`.
3. Buat project bound script pada spreadsheet tersebut.
4. Salin isi [scripts/google-sheets-webhook.gs](/Users/nrzngr/Desktop/gapura-irrs2/scripts/google-sheets-webhook.gs) ke editor Apps Script.
5. Ganti:
   - `IRRS_WEBHOOK_URL`
   - `IRRS_WEBHOOK_SECRET`
6. Jalankan `installIrrsWebhookTriggers()` satu kali dari editor Apps Script.
7. Saat diminta, approve permission untuk Spreadsheet, Triggers, Properties, dan external request.

## Cara Kerja

- Trigger yang dipasang adalah installable `onEdit`, bukan simple trigger.
- Hanya sheet `NON CARGO` dan `CGO` yang diproses.
- Header row di-skip.
- Row yang masih terlalu kosong di-skip dengan threshold `IRRS_MIN_NON_EMPTY_CELLS`.
- Edit beruntun pada row yang sama di-debounce selama `IRRS_DEBOUNCE_MS` sebelum webhook dikirim.
- Endpoint server langsung membalas `202 Accepted`, lalu menjalankan sync penuh di background.
- Concurrent trigger akan bergabung ke sync yang sedang berjalan.
- Email tetap hanya terkirim untuk fingerprint yang belum pernah dikirim sebelumnya.

## Manual Test

Di Apps Script editor, pilih row aktif lalu jalankan:

```javascript
testIrrsWebhookForActiveRow();
```

Atau panggil endpoint langsung dari terminal:

```bash
curl -X POST http://localhost:3000/api/integrations/google-sheets/webhook \
  -H 'Content-Type: application/json' \
  -H 'X-IRRS-Webhook-Secret: your-secret' \
  -d '{
    "triggerType": "ON_EDIT",
    "sheetName": "NON CARGO",
    "rowNumber": 2,
    "rowSignature": "manual-test"
  }'
```

## Catatan

- Ini tetap model "webhook bridge", bukan subscription native dari Google Sheets.
- Jika user mengedit row lama, trigger tetap bisa memanggil sync, tetapi notifier tidak mengirim email baru karena dedupe memakai `source_fingerprint`.
- Jika spreadsheet sangat sering diedit, pertimbangkan menaikkan `IRRS_DEBOUNCE_MS`.
