"""Local website preview with an anonymous, read-only Payload proxy."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlsplit, unquote
from urllib.error import HTTPError, URLError
import json

ROOT = Path(__file__).resolve().parent.parent

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path.startswith('/cms-api/'):
            if url.path not in ('/cms-api/posts', '/cms-api/blog-categories'):
                self.send_error(404)
                return
            # Never forward browser cookies or authorization to Payload.
            request = Request('http://127.0.0.1:3100/api/' + url.path.split('/')[-1] + '?' + url.query,
                              headers={'Accept': 'application/json'})
            try:
                with urlopen(request, timeout=20) as response:
                    body = response.read()
                status = 200
            except (HTTPError, URLError, TimeoutError):
                status, body = 502, json.dumps({'error': 'CMS unavailable'}).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return
        target = (ROOT / unquote(url.path).lstrip('/')).resolve()
        public = {'css', 'js', 'images', 'platform', 'products', 'frameworks', 'resources'}
        try:
            relative = target.relative_to(ROOT)
        except ValueError:
            self.send_error(404)
            return
        if any(part.startswith('.') for part in relative.parts) or not (
            target == ROOT or (len(relative.parts) == 1 and target.suffix == '.html')
            or (relative.parts and relative.parts[0] in public and target.is_file())
        ):
            self.send_error(404)
            return
        if target == ROOT:
            self.path = '/index.html'
        super().do_GET()

if __name__ == '__main__':
    print('Website: http://127.0.0.1:8080', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8080), Preview).serve_forever()
