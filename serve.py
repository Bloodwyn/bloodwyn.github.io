#!/usr/bin/env python3
import http.server, webbrowser, os
from pathlib import Path

PORT = 8080
ROOT = Path(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        result = Path(super().translate_path(path))
        if not result.is_file() and not result.suffix:
            candidate = result.with_suffix('.html')
            if candidate.exists():
                return str(candidate)
        return str(result)

    def log_message(self, fmt, *args):
        pass  # silence request log

os.chdir(ROOT)
webbrowser.open(f"http://localhost:{PORT}/publications")
server = http.server.HTTPServer(("localhost", PORT), Handler)
server.serve_forever()
