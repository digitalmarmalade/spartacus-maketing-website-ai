# Blog migration

The supplied Webflow CSVs contain three categories and five posts in one locale.
All exported items were marked published. The user explicitly chose to migrate
all five posts as drafts for editorial review. Category publication states are
preserved; Posts remain inaccessible to public requests until explicitly published.

Production import completed: three categories and five draft posts. The local
CMS at http://127.0.0.1:3100/admin is connected to Neon production. All eight
integration tests, migration rollback, build, type checks and browser checks
passed. Existing Products, Frameworks and the permanent admin are preserved.

## Preserved sources

- `migration-sources/blog-categories.csv` and `blog-posts.csv`: original CSV copies.
- `migration-data/blog.json`: normalized import records; every post is draft.
- `migration-audits/blog-source-audit.json`: source hashes, fields, counts and body inventory.

There are no duplicate source IDs/slugs, invalid dates or unresolved category
references. Categories use semicolon-separated slugs, resolved before importing.
The five article titles concern content management systems, including a 2023
platform roundup. Treat these as sample content pending editorial approval.

## Schema and import

`BlogCategories` preserves names, slugs, descriptions, colors, icon URLs and source
metadata. `Posts` preserves titles, slugs, excerpts, featured flags, colors, image
URLs, category relationships and original HTML. Original created/updated/published
timestamps are retained separately from Payload timestamps. `publishedAt` is left
unset because posts are deliberately unpublished. Source identity combines locale
and item ID; repeat imports skip existing records, including editor changes.
Private source fields and raw HTML require an authenticated user. Writes require
CMS authentication. New posts and categories default to draft.

Run `python3 scripts/prepare-blog.py` from the CMS directory to regenerate normalized
records. `npm run import:blog` previews missing records; adding `-- --apply` creates
missing categories and draft posts. Apply the reviewed schema migration with a
direct Neon connection before importing. Automatic schema push stays disabled.
Use the isolated branch for testing, never the production environment file.

## Conversion and limitations

Body text, headings, paragraphs, bold text, quotes and ordered/unordered lists are
converted into editable Lexical content. Source images and YouTube video embeds
become editable `sourceImage` and `sourceVideo` blocks in their original sequence.
Unsupported tags, unsafe HTML, unexpected image hosts or unsupported iframe URLs
stop conversion before import. Original HTML remains available to authenticated
editors for comparison; it is never rendered directly.

There are 12 unique media URLs, all hosted on the source Webflow CDN. The importer
retains those references; it does not download or independently store the media.
Image blocks preserve source alt text and dimensions. Source figure styles and
responsive video wrapper CSS remain only in the preserved HTML; this conversion
is structural, not a pixel-exact reproduction. A frontend renderer will need
explicit image/video block support. Video playback has not been tested.

Blog URL prefixes remain unverified. The CMS preserves slugs without inventing
website routes. Authors and SEO fields do not exist in these CSVs and are not
invented. No article routes or static website rendering are changed.

## Validation and remaining work

Integration tests cover source text, structure, embeds, category relationships,
source metadata/timestamps, draft visibility, restricted writes, repeat imports
and private source fields. Migration and rollback are tested on the isolated
branch before production. Browser checks cover list/editor loading, the media
blocks and saving while retaining draft status.

Next: review the five drafts, copy the 12 media assets to independent storage,
confirm intended article routes and build the replacement website rendering.
The current Webflow site, static HTML, JSON content and existing rendering scripts
are unchanged. No code has been committed or deployed to Netlify.
