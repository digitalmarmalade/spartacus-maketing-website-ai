# spartacus-maketing-website-ai
Exploring how move existing designs and code from Webflow to Figma and own hosting

Product and framework cards are currently generated from JSON, before CMS integration.
After editing their content, regenerate the HTML and commit both data and HTML:

```sh
python3 scripts/render_products.py
python3 scripts/render_frameworks.py
```

Framework records marked `draft: true` are excluded from generated card lists.
Existing static pages and manually authored navigation links are independent of
these records; a draft card does not hide a static page or its footer link.

## Local website and CMS news

Start Payload in one terminal:

```sh
cd spartacus-cms
npm run dev -- --hostname 127.0.0.1 --port 3100
```

From the repository root, start the website in another terminal:

```sh
python3 scripts/serve_website.py
```

Open http://127.0.0.1:8080/news.html. The preview server proxies anonymous,
read-only requests to Payload; no database credentials are exposed to the browser.
The news listing, category filters, article body and related articles use published
posts. Drafts stay private. Article links currently use
`detail_post.html?slug=example`; final public URL structure is still undecided.
Refresh the website after saving CMS changes. An empty list is expected while
all posts remain drafts. CMS images still use their original external URLs.

This connection is local only. Production hosting needs an equivalent `/cms-api`
proxy, or an explicit `cms-api` meta tag with a hosted API URL and appropriate
CORS configuration. Never point a publicly deployed page at localhost.
