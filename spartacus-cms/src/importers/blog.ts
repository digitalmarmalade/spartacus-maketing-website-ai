import { randomUUID } from 'node:crypto'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'
import type { Post } from '../payload-types'
import type source from '../../migration-data/blog.json'

export type BlogSource = typeof source

export async function convertBlogBody(payload: Payload, html: string): Promise<Post['body']> {
  const dom = new JSDOM(html)
  try {
    const doc = dom.window.document
    if (doc.querySelector('script, style, link, meta, object, embed')) throw new Error('Unsafe HTML requires review.')
    const allowed = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'A', 'BR', 'FIGURE', 'DIV', 'IFRAME', 'IMG'])
    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      if (!allowed.has(el.tagName) || Array.from(el.attributes).some(a => /^on/i.test(a.name))) {
        throw new Error('Unsupported HTML requires review.')
      }
    }
    const config = await editorConfigFactory.default({ config: payload.config })
    const children: Post['body']['root']['children'] = []
    const append = (node: Node) => {
      if (node.nodeType === 3 && !node.textContent?.trim()) return
      const el = node.nodeType === 1 ? node as Element : undefined
      if (el?.tagName === 'IFRAME') {
        const url = el.getAttribute('src') || ''
        if (!/^https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+$/.test(url)) throw new Error('Unsupported video URL.')
        children.push({ type: 'block', version: 2, format: '', fields: {
          id: randomUUID(), blockName: 'Imported video', blockType: 'sourceVideo', url,
          title: el.getAttribute('title') || '',
        } })
      } else if (el?.tagName === 'IMG') {
        const url = el.getAttribute('src') || ''
        if (new URL(url).protocol !== 'https:' || new URL(url).hostname !== 'cdn.prod.website-files.com') throw new Error('Unsupported image URL.')
        children.push({ type: 'block', version: 2, format: '', fields: {
          id: randomUUID(), blockName: 'Imported image', blockType: 'sourceImage', url,
          alt: el.getAttribute('alt') || '',
          width: Number(el.getAttribute('width')) || undefined,
          height: Number(el.getAttribute('height')) || undefined,
        } })
      } else if (el?.querySelector('iframe, img')) {
        for (const child of Array.from(el.childNodes)) append(child)
      } else {
        const input = el?.outerHTML || (() => { const p = doc.createElement('p'); p.textContent = node.textContent; return p.outerHTML })()
        const converted = convertHTMLToLexical({ editorConfig: config, html: input, JSDOM })
        children.push(...converted.root.children)
      }
    }
    for (const node of Array.from(doc.body.childNodes)) append(node)
    return { root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children } }
  } finally { dom.window.close() }
}

export async function importBlog(payload: Payload, data: BlogSource, apply = false) {
  const categoryKeys = new Map(data.categories.map(c => [c.slug, c.sourceKey]))
  if (categoryKeys.size !== data.categories.length || new Set(data.posts.map(p => p.slug)).size !== data.posts.length) throw new Error('Duplicate source slug.')
  for (const post of data.posts) {
    if (!post.sourceKey || !post.title || !post.sourceHTML || post.categorySlugs.some(s => !categoryKeys.has(s))) throw new Error('Invalid source or unresolved category.')
  }
  // Validate every rich-text conversion and collision before writing anything.
  const bodies = await Promise.all(data.posts.map(p => convertBlogBody(payload, p.sourceHTML)))
  for (const [collection, rows] of [['blog-categories', data.categories], ['posts', data.posts]] as const) {
    if (new Set(rows.map(r => r.sourceKey)).size !== rows.length) throw new Error('Duplicate source key.')
    for (const row of rows) {
      const matches = await payload.find({ collection, where: { or: [{ sourceKey: { equals: row.sourceKey } }, { slug: { equals: row.slug } }] }, limit: 2 })
      if (matches.docs.some(d => d.sourceKey !== row.sourceKey || d.slug !== row.slug)) throw new Error('Source key or slug collision requires review.')
    }
  }
  const result = { categoriesCreated: 0, postsCreated: 0, categoriesSkipped: 0, postsSkipped: 0, applied: apply }
  const ids = new Map<string, number>()
  for (const row of data.categories) {
    const existing = await payload.find({ collection: 'blog-categories', where: { sourceKey: { equals: row.sourceKey } }, limit: 1 })
    if (existing.docs.length) { ids.set(row.slug, existing.docs[0].id); result.categoriesSkipped++; continue }
    result.categoriesCreated++
    if (apply) {
      const created = await payload.create({ collection: 'blog-categories', data: { ...row, status: row.status === 'published' ? 'published' : 'draft' } })
      ids.set(row.slug, created.id)
    }
  }
  for (let i = 0; i < data.posts.length; i++) {
    const row = data.posts[i]
    const existing = await payload.find({ collection: 'posts', where: { sourceKey: { equals: row.sourceKey } }, limit: 1 })
    if (existing.docs.length) { result.postsSkipped++; continue }
    result.postsCreated++
    if (apply) {
      const { categorySlugs, ...fields } = row
      const categories = categorySlugs.map(s => { const id = ids.get(s); if (!id) throw new Error('Unresolved category.'); return id })
      await payload.create({ collection: 'posts', data: { ...fields, status: 'draft', body: bodies[i], categories } })
    }
  }
  return result
}
