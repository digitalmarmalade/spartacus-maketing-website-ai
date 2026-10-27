# Frameworks migration

Frameworks are independent of Webflow and the static website. No CMS command here
publishes to Webflow, changes exported website pages or triggers Netlify.

The collection preserves `name`, `description`, `path` and `order` from
`../content/frameworks.json`. The import maps `draft: true` to `status: draft` and
`draft: false` to `status: published`. Seven records are imported: six published
and NCSC CAF 3.2 & 4.0 as draft, retaining its TBC description and position.
Public requests can only read published records. Draft reads and all writes
require an authenticated CMS user. New records default to draft.

Apply the reviewed Frameworks migration using the direct Neon connection before
importing. Automatic database schema push remains disabled.

From this directory, `npm run import:frameworks` previews missing records without
writing. `npm run import:frameworks -- --apply` creates missing records. Existing
paths are skipped, preserving editor changes and publishing status. Malformed
draft flags, paths or duplicate source paths stop validation before any writes.
After an operational failure, rerun the import to create remaining records.

The command uses the current process environment, falling back to `.env`. Never
print connection strings or commit environment files. Integration tests require
the isolated database URL in `.env.migration-test.local`; they use unique fixture
paths and clean up their own records.

The website still uses its existing JSON and Python rendering scripts. CMS
editing does not yet change the website or hide existing static pages or links.
