import type { CollectionConfig } from 'payload'
import path from 'path'

import { contentTeam, ownerOrAdmin } from '../access/roles'

const mediaDir = path.resolve(process.env.MEDIA_DIR || './media')

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: contentTeam,
    delete: ownerOrAdmin,
    read: contentTeam,
    update: contentTeam,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    allowRestrictedFileTypes: false,
    bulkUpload: false,
    filesRequiredOnCreate: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    pasteURL: false,
    staticDir: mediaDir,
  },
}
