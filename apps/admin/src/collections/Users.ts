import type { CollectionConfig } from 'payload'

import {
  allowFieldRoles,
  ownerAdminOrSelf,
  ownerOnly,
  ownerOrAdmin,
  userRoles,
} from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: ownerOrAdmin,
    delete: ownerOnly,
    read: ownerAdminOrSelf,
    update: ownerAdminOrSelf,
  },
  auth: {
    cookies: {
      sameSite: 'Strict',
      secure: process.env.NODE_ENV === 'production',
    },
    lockTime: 15 * 60 * 1000,
    maxLoginAttempts: 5,
    removeTokenFromResponses: true,
    tokenExpiration: 2 * 60 * 60,
    useAPIKey: false,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: allowFieldRoles('owner'),
        update: allowFieldRoles('owner'),
      },
      defaultValue: ['editor'],
      hasMany: true,
      options: userRoles.map((role) => ({ label: role, value: role })),
      required: true,
      saveToJWT: true,
    },
  ],
}
