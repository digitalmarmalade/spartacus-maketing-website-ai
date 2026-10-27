import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importFrameworks, validateFrameworks } from '../src/importers/frameworks'

let payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  const records = validateFrameworks(JSON.parse(await readFile(new URL('../../content/frameworks.json', import.meta.url), 'utf8')))
  payload = await getPayload({ config })
  const result = await importFrameworks(payload, records, process.argv.includes('--apply'))
  console.log(`${result.applied ? 'Created' : 'Would create'} ${result.created} frameworks; preserved ${result.skipped} existing records.`)
} catch {
  console.error('Framework import failed. Check content, database configuration and migrations. Connection details withheld.')
  process.exitCode = 1
} finally {
  await payload?.destroy()
}

// Payload may leave background handles open after its adapter is destroyed.
process.exit(process.exitCode ? Number(process.exitCode) : 0)
