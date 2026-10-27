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
