# Spartacus migration handover — 27 October 2026

## Resume context

Work in the cloned `spartacus-maketing-website-ai` repository. Read this file,
`README.md` and `spartacus-cms/BLOG-MIGRATION.md` before editing. Inspect Git status
and current configuration first. Never print credentials.

**Never modify the existing Webflow site.** This project is a separate migration.
Preserve the exported website HTML, CSS, JS, JSON and Python card renderers unless
the user explicitly authorizes changes to the replacement website. GitHub changes
can trigger Netlify: do not push or publish without considering that deployment.

At handover, migration code is committed as `75129bc` ("Adds Payload and brings all
CMS content from webflow"). Live GitHub `main` was verified to match local `main`.
This handover file and the environment-example addition were prepared afterward;
check whether they have been committed/transferred separately. No push was made
while preparing this handover. Current Netlify deployment state was not checked.

## What already works

- Separate Payload 3.92.0 / Next.js 16.3.3 app in `spartacus-cms/`; npm lockfile included.
- Neon project `long-thunder-01278167`, organisation `org-fancy-surf-54499653`.
- Production branch `production`, ID `br-flat-waterfall-za1rr38c`.
- Four migrations applied: initial, Products, Frameworks and Blog.
- One permanent admin account, created privately by the user. Reuse it.
- Products: five published records, matching `content/products.json`.
- Frameworks: seven records; six published and NCSC CAF kept as draft/TBC.
- Blog: three categories and five posts. **All five posts are drafts by explicit
  user request**, despite the CSVs marking them published. They look like sample
  CMS articles. Do not publish them or rewrite their content without direction.
- Blog category links, original HTML, source metadata and original dates retained.
- Editable Lexical article text, source-image and YouTube-video blocks.
- Original CSV snapshots, normalized JSON and source audit are in the CMS folder.
- Type checks, build, eight integration tests, migration rollback/reapply and
  browser admin checks passed on an isolated branch. Browser checks verified
  saving edits while retaining draft state and blocking public access to drafts.
- Automatic database schema push is disabled (`push: false`). Keep it disabled.

The replacement website still renders product/framework cards from its JSON.
Editing Payload does not yet update that website. Payload has only been run
locally; public CMS hosting and persistent upload storage are not configured.

## Before leaving this computer

1. Transfer `spartacus-cms/.env` securely using a password manager or encrypted
   file transfer. It contains `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`
   (direct), and `PAYLOAD_SECRET`. **Keep the same Payload secret**; do not generate
   a replacement simply because the computer changes. Never put this file in Git,
   a chat message or an unencrypted handover attachment.
2. Ensure access to GitHub and the existing Neon organisation on the other
   computer. Know the permanent Payload admin login, stored privately.
3. Transfer this handover file if it is not yet on GitHub. The CSV sources are
   already committed inside `spartacus-cms/migration-sources/`; the originals in
   Downloads do not need to be transferred separately.
4. Do not transfer `node_modules`, `.next`, browser downloads, CLI cache, local
   server logs or Neon OAuth sessions. Reinstall/re-authenticate as necessary.
   There were no local uploaded media files at handover.

Neon holds the actual database independently of either computer. No database dump
or manual reimport is needed. A local server does not move with the repository.

## On the other computer

Clone/pull the repository and verify the expected commit and a clean working tree.
Use Node compatible with `spartacus-cms/package.json`: `^22.23.4 || >=24.22.1`.
This work was tested with Node 25.8.1. Use npm and the committed package lock.

Restore the real environment file securely into `spartacus-cms/.env`, not at the
repository root. The `.env.example` contains placeholders only. Restrict the real
file to the owner (`chmod 600 spartacus-cms/.env` on macOS/Linux), and confirm
`git check-ignore spartacus-cms/.env` succeeds without displaying its contents.

From the repository root:

```sh
cd spartacus-cms
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

Open `http://127.0.0.1:3100/admin` and sign in using the existing admin account.
Do not create a second account. Verify Products (5), Frameworks (7), Posts (5
drafts) and Blog Categories (3). If first-user setup appears, stop and verify the
database target rather than creating an account in a different database.

Migrations and imports are already applied. **Do not rerun initial setup, reset,
fresh, refresh or rollback commands against production.** Use the direct URL for
future reviewed migrations; use the pooled URL for normal application traffic.

## Agent tooling and tests

Project Neon skills are in `.agents/skills/`. OAuth MCP configuration is in
`.codex/config.toml`, pinned to the existing project. Trust the cloned project as
appropriate and restart/reopen Codex if needed to load it. Neon OAuth sign-in is
computer-specific. Re-authenticate; do not copy tokens. CLI was run from a
temporary npm cache, so its old absolute path is not portable. Follow the Neon
skill to install/check the CLI on the new machine. No editor integration is needed.

The prior test branch `payload-initial-test-20261027135429` was configured to
expire after roughly 24 hours. Its URL is in an ignored local environment file.
**Create a fresh isolated branch for tomorrow's tests**; do not assume that branch
or `.env.migration-test.local` is still usable. A fresh clone of production also
contains the permanent admin: tests must create their own temporary admin using
authenticated/local tooling, not assume first-user registration is available.

Integration tests require the process `DATABASE_URL` to match the new isolated
connection in `.env.migration-test.local`. Inject that URL privately and retain
`PAYLOAD_SECRET` without displaying it. Never run write tests with production
credentials. Test fixtures use unique paths/source keys and clean up their records.

The template `npm test` / Playwright configuration still assumes pnpm and port
3000. The successful browser checks used Chromium and isolated production builds
on port 3101 with temporary accounts, then cleaned them up. Do not claim the
template end-to-end command is verified. Recreate browser tooling as needed.
Lint passes with unused-variable warnings in template/generated migration files.

## Next work

1. Review the five draft articles with the user; keep them unpublished meanwhile.
2. Back up/migrate the 12 unique blog media URLs into independent persistent
   storage. They currently point to Webflow CDN; URL preservation is not an asset
   backup. Inline image/video blocks retain their original URLs and order; source
   wrapper CSS is retained only in the original HTML. Video playback is untested.
3. Confirm the real article URL prefix before building replacement routes.
4. Decide public CMS hosting and persistent uploads; configure secrets privately.
   No hosting provider for Payload has been selected/configured.
5. Connect the replacement website to Payload and implement article rendering,
   including safe image/video block rendering, without changing the Webflow site.
6. Review Netlify publish/build settings before pushing any hosting changes.

## Prompt to resume in a new chat

> Continue the Spartacus migration in this repository. Read HANDOVER.md,
> README.md and spartacus-cms/BLOG-MIGRATION.md, then inspect current state.
> Never modify the existing Webflow website or print credentials. Reuse the
> existing Neon production project and permanent admin. All five blog posts must
> stay draft. Verify local setup first, then help me review the drafts and plan
> independent media storage one step at a time. Do not run tests against
> production or push changes that could trigger Netlify without checking scope.
