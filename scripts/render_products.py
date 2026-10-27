"""Populate exported Webflow product lists from content/products.json.

Run from any directory with: python3 scripts/render_products.py
Only product collection wrappers are changed; original card markup is reused.
"""
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = sorted(json.loads((ROOT / 'content/products.json').read_text()), key=lambda p: p['order'])


def div_end(source, start):
    depth = 0
    for tag in re.finditer(r'</?div\b[^>]*>', source[start:]):
        depth += -1 if tag.group().startswith('</') else 1
        if depth == 0:
            return start + tag.end()
    raise ValueError('Unbalanced collection markup')


def render_wrapper(wrapper, items=PRODUCTS, pattern=r'class="[^"]*(?:card-navigation products|is-products w-inline-block)'):
    if not re.search(pattern, wrapper):
        return wrapper
    list_match = re.search(r'<div\b[^>]*class="[^"]*\bw-dyn-items\b[^>]*>', wrapper)
    item_match = re.search(r'<div\b[^>]*class="[^"]*\bw-dyn-item\b[^"]*"[^>]*>', wrapper)
    if not list_match or not item_match:
        raise ValueError('Product collection template missing')
    list_end = div_end(wrapper, list_match.start())
    item_end = div_end(wrapper, item_match.start())
    template = wrapper[item_match.start():item_end]
    cards = []
    for product in items:
        card = re.sub(r'(<a\b[^>]*\bhref=")[^"]*', lambda m: m[1] + product['path'], template, count=1)
        card = re.sub(r'(<h4\b[^>]*>).*?(</h4>)', lambda m: m[1] + html.escape(product['name']) + m[2], card, count=1, flags=re.S)
        card = re.sub(r'(<p\b[^>]*>).*?(</p>)', lambda m: m[1] + html.escape(product['description']) + m[2], card, count=1, flags=re.S)
        card = card.replace(' w-dyn-bind-empty', '')
        # Exported grid IDs are shared by cloned templates; remove duplicate IDs.
        card = re.sub(r'\s+id="[^"]*"', '', card)
        cards.append(card)
    rendered = wrapper[:list_match.end()] + '\n' + '\n'.join(cards) + '\n</div>' + wrapper[list_end:]
    empty = re.search(r'<div\b[^>]*class="w-dyn-empty"[^>]*>', rendered)
    if empty:
        rendered = rendered[:empty.start()] + rendered[div_end(rendered, empty.start()):]
    return rendered


def main(items=PRODUCTS, pattern=r'class="[^"]*(?:card-navigation products|is-products w-inline-block)', label='product'):
    count = 0
    for path in sorted(ROOT.rglob('*.html')):
        source = path.read_text()
        wrappers = list(re.finditer(r'<div\b[^>]*class="[^"]*\bw-dyn-list\b[^"]*"[^>]*>', source))
        result = source
        for match in reversed(wrappers):
            end = div_end(source, match.start())
            replacement = render_wrapper(source[match.start():end], items, pattern)
            result = result[:match.start()] + replacement + result[end:]
        if result != source:
            path.write_text(result)
            count += 1
    print('Updated %s collections in %d pages.' % (label, count))


if __name__ == '__main__':
    main()
