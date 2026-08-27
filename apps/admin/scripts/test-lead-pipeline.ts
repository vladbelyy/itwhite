import assert from 'node:assert/strict'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { leadIngestEndpoint } from '../src/endpoints/leadIngest'

process.env.LEAD_INGEST_SECRET = 'test-only-ingest-secret-with-more-than-32-characters'

type Stored = { id: number; submissionId: string; [key: string]: unknown }

const validBody = (submissionId = '809b4166-5b95-4df4-b791-54fdba7bdcf1') => ({
  submissionId,
  requestCode: 'ITW-2026-TEST0001',
  name: 'Pipeline test',
  company: 'IT WHITE test',
  contact: '@test',
  task: 'Transactional intake test',
  systems: '', site: '', topics: [], diagnosis: '', originService: 'process-review', originScenario: '',
  pageUrl: 'https://itwhite.ru/', landingPath: '/', referrer: '', utm: '{}',
  sessionId: 'session-test', ipHash: 'a'.repeat(64), userAgent: 'test',
  consentVersion: 'PD-CONSENT-2026-08-14-R4', privacyVersion: 'PRIVACY-2026-08-14-R5', attachment: null,
})

const createHarness = ({ failQueue = false, ambiguousCommit = false, leadFilesDir = '' } = {}) => {
  const leads: Stored[] = []
  const jobs: unknown[] = []
  let pendingLeads: Stored[] = []
  let pendingJobs: unknown[] = []
  let transactionCommitted = false
  let nextID = 1
  const payload = {
    db: {
      beginTransaction: async () => 'tx-1',
      commitTransaction: async () => {
        leads.push(...pendingLeads); jobs.push(...pendingJobs); pendingLeads = []; pendingJobs = []; transactionCommitted = true
        if (ambiguousCommit) throw new Error('commit response lost')
      },
      rollbackTransaction: async () => {
        if (transactionCommitted) throw new Error('transaction already committed')
        pendingLeads = []; pendingJobs = []
      },
    },
    find: async ({ where }: { where: { submissionId: { equals: string } } }) => ({ docs: leads.filter((lead) => lead.submissionId === where.submissionId.equals) }),
    create: async ({ collection, data, file }: { collection: string; data: Record<string, unknown>; file?: { data: Buffer; name: string; mimetype: string } }) => {
      if (collection === 'leads') {
        const lead = { id: nextID++, ...data } as Stored
        pendingLeads.push(lead)
        return lead
      }
      if (collection === 'lead-files' && file && leadFilesDir) {
        await writeFile(path.join(leadFilesDir, file.name), file.data)
        return { id: nextID++, filename: file.name, ...data }
      }
      throw new Error('unexpected collection')
    },
    update: async ({ collection, id, data }: { collection: string; id: number; data: Record<string, unknown> }) => {
      if (collection !== 'leads') throw new Error('unexpected update')
      const lead = [...pendingLeads, ...leads].find((item) => item.id === id)
      if (!lead) throw new Error('lead missing')
      Object.assign(lead, data)
      return lead
    },
    jobs: {
      queue: async (job: unknown) => {
        if (failQueue) throw new Error('forced queue failure')
        pendingJobs.push(job)
      },
    },
  }
  return { payload, leads, jobs }
}

const request = (payload: unknown, body: Record<string, unknown>, secret = process.env.LEAD_INGEST_SECRET!) => ({
  headers: new Headers({ authorization: `Bearer ${secret}`, 'content-type': 'application/json', 'x-idempotency-key': String(body.submissionId) }),
  payload,
  text: async () => JSON.stringify(body),
})

const handler = leadIngestEndpoint.handler!

{
  const harness = createHarness()
  const response = await handler(request(harness.payload, validBody(), 'wrong-secret') as never)
  assert.equal(response.status, 401)
  assert.equal(harness.leads.length, 0)
}

{
  const harness = createHarness()
  const body = validBody()
  const accepted = await handler(request(harness.payload, body) as never)
  assert.equal(accepted.status, 202)
  assert.equal(harness.leads.length, 1)
  assert.equal(harness.jobs.length, 1)
  const duplicate = await handler(request(harness.payload, body) as never)
  assert.equal(duplicate.status, 200)
  assert.equal(harness.leads.length, 1)
  assert.equal(harness.jobs.length, 1)
}

{
  const harness = createHarness({ failQueue: true })
  const response = await handler(request(harness.payload, validBody('db6a208b-84a7-4a3c-b1aa-0f45093299a2')) as never)
  assert.equal(response.status, 503)
  assert.equal(harness.leads.length, 0)
  assert.equal(harness.jobs.length, 0)
}

{
  const harness = createHarness()
  const body = { ...validBody('4f0d14d6-2654-405c-93d2-92a88c6a551d'), ipHash: '' }
  const response = await handler(request(harness.payload, body) as never)
  assert.equal(response.status, 400)
  assert.equal(harness.leads.length, 0)
}

{
  const directory = await mkdtemp(path.join(tmpdir(), 'itwhite-ambiguous-commit-'))
  process.env.LEAD_FILES_DIR = directory
  try {
    const submissionId = 'aa7d9d21-7b3d-4f94-85b8-5d7831ec4ee4'
    const data = Buffer.from('safe text')
    const harness = createHarness({ ambiguousCommit: true, leadFilesDir: directory })
    const body = { ...validBody(submissionId), attachment: { data: data.toString('base64'), mimeType: 'text/plain', name: 'notes.txt', size: data.length } }
    const response = await handler(request(harness.payload, body) as never)
    assert.equal(response.status, 200)
    assert.equal(harness.leads.length, 1)
    assert.equal(harness.jobs.length, 1)
    await stat(path.join(directory, `${submissionId}.txt`))
  } finally {
    delete process.env.LEAD_FILES_DIR
    await rm(directory, { recursive: true, force: true })
  }
}

console.log(JSON.stringify({ fixtures: 5, status: 'passed' }))
