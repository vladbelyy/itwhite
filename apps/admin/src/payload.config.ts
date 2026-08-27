import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Cases } from './collections/Cases'
import { Insights } from './collections/Insights'
import { LeadFiles } from './collections/LeadFiles'
import { Leads } from './collections/Leads'
import { Media } from './collections/Media'
import { Sources } from './collections/Sources'
import { Users } from './collections/Users'
import { hasRole } from './access/roles'
import { leadIngestEndpoint } from './endpoints/leadIngest'
import { restrictedEditor } from './fields/restrictedEditor'
import { DeliverLead } from './jobs/DeliverLead'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const productionOrigin = 'https://admin.itwhite.ru'

const requiredEnv = (name: 'DATABASE_URL' | 'PAYLOAD_SECRET') => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const boundedInteger = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

const adminOrigin =
  process.env.NODE_ENV === 'production'
    ? productionOrigin
    : process.env.ADMIN_ORIGIN || 'http://localhost:4323'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  bodyParser: {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
      fields: 100,
    },
  },
  collections: [Users, Leads, LeadFiles, Media, Sources, Cases, Insights],
  cors: [adminOrigin],
  csrf: [adminOrigin],
  defaultDepth: 1,
  editor: restrictedEditor,
  graphQL: {
    disable: true,
  },
  endpoints: [leadIngestEndpoint],
  jobs: {
    access: {
      cancel: ({ req }) => hasRole(req.user, ['owner', 'admin']),
      queue: ({ req }) => hasRole(req.user, ['owner', 'admin']),
      run: ({ req }) => hasRole(req.user, ['owner', 'admin']),
    },
    autoRun: process.env.LEAD_WORKER_ENABLED === 'true'
      ? [{ cron: '*/10 * * * * *', limit: 1, queue: 'lead-delivery' }]
      : [],
    tasks: [DeliverLead],
  },
  maxDepth: 5,
  secret: requiredEnv('PAYLOAD_SECRET'),
  serverURL: process.env.NODE_ENV === 'production' ? productionOrigin : adminOrigin,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: {
      connectionString: requiredEnv('DATABASE_URL'),
      connectionTimeoutMillis: boundedInteger(
        process.env.DATABASE_CONNECTION_TIMEOUT_MS,
        5_000,
        1_000,
        30_000,
      ),
      idleTimeoutMillis: 30_000,
      max: boundedInteger(process.env.DATABASE_POOL_MAX, 3, 1, 5),
    },
    push: process.env.NODE_ENV !== 'production',
  }),
  upload: {
    abortOnLimit: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
    safeFileNames: true,
    uploadTimeout: 30_000,
  },
  sharp,
  telemetry: false,
  plugins: [],
})
