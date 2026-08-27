# Durable lead pipeline

```text
ProjectForm
  -> POST itwhite.ru/api/lead
  -> loopback POST 127.0.0.1:4323/api/lead-ingest
  -> one PostgreSQL transaction: leads + payload_jobs
  -> 202 Accepted
  -> Payload lead-delivery runner
      -> Bitrix24
      -> Telegram
```

`submissionId` is the idempotency key. It remains stable across a browser retry and changes only after a committed response. `requestCode` is a deterministic display value derived from that UUID.

The job input contains only the numeric lead ID. Personal data remains in the access-controlled `leads` and `lead-files` collections. Bitrix24 uses `ORIGINATOR_ID=ITWHITE_SITE` and the submission UUID as `ORIGIN_ID`; a retry searches for that pair before creating a lead. Telegram delivery is at-least-once and can rarely duplicate after an ambiguous provider timeout, so every message contains the stable submission ID.

Production is fail-closed. Missing intake configuration or a failed commit produces `503`, never a success response. Attachments are limited to 5 MB, decoded and signature-checked by both the public endpoint and the private intake endpoint, stored outside release directories, and never accepted as SVG or HTML.

Automatic forwarding of attachments remains disabled until malware scanning is available. A stored attachment is private and served with `Content-Disposition: attachment`; the text notification tells the operator to review it in the admin workspace.

Operational alerts should cover:

- public lead endpoint 5xx;
- oldest queued job over five minutes;
- any lead in `dead_letter`;
- PostgreSQL over 85 connections;
- disk over 85 percent;
- backup older than 26 hours.
