import 'dotenv/config'

import { getPayload } from 'payload'

const required = (name: 'ADMIN_EMAIL' | 'ADMIN_PASSWORD' | 'DATABASE_URL' | 'PAYLOAD_SECRET') => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const email = required('ADMIN_EMAIL').toLowerCase()
const password = required('ADMIN_PASSWORD')

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('ADMIN_EMAIL must be a valid email address')
}

if (password.length < 16) {
  throw new Error('ADMIN_PASSWORD must contain at least 16 characters')
}

required('DATABASE_URL')
required('PAYLOAD_SECRET')

const { default: config } = await import('../src/payload.config.js')
const payload = await getPayload({ config })

try {
  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  if (existingUsers.docs.length > 0) {
    const roles = existingUsers.docs[0].roles || []
    if (!roles.includes('owner')) {
      throw new Error('ADMIN_EMAIL already exists without the owner role; refusing to elevate it')
    }

    console.log('Owner is already seeded')
    process.exitCode = 0
  } else {
    const totalUsers = await payload.count({ collection: 'users', overrideAccess: true })
    if (totalUsers.totalDocs > 0) {
      throw new Error('Users already exist; refusing to create an additional owner automatically')
    }

    await payload.create({
      collection: 'users',
      data: {
        email,
        name: 'Owner',
        password,
        roles: ['owner'],
      },
      overrideAccess: true,
    })

    console.log('Owner seeded successfully')
  }
} finally {
  await payload.db.destroy?.()
}
