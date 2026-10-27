# Products migration

The CMS is independent of Webflow and the exported static website. Nothing here
publishes to Webflow, changes website HTML, or triggers a deployment.

Products preserve the `name`, `description`, `path` and `order` fields from
`../content/products.json`. New editor-created records default to draft. Public
reads return published records only; writes require an authenticated CMS user.

Apply the reviewed Products schema migration before importing records. Use the
direct database connection for migrations and the pooled connection for the app.
Automatic schema push remains disabled.

From this folder, preview the import with `npm run import:products`. To create
missing records, use `npm run import:products -- --apply`. The five existing JSON
cards are imported as published. Matching paths are skipped, so rerunning the
import preserves editor changes and publishing status. Duplicate source paths or
malformed records stop the import before it writes any records. An operational
failure can leave some records imported; rerun to create the remaining records.

The command uses the current process environment, falling back to `.env`. Do not
print connection URLs or commit environment files. Keep production credentials
out of test processes: Products integration tests require `DATABASE_URL` to match
the isolated connection stored in `.env.migration-test.local`.

The website continues to use JSON and the existing Python rendering scripts.
Connecting the website to Payload is a separate migration step.
