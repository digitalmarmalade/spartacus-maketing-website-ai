import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importProducts, validateProducts } from '../src/importers/products'

let payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  const records = validateProducts(JSON.parse(await readFile(new URL('../../content/products.json', import.meta.url), 'utf8')))
  payload = await getPayload({ config })
  const result = await importProducts(payload, records, process.argv.includes('--apply'))
  console.log(`${result.applied ? 'Created' : 'Would create'} ${result.created} products; preserved ${result.skipped} existing records.`)
} catch {
  console.error('Product import failed. Check content, database configuration and migrations. Connection details withheld.')
  process.exitCode = 1
} finally {
  await payload?.destroy()
}

// Payload may leave background handles open after its adapter is destroyed.
process.exit(process.exitCode ? Number(process.exitCode) : 0)
