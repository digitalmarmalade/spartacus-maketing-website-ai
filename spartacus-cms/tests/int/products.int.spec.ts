import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, expect, it } from 'vitest'
import config from '@/payload.config'
import { importProducts, validateProducts } from '@/importers/products'

let payload: Payload | undefined
const ids: number[] = []

beforeAll(async () => {
  const isolated = dotenv.parse(await readFile('.env.migration-test.local'))
  if (!process.env.DATABASE_URL || !isolated.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).hostname !== new URL(isolated.DATABASE_URL).hostname) {
    throw new Error('Products tests require the isolated test database.')
  }
  payload = await getPayload({ config })
})

afterAll(async () => {
  if (payload) {
    for (const id of ids) await payload.delete({ collection: 'products', id })
    await payload.destroy()
  }
})

it('imports all five cards, preserves editor changes on repeat, and protects drafts and writes', async () => {
  const cms = payload!
  const suffix = Date.now().toString()
  const records = validateProducts(JSON.parse(await readFile('../content/products.json', 'utf8')))
    .map(row => ({ ...row, path: `${row.path}-integration-${suffix}` }))
  const where = { path: { in: records.map(row => row.path) } }
  expect(records).toHaveLength(5)
  expect((await cms.find({ collection: 'products', where, limit: 1 })).totalDocs).toBe(0)
  expect(await importProducts(cms, records)).toEqual({ created: 5, skipped: 0, applied: false })
  expect((await cms.find({ collection: 'products', where, limit: 1 })).totalDocs).toBe(0)
  await importProducts(cms, records, true)
  const imported = await cms.find({ collection: 'products', where, sort: 'order', limit: 10 })
  ids.push(...imported.docs.map(doc => doc.id))
  expect(imported.docs.map(({ name, description, path, order }) => ({ name, description, path, order }))).toEqual(records)
  await cms.update({ collection: 'products', id: ids[0], data: { name: 'Editor update' } })
  expect(await importProducts(cms, records, true)).toEqual({ created: 0, skipped: 5, applied: true })
  expect((await cms.findByID({ collection: 'products', id: ids[0] })).name).toBe('Editor update')
  await cms.update({ collection: 'products', id: ids[0], data: { status: 'draft' } })
  const publicCards = await cms.find({ collection: 'products', where, overrideAccess: false, limit: 10 })
  expect(publicCards.totalDocs).toBe(4)
  expect(publicCards.docs.every(doc => doc.status === 'published')).toBe(true)
  await expect(cms.create({ collection: 'products', overrideAccess: false,
    data: { ...records[0], path: '/products/unauthorized', status: 'draft' } })).rejects.toThrow()
  await expect(cms.update({ collection: 'products', id: ids[1], overrideAccess: false,
    data: { name: 'Unauthorized' } })).rejects.toThrow()
  await expect(cms.delete({ collection: 'products', id: ids[1], overrideAccess: false })).rejects.toThrow()
  await expect(cms.create({ collection: 'products', data: { ...records[1], status: 'draft' } })).rejects.toThrow()
}, 60000)

it('rejects malformed records and duplicate source paths before import', () => {
  const row = { name: 'Example', description: 'Description', path: '/products/example', order: 1 }
  expect(() => validateProducts([row, row])).toThrow()
  expect(() => validateProducts([{ ...row, path: 'https://example.test' }])).toThrow()
})
