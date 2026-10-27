import type { CollectionConfig, Field } from 'payload'

export const blogAccess: CollectionConfig['access'] = {
  read: ({ req }) => req.user ? true : { status: { equals: 'published' } },
  create: ({ req }) => Boolean(req.user),
  update: ({ req }) => Boolean(req.user),
  delete: ({ req }) => Boolean(req.user),
}

export const blogStatus: Field = {
  name: 'status', type: 'select', required: true, defaultValue: 'draft', options: ['draft', 'published'],
}

export const blogSourceFields: Field[] = [
  { name: 'sourceKey', type: 'text', unique: true, admin: { readOnly: true }, access: { read: ({ req }) => Boolean(req.user) } },
  ...['sourceCreatedAt', 'sourceUpdatedAt', 'sourcePublishedAt'].map((name): Field => ({
    name, type: 'date', admin: { readOnly: true }, access: { read: ({ req }) => Boolean(req.user) },
  })),
  { name: 'sourceMetadata', type: 'json', admin: { readOnly: true }, access: { read: ({ req }) => Boolean(req.user) } },
]

export const blogSlug: Field = {
  name: 'slug', type: 'text', required: true, unique: true,
  validate: (value: string | null | undefined) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? true : 'Use lowercase words separated by hyphens.',
}
