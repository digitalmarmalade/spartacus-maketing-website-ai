import { readFile } from 'node:fs/promises'
import dotenv from 'dotenv'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, expect, it } from 'vitest'
import config from '@/payload.config'
import { importFrameworks, validateFrameworks } from '@/importers/frameworks'

let payload: Payload | undefined
const ids: number[] = []
const suffix = Date.now().toString()

beforeAll(async () => {
  const isolated = dotenv.parse(await readFile('.env.migration-test.local'))
  if (!process.env.DATABASE_URL || !isolated.DATABASE_URL ||
    new URL(process.env.DATABASE_URL).hostname !== new URL(isolated.DATABASE_URL).hostname) {
    throw new Error('Frameworks tests require the isolated test database.')
  }
  payload = await getPayload({ config })
})

afterAll(async () => {
  if (payload) {
    for (const id of ids) await payload.delete({ collection: 'frameworks', id })
    await payload.destroy()
  }
})

it('preserves order and draft status, safely repeats imports, and restricts public access', async () => {
  const cms = payload!
  const source = validateFrameworks(JSON.parse(await readFile('../content/frameworks.json', 'utf8')))
  expect(source).toHaveLength(7)
  const records = source.map(row => ({ ...row, path: `${row.path}-integration-${suffix}` }))
  const where = { path: { in: records.map(row => row.path) } }
  expect(await importFrameworks(cms, records)).toEqual({ created: 7, skipped: 0, applied: false })
  expect((await cms.find({ collection: 'frameworks', where })).totalDocs).toBe(0)
  await importFrameworks(cms, records, true)
  const imported = await cms.find({ collection: 'frameworks', where, sort: 'order', limit: 20 })
  ids.push(...imported.docs.map(doc => doc.id))
  expect(imported.docs.map(({ name, description, path, order, status }) =>
    ({ name, description, path, order, draft: status === 'draft' }))).toEqual(records)
  const publicCards = await cms.find({ collection: 'frameworks', where, overrideAccess: false, sort: 'order', limit: 20 })
  expect(publicCards.docs.map(doc => doc.path)).toEqual(records.filter(row => !row.draft).map(row => row.path))
  expect(publicCards.totalDocs).toBe(6)
  const draft = imported.docs.find(row => row.status === 'draft')!
  await expect(cms.findByID({ collection: 'frameworks', id: draft.id, overrideAccess: false })).rejects.toThrow()
  await cms.update({ collection: 'frameworks', id: ids[0], data: { name: 'Editor change', status: 'draft' } })
  expect(await importFrameworks(cms, records, true)).toEqual({ created: 0, skipped: 7, applied: true })
  const preserved = await cms.findByID({ collection: 'frameworks', id: ids[0] })
  expect(preserved.name).toBe('Editor change')
  expect(preserved.status).toBe('draft')
  const { draft: _draft, ...data } = records[0]
  await expect(cms.create({ collection: 'frameworks', overrideAccess: false,
    data: { ...data, path: `/frameworks/unauthorized-${suffix}`, status: 'draft' } })).rejects.toThrow()
  await expect(cms.update({ collection: 'frameworks', id: ids[1], overrideAccess: false,
    data: { name: 'Unauthorized' } })).rejects.toThrow()
  await expect(cms.delete({ collection: 'frameworks', id: ids[1], overrideAccess: false })).rejects.toThrow()
  await expect(cms.create({ collection: 'frameworks', data: { ...data, status: 'draft' } })).rejects.toThrow()
}, 60000)

it('rejects malformed draft flags and duplicate paths', () => {
  const row = { name: 'Example', description: 'Description', path: '/frameworks/example', order: 1, draft: true }
  expect(() => validateFrameworks([row, row])).toThrow()
  expect(() => validateFrameworks([{ ...row, draft: 'false' }])).toThrow()
  expect(() => validateFrameworks([{ ...row, path: 'https://example.test' }])).toThrow()
})
