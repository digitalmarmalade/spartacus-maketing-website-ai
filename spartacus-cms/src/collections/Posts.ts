import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { blogAccess, blogSlug, blogSourceFields, blogStatus } from './blogShared'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'categories', 'sourcePublishedAt'] },
  access: blogAccess,
  fields: [
    { name: 'title', type: 'text', required: true }, blogSlug,
    { name: 'excerpt', type: 'textarea' },
    { name: 'body', type: 'richText', required: true, editor: lexicalEditor({
      features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [
        { slug: 'sourceImage', labels: { singular: 'Source image', plural: 'Source images' }, fields: [
          { name: 'url', type: 'text', required: true }, { name: 'alt', type: 'text' },
          { name: 'width', type: 'number' }, { name: 'height', type: 'number' },
        ] },
        { slug: 'sourceVideo', labels: { singular: 'Source video', plural: 'Source videos' }, fields: [
          { name: 'url', type: 'text', required: true }, { name: 'title', type: 'text' },
        ] },
      ] })],
    }) },
    { name: 'categories', type: 'relationship', relationTo: 'blog-categories', hasMany: true },
    { name: 'mainImageURL', type: 'text', admin: { description: 'Original image URL; media backup pending.' } },
    { name: 'thumbnailImageURL', type: 'text' },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'color', type: 'text' }, blogStatus,
    { name: 'publishedAt', type: 'date', admin: { description: 'Set when publishing; original Webflow publication date is retained separately.' } },
    { name: 'sourceHTML', type: 'textarea', admin: { readOnly: true, description: 'Original Webflow HTML for comparison; never rendered directly.' }, access: { read: ({ req }) => Boolean(req.user) } },
    ...blogSourceFields,
  ],
}
