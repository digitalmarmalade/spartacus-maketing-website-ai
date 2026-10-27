import type { Payload } from 'payload'

export type ProductRecord = { name: string; description: string; path: string; order: number }

export function validateProducts(value: unknown): ProductRecord[] {
  if (!Array.isArray(value)) throw new Error('Products must be an array.')
  const paths = new Set<string>()
  for (const row of value) {
    if (!row || typeof row.name !== 'string' || !row.name.trim() ||
      typeof row.description !== 'string' || !row.description.trim() ||
      typeof row.path !== 'string' || !/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.path) ||
      !Number.isInteger(row.order) || row.order < 1 || paths.has(row.path)) {
      throw new Error('Invalid product content or duplicate path; import stopped.')
    }
    paths.add(row.path)
  }
  return value
}

// Existing CMS records are preserved, including editor changes and publishing status.
export async function importProducts(payload: Payload, records: ProductRecord[], apply = false) {
  let created = 0
  let skipped = 0
  for (const record of validateProducts(records)) {
    const existing = await payload.find({
      collection: 'products', where: { path: { equals: record.path } }, limit: 1,
    })
    if (existing.docs.length) { skipped++; continue }
    if (apply) await payload.create({ collection: 'products', data: { ...record, status: 'published' } })
    created++
  }
  return { created, skipped, applied: apply }
}
