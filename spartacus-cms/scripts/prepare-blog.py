"""Normalize preserved Webflow CSVs without changing their content or publication state."""
import csv
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def records(name):
    with (ROOT / 'migration-sources' / name).open(encoding='utf-8-sig', newline='') as handle:
        rows = list(csv.DictReader(handle))
    for field in ['Item ID', 'Slug']:
        if len({row[field] for row in rows}) != len(rows):
            raise ValueError('Duplicate ' + field)
    return rows


def flag(value):
    if value not in ['true', 'false']:
        raise ValueError('Invalid boolean')
    return value == 'true'


def date(value):
    if not value:
        return None
    return datetime.strptime(re.sub(r' \(.*\)$', '', value), '%a %b %d %Y %H:%M:%S GMT%z').isoformat()


def source(row):
    return {
        'sourceKey': row['Locale ID'] + ':' + row['Item ID'],
        'slug': row['Slug'],
        'sourceCreatedAt': date(row['Created On']),
        'sourceUpdatedAt': date(row['Updated On']),
        'sourcePublishedAt': date(row['Published On']),
        'sourceMetadata': row,
    }


categories = [{**source(r), 'name': r['Name'], 'description': r['Description'],
               'iconURL': r['Icon'], 'color': r['Color'],
               'status': 'draft' if flag(r['Draft']) or flag(r['Archived']) else 'published'}
              for r in records('blog-categories.csv')]
posts = [{**source(r), 'title': r['Name'], 'excerpt': r['Post Summary'],
          'sourceHTML': r['Post Body'], 'mainImageURL': r['Main Image'],
          'thumbnailImageURL': r['Thumbnail image'], 'featured': flag(r['Featured?']),
          'color': r['Color'], 'status': 'draft',
          'categorySlugs': [s.strip() for s in r['Categories'].split(';') if s.strip()]}
         for r in records('blog-posts.csv')]
known = {r['slug'] for r in categories}
for post in posts:
    if not post['title'] or not post['sourceHTML'] or any(s not in known for s in post['categorySlugs']):
        raise ValueError('Incomplete post or unresolved category')
out = ROOT / 'migration-data' / 'blog.json'
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({'categories': categories, 'posts': posts}, indent=2, ensure_ascii=False) + '\n')
print('Prepared %d categories and %d posts; every post is draft.' % (len(categories), len(posts)))
