import type { Payload } from 'payload'

export type FrameworkRecord = { name: string; description: string; path: string; order: number; draft: boolean }

export function validateFrameworks(value: unknown): FrameworkRecord[] {
  if (!Array.isArray(value)) throw new Error('Frameworks must be an array.')
  const paths = new Set<string>()
  for (const row of value) {
    if (!row || typeof row.name !== 'string' || !row.name.trim() ||
      typeof row.description !== 'string' || !row.description.trim() ||
      typeof row.path !== 'string' || !/^\/frameworks\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.path) ||
      typeof row.draft !== 'boolean' || !Number.isInteger(row.order) || row.order < 1 || paths.has(row.path)) {
      throw new Error('Invalid framework content or duplicate path; import stopped.')
    }
    paths.add(row.path)
  }
  return value
}

// Existing CMS records are preserved, including editor changes and publishing status.
export async function importFrameworks(payload: Payload, records: FrameworkRecord[], apply = false) {
  let created = 0
  let skipped = 0
  for (const record of validateFrameworks(records)) {
    const existing = await payload.find({
      collection: 'frameworks', where: { path: { equals: record.path } }, limit: 1,
    })
    if (existing.docs.length) { skipped++; continue }
    if (apply) {
      const { draft, ...data } = record
      await payload.create({ collection: 'frameworks', data: { ...data, status: draft ? 'draft' : 'published' } })
    }
    created++
  }
  return { created, skipped, applied: apply }
}
