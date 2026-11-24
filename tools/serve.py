#!/usr/bin/env python3
"""Local static server for previews and E2E tests.

The stdlib default listen backlog is 5, but the question screen fetches six
JSON files at once. Under that burst macOS can reset a connection
(net::ERR_CONNECTION_RESET), so raise the backlog before starting.
"""

import argparse
import errno
import http.server
import socketserver
import time


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Omoi directory over HTTP.")
    parser.add_argument("port", nargs="?", type=int, default=4173)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()

    class Server(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        allow_reuse_port = True
        request_queue_size = 128

    for attempt in range(50):
        try:
            httpd = Server((args.bind, args.port), http.server.SimpleHTTPRequestHandler)
            break
        except OSError as error:
            # The previous dev server may still be releasing the port.
            if error.errno != errno.EADDRINUSE or attempt == 49:
                raise
            time.sleep(0.1)
    with httpd:
        print(f"Serving HTTP on {args.bind} port {args.port} ...", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
