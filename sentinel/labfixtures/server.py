#!/usr/bin/env python3
"""Local Sentinel lab fixture server — safe demo targets on 127.0.0.1:8791."""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import os

HOST = os.environ.get("SENTINEL_LAB_HOST", "0.0.0.0")
PORT = int(os.environ.get("SENTINEL_LAB_PORT", "8791"))

HTML = """<!doctype html>
<html>
<head>
  <title>Sentinel Lab Fixture</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
  <script src="https://example.com/third-party.js"></script>
</head>
<body>
  <h1>Sentinel Lab Fixture</h1>
  <img src="http://example.com/mixed.png" alt="mixed">
  <p>Use this host as an allowlisted Sentinel target for demos.</p>
</body>
</html>
"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes, extra: dict[str, str] | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Intentionally weak / interesting headers for labs
        self.send_header("Server", "SentinelLabFixture/1.0")
        self.send_header("X-Powered-By", "lab-fixture")
        self.send_header("Access-Control-Allow-Origin", "*")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/secure"):
            self._send(
                200,
                HTML.encode(),
                {
                    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "DENY",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "Permissions-Policy": "camera=(), microphone=()",
                    "Set-Cookie": "lab=1; Path=/; HttpOnly; Secure; SameSite=Lax",
                },
            )
            return
        if self.path.startswith("/robots.txt"):
            body = b"User-agent: *\nDisallow: /admin\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self._send(200, HTML.encode())

    def do_HEAD(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Allow", "GET, HEAD, OPTIONS")
        self.end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Allow", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Sentinel lab fixtures on http://{HOST}:{PORT}")
    print("Add target: http://127.0.0.1:8791/")
    print("Hardened variant: http://127.0.0.1:8791/secure")
    server.serve_forever()


if __name__ == "__main__":
    main()
