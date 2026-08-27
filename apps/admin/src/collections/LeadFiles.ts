import type { CollectionConfig } from 'payload'
import path from 'path'

import { ownerOrAdmin, salesTeam } from '../access/roles'

const leadFilesDir = path.resolve(process.env.LEAD_FILES_DIR || './lead-files')

export const LeadFiles: CollectionConfig = {
  slug: 'lead-files',
  labels: { plural: 'Файлы заявок', singular: 'Файл заявки' },
  access: { create: () => false, delete: ownerOrAdmin, read: salesTeam, update: ownerOrAdmin },
  admin: { group: 'Продажи', hidden: true, useAsTitle: 'originalName' },
  fields: [
    { name: 'originalName', type: 'text', required: true },
    { name: 'submissionId', type: 'text', required: true, index: true },
  ],
  upload: {
    allowRestrictedFileTypes: false,
    bulkUpload: false,
    filesRequiredOnCreate: true,
    mimeTypes: ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'],
    pasteURL: false,
    staticDir: leadFilesDir,
  },
}
