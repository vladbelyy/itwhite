import type { CollectionConfig } from 'payload'

import { contentTeam, ownerOrAdmin } from '../access/roles'

const validateURL = (value: unknown) => {
  if (typeof value !== 'string') return 'URL is required.'

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? true
      : 'Only HTTP(S) URLs are allowed.'
  } catch {
    return 'Enter a valid URL.'
  }
}

export const Sources: CollectionConfig = {
  slug: 'sources',
  access: {
    create: contentTeam,
    delete: ownerOrAdmin,
    read: contentTeam,
    update: contentTeam,
  },
  admin: {
    defaultColumns: ['title', 'kind', 'verifiedAt', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'external',
      options: [
        { label: 'External source', value: 'external' },
        { label: 'Internal evidence', value: 'internal' },
        { label: 'Client confirmation', value: 'client' },
      ],
      required: true,
    },
    { name: 'url', type: 'text', required: true, validate: validateURL },
    { name: 'verifiedAt', type: 'date', required: true },
    { name: 'notes', type: 'textarea' },
  ],
}

