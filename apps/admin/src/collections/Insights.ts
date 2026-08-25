import type { CollectionConfig } from 'payload'

import { contentTeam, contentWrite, ownerOrAdmin } from '../access/roles'
import { restrictedEditor } from '../fields/restrictedEditor'
import { slugField } from '../fields/slug'

export const Insights: CollectionConfig = {
  slug: 'insights',
  access: {
    create: contentWrite,
    delete: ownerOrAdmin,
    read: contentTeam,
    update: contentWrite,
  },
  admin: {
    defaultColumns: ['title', 'category', '_status', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    { name: 'excerpt', type: 'textarea', required: true, maxLength: 500 },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Automation', value: 'automation' },
        { label: 'CRM / Bitrix24', value: 'crm' },
        { label: 'Internal systems', value: 'internal-systems' },
        { label: 'Controlled AI', value: 'controlled-ai' },
        { label: 'Technical consulting', value: 'technical-consulting' },
      ],
      required: true,
    },
    { name: 'body', type: 'richText', editor: restrictedEditor, required: true },
    { name: 'sources', type: 'relationship', relationTo: 'sources', hasMany: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'publishedAt', type: 'date' },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text', maxLength: 70 },
        { name: 'description', type: 'textarea', maxLength: 180 },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: { interval: 30_000 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
}
