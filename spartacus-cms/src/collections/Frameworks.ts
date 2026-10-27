import type { CollectionConfig } from 'payload'

export const Frameworks: CollectionConfig = {
  slug: 'frameworks',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'order', 'path'],
  },
  defaultSort: 'order',
  access: {
    read: ({ req }) => req.user ? true : { status: { equals: 'published' } },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'path',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Existing website path, for example /frameworks/nist-csf-2.' },
      validate: (value: string | null | undefined) =>
        typeof value === 'string' && /^\/frameworks\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
          ? true : 'Enter a framework path such as /frameworks/nist-csf-2.',
    },
    { name: 'order', type: 'number', required: true, min: 1 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
  ],
}
