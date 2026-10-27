import type { CollectionConfig } from 'payload'
import { blogAccess, blogSlug, blogSourceFields, blogStatus } from './blogShared'

export const BlogCategories: CollectionConfig = {
  slug: 'blog-categories',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'status'] },
  defaultSort: 'name',
  access: blogAccess,
  fields: [
    { name: 'name', type: 'text', required: true }, blogSlug,
    { name: 'description', type: 'textarea' },
    { name: 'iconURL', type: 'text', admin: { description: 'Original image URL; media backup pending.' } },
    { name: 'color', type: 'text' }, blogStatus, ...blogSourceFields,
  ],
}
