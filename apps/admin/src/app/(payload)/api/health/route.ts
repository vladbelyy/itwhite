import config from '@payload-config'
import { getPayload } from 'payload'

const json = (body: { status: 'ok' | 'unavailable' }, status: number) =>
  Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
    status,
  })

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'users', overrideAccess: true })
    return json({ status: 'ok' }, 200)
  } catch {
    return json({ status: 'unavailable' }, 503)
  }
}

