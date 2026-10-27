import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importBlog, type BlogSource } from '../src/importers/blog'

let payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  const data = JSON.parse(await readFile(new URL('../migration-data/blog.json', import.meta.url), 'utf8')) as BlogSource
  payload = await getPayload({ config })
  const result = await importBlog(payload, data, process.argv.includes('--apply'))
  console.log(`${result.applied ? 'Created' : 'Would create'} ${result.categoriesCreated} categories and ${result.postsCreated} draft posts; preserved ${result.categoriesSkipped} categories and ${result.postsSkipped} posts.`)
  console.log('Media remain source URLs. Inline image and video are editable blocks; original HTML is preserved for review.')
} catch {
  console.error('Blog import failed; check source data, conversion and migrations. Credentials withheld.')
  process.exitCode = 1
} finally { await payload?.destroy() }
process.exit(process.exitCode ? Number(process.exitCode) : 0)
