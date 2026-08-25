import type { Field } from 'payload'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugField: Field = {
  name: 'slug',
  type: 'text',
  index: true,
  required: true,
  unique: true,
  validate: (value: unknown) =>
    typeof value === 'string' && slugPattern.test(value)
      ? true
      : 'Use lowercase Latin letters, numbers and single hyphens.',
}
