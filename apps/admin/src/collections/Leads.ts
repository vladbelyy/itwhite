import type { CollectionConfig } from 'payload'

import { ownerOrAdmin, salesTeam } from '../access/roles'

export const Leads: CollectionConfig = {
  slug: 'leads',
  access: {
    create: salesTeam,
    delete: ownerOrAdmin,
    read: salesTeam,
    update: salesTeam,
  },
  admin: {
    defaultColumns: ['name', 'company', 'status', 'source', 'createdAt'],
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'company', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'topic', type: 'text' },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Qualified', value: 'qualified' },
        { label: 'Closed', value: 'closed' },
        { label: 'Rejected', value: 'rejected' },
      ],
      required: true,
    },
    { name: 'source', type: 'text' },
    { name: 'pageURL', type: 'text' },
    { name: 'utm', type: 'json' },
    { name: 'consentAccepted', type: 'checkbox', required: true },
    { name: 'consentAcceptedAt', type: 'date' },
  ],
}
