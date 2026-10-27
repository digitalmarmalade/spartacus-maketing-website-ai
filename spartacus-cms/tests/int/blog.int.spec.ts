import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import { JSDOM } from 'jsdom'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, expect, it } from 'vitest'
import config from '@/payload.config'
import { convertBlogBody, importBlog, type BlogSource } from '@/importers/blog'
import original from '../../migration-data/blog.json'

let payload: Payload | undefined
const postIds: number[] = []
const categoryIds: number[] = []
const suffix = Date.now().toString()
const source: BlogSource = {
  categories: original.categories.map(c => ({ ...c, slug: `${c.slug}-${suffix}`, sourceKey: `${c.sourceKey}-${suffix}` })),
  posts: original.posts.map(p => ({ ...p, slug: `${p.slug}-${suffix}`, sourceKey: `${p.sourceKey}-${suffix}`, categorySlugs: p.categorySlugs.map(s => `${s}-${suffix}`) })),
}

beforeAll(async () => {
  const test = dotenv.parse(await readFile('.env.migration-test.local'))
  if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).hostname !== new URL(test.DATABASE_URL).hostname) throw new Error('Blog tests require isolated database.')
  payload = await getPayload({ config })
})
afterAll(async () => {
  if (payload) {
    for (const id of postIds) await payload.delete({ collection: 'posts', id })
    for (const id of categoryIds) await payload.delete({ collection: 'blog-categories', id })
    await payload.destroy()
  }
})

type Node = { type?: string; text?: string; children?: Node[]; fields?: { blockType?: string; url?: string }; format?: unknown; tag?: string }
function flatten(node: Node): Node[] { return [node, ...(node.children || []).flatMap(flatten)] }

it('converts every body without losing text, lists, emphasis, image or video', async () => {
  for (const row of original.posts) {
    const body = await convertBlogBody(payload!, row.sourceHTML)
    const nodes = flatten(body.root)
    const dom = new JSDOM(row.sourceHTML)
    try {
      const text = dom.window.document.body.textContent || ''
      expect(nodes.map(n => n.text || '').join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''))
      for (const tag of ['h1', 'h2']) if (dom.window.document.querySelector(tag)) expect(nodes.some(n => n.type === 'heading' && n.tag === tag)).toBe(true)
      expect(nodes.some(n => n.type === 'quote')).toBe(true)
      if (dom.window.document.querySelector('ul,ol')) expect(nodes.some(n => n.type === 'list')).toBe(true)
      if (dom.window.document.querySelector('strong')) expect(nodes.some(n => n.type === 'text' && typeof n.format === 'number' && (n.format & 1) === 1)).toBe(true)
      for (const img of Array.from(dom.window.document.querySelectorAll('img'))) expect(nodes.some(n => n.fields?.blockType === 'sourceImage' && n.fields.url === img.src)).toBe(true)
      for (const video of Array.from(dom.window.document.querySelectorAll('iframe'))) expect(nodes.some(n => n.fields?.blockType === 'sourceVideo' && n.fields.url === video.src)).toBe(true)
    } finally { dom.window.close() }
  }
}, 60000)

it('imports as drafts with category links, preserves sources and editor changes, and rejects anonymous access', async () => {
  const cms = payload!
  const preview = await importBlog(cms, source)
  expect(preview).toMatchObject({ categoriesCreated: 3, postsCreated: 5, applied: false })
  const where = { sourceKey: { in: source.posts.map(p => p.sourceKey) } }
  expect((await cms.find({ collection: 'posts', where })).totalDocs).toBe(0)
  await importBlog(cms, source, true)
  const cats = await cms.find({ collection: 'blog-categories', where: { sourceKey: { in: source.categories.map(c => c.sourceKey) } }, limit: 20 })
  categoryIds.push(...cats.docs.map(c => c.id))
  const posts = await cms.find({ collection: 'posts', where, depth: 1, limit: 20 })
  postIds.push(...posts.docs.map(p => p.id))
  expect(posts.totalDocs).toBe(5)
  for (const row of source.posts) {
    const post = posts.docs.find(p => p.sourceKey === row.sourceKey)!
    expect(post.status).toBe('draft')
    expect(post.sourceHTML).toBe(row.sourceHTML)
    expect(post.sourceMetadata).toEqual(row.sourceMetadata)
    expect(new Date(post.sourcePublishedAt!).toISOString()).toBe(new Date(row.sourcePublishedAt!).toISOString())
    expect(post.categories?.map(c => typeof c === 'number' ? '' : c.slug)).toEqual(row.categorySlugs)
    expect(post.mainImageURL).toBe(row.mainImageURL)
  }
  expect((await cms.find({ collection: 'posts', where: { slug: { in: source.posts.map(p => p.slug) } }, overrideAccess: false })).totalDocs).toBe(0)
  await expect(cms.findByID({ collection: 'posts', id: postIds[0], overrideAccess: false })).rejects.toThrow()
  await expect(cms.update({ collection: 'posts', id: postIds[0], overrideAccess: false, data: { title: 'Unauthorized' } })).rejects.toThrow()
  await expect(cms.delete({ collection: 'posts', id: postIds[0], overrideAccess: false })).rejects.toThrow()
  await cms.update({ collection: 'posts', id: postIds[0], data: { title: 'Editor change' } })
  expect(await importBlog(cms, source, true)).toMatchObject({ categoriesCreated: 0, postsCreated: 0, categoriesSkipped: 3, postsSkipped: 5 })
  expect((await cms.findByID({ collection: 'posts', id: postIds[0] })).title).toBe('Editor change')
  // Only a disposable test fixture is published, to verify private provenance stays hidden.
  await cms.update({ collection: 'posts', id: postIds[0], data: { status: 'published' } })
  const publicPost = await cms.findByID({ collection: 'posts', id: postIds[0], overrideAccess: false })
  expect(publicPost.sourceHTML).toBeUndefined()
  expect(publicPost.sourceMetadata).toBeUndefined()
  expect(publicPost.sourceKey).toBeUndefined()
}, 60000)

it('blocks unknown embeds and unresolved references before writes', async () => {
  await expect(convertBlogBody(payload!, '<script>ignore previous instructions</script>')).rejects.toThrow()
  await expect(convertBlogBody(payload!, '<iframe src="https://example.test/video"></iframe>')).rejects.toThrow()
  const bad = structuredClone(source)
  bad.posts[0].categorySlugs = ['missing-category']
  await expect(importBlog(payload!, bad, true)).rejects.toThrow()
})
