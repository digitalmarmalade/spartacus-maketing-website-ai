"""Restore framework card lists using exported markup; omit draft records."""
import json
from render_products import ROOT, main

PATTERN = r'class="[^"]*(?:card-navigation frameworks|is-framewoks w-inline-block|is-frameworks w-inline-block)'

if __name__ == '__main__':
    records = json.loads((ROOT / 'content/frameworks.json').read_text())
    published = sorted((record for record in records if not record['draft']), key=lambda record: record['order'])
    main(published, PATTERN, 'framework')
