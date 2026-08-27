import { timingSafeEqual } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import type { Endpoint, PayloadRequest } from 'payload'

const MAX_BODY_BYTES = 8 * 1024 * 1024
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const allowedMimeTypes = new Set(['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'])

type UnknownRecord = Record<string, unknown>

class IntakeError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const text = (value: unknown, max: number, required = false) => {
  if (typeof value !== 'string') {
    if (required) throw new IntakeError(400, 'invalid_payload')
    return ''
  }
  const cleaned = value.trim()
  if ((required && !cleaned) || cleaned.length > max) throw new IntakeError(400, 'invalid_payload')
  return cleaned
}

const stringList = (value: unknown, maxItems: number, maxLength: number) => {
  if (!Array.isArray(value) || value.length > maxItems) throw new IntakeError(400, 'invalid_payload')
  return value.map((item) => text(item, maxLength, true))
}

const safeUTM = (value: unknown) => {
  let parsed: unknown = value
  if (typeof value === 'string' && value) {
    try { parsed = JSON.parse(value) } catch { throw new IntakeError(400, 'invalid_utm') }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const entries = Object.entries(parsed as UnknownRecord).slice(0, 20)
  return Object.fromEntries(entries.map(([key, item]) => [text(key, 80, true), text(item, 500)]))
}

const validSignature = (mimeType: string, data: Buffer) => {
  if (mimeType === 'application/pdf') return data.subarray(0, 5).toString('ascii') === '%PDF-'
  if (mimeType === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
  if (mimeType === 'image/png') return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/webp') return data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP'
  if (mimeType === 'text/plain') return !data.subarray(0, Math.min(data.length, 8192)).includes(0)
  return false
}

const authorized = (req: PayloadRequest) => {
  const expected = process.env.LEAD_INGEST_SECRET?.trim()
  const header = req.headers.get('authorization')
  if (!expected || expected.length < 32 || !header?.startsWith('Bearer ')) return false
  const supplied = header.slice(7)
  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

const parseAttachment = (value: unknown, submissionId: string) => {
  if (value === null || value === undefined) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new IntakeError(400, 'invalid_attachment')
  const record = value as UnknownRecord
  const mimeType = text(record.mimeType, 100, true)
  const originalName = path.basename(text(record.name, 180, true)).replace(/[^\p{L}\p{N}._ -]/gu, '_')
  const encoded = text(record.data, 7_100_000, true)
  const claimedSize = Number(record.size)
  if (!allowedMimeTypes.has(mimeType) || !Number.isInteger(claimedSize) || claimedSize <= 0 || claimedSize > MAX_ATTACHMENT_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new IntakeError(400, 'invalid_attachment')
  }
  const data = Buffer.from(encoded, 'base64')
  if (data.length !== claimedSize || data.length > MAX_ATTACHMENT_BYTES || !validSignature(mimeType, data)) throw new IntakeError(400, 'invalid_attachment')
  const extensions: Record<string, string> = {
    'application/pdf': '.pdf', 'text/plain': '.txt', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  }
  return { data, mimetype: mimeType, name: `${submissionId}${extensions[mimeType]}`, originalName, size: data.length }
}

const duplicateResponse = (leadId: number | string) => Response.json({ accepted: true, duplicate: true, leadId }, { status: 200 })

export const leadIngestEndpoint: Endpoint = {
  path: '/lead-ingest',
  method: 'post',
  handler: async (req) => {
    if (!authorized(req)) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) return Response.json({ error: 'payload_too_large' }, { status: 413 })

    let transactionID: number | string | undefined
    let createdFilename = ''
    let receivedSubmissionId = ''
    try {
      if (!req.text) throw new IntakeError(400, 'invalid_payload')
      const raw = await req.text()
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new IntakeError(413, 'payload_too_large')
      let body: UnknownRecord
      try { body = JSON.parse(raw) as UnknownRecord } catch { throw new IntakeError(400, 'invalid_json') }
      const submissionId = text(body.submissionId, 36, true)
      receivedSubmissionId = submissionId
      if (!UUID_V4.test(submissionId) || req.headers.get('x-idempotency-key') !== submissionId) throw new IntakeError(400, 'invalid_idempotency_key')
      const ipHash = text(body.ipHash, 64, true)
      if (!/^[0-9a-f]{64}$/i.test(ipHash)) throw new IntakeError(400, 'invalid_ip_hash')
      const consentVersion = text(body.consentVersion, 120, true)
      const privacyVersion = text(body.privacyVersion, 120, true)
      if (consentVersion !== 'PD-CONSENT-2026-08-14-R4' || privacyVersion !== 'PRIVACY-2026-08-14-R5') throw new IntakeError(400, 'invalid_consent_version')

      const existing = await req.payload.find({ collection: 'leads', depth: 0, limit: 1, pagination: false, where: { submissionId: { equals: submissionId } } })
      if (existing.docs[0]) return duplicateResponse(existing.docs[0].id)

      const attachment = parseAttachment(body.attachment, submissionId)
      const requestCode = `ITW-${new Date().getUTCFullYear()}-${submissionId.slice(0, 8).toUpperCase()}`
      const startedTransactionID = await req.payload.db.beginTransaction()
      if (startedTransactionID === null) throw new Error('transaction_unavailable')
      transactionID = startedTransactionID
      const transactionReq = Object.assign(req, { transactionID })
      const lead = await req.payload.create({
        collection: 'leads', req: transactionReq, overrideAccess: true,
        data: {
          submissionId,
          requestCode,
          name: text(body.name, 160, true), company: text(body.company, 240), contact: text(body.contact, 320, true),
          task: text(body.task, 4000, true), systems: text(body.systems, 1000), site: text(body.site, 1000),
          topics: stringList(body.topics, 12, 160), diagnosis: text(body.diagnosis, 4000),
          source: 'website', originService: text(body.originService, 160), originScenario: text(body.originScenario, 160),
          pageURL: text(body.pageUrl, 2000), landingPath: text(body.landingPath, 1000), referrer: text(body.referrer, 2000),
          utm: safeUTM(body.utm), sessionId: text(body.sessionId, 160), ipHash, userAgent: text(body.userAgent, 512),
          consentAccepted: true, consentAcceptedAt: new Date().toISOString(),
          consentVersion, privacyVersion,
          status: 'new', deliveryStatus: 'queued',
          bitrixStatus: process.env.BITRIX24_WEBHOOK_URL ? 'pending' : 'not_configured',
          telegramStatus: process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? 'pending' : 'not_configured',
        },
      })

      if (attachment) {
        const file = await req.payload.create({
          collection: 'lead-files', req: transactionReq, overrideAccess: true,
          data: { originalName: attachment.originalName, submissionId }, file: attachment,
        })
        createdFilename = typeof file.filename === 'string' ? file.filename : ''
        await req.payload.update({ collection: 'leads', id: lead.id, req: transactionReq, overrideAccess: true, data: { attachment: file.id } })
      }

      await req.payload.jobs.queue({ task: 'deliverLead', queue: 'lead-delivery', input: { leadId: Number(lead.id) }, req: transactionReq })
      await req.payload.db.commitTransaction(startedTransactionID)
      transactionID = undefined
      return Response.json({ accepted: true, duplicate: false, leadId: lead.id }, { status: 202 })
    } catch (error) {
      let rollbackConfirmed = false
      if (transactionID !== undefined) {
        try {
          await req.payload.db.rollbackTransaction(transactionID)
          rollbackConfirmed = true
        } catch {
          // An ambiguous commit must preserve the file until reconciliation.
        }
      }
      if (error instanceof IntakeError) return Response.json({ error: error.message }, { status: error.status })
      if (UUID_V4.test(receivedSubmissionId)) {
        const existing = await req.payload.find({ collection: 'leads', depth: 0, limit: 1, pagination: false, where: { submissionId: { equals: receivedSubmissionId } } }).catch(() => null)
        if (existing?.docs[0]) return duplicateResponse(existing.docs[0].id)
      }
      if (createdFilename && rollbackConfirmed) {
        const directory = path.resolve(process.env.LEAD_FILES_DIR || './lead-files')
        const orphanPath = path.resolve(directory, path.basename(createdFilename))
        if (orphanPath.startsWith(`${directory}${path.sep}`)) await unlink(orphanPath).catch(() => undefined)
      }
      return Response.json({ error: 'storage_unavailable' }, { status: 503 })
    }
  },
}
