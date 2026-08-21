"""Startup runner script for Piazza-Lite server."""

import argparse
import os
import sys

# Ensure default database path if not explicitly provided
DEFAULT_DB_PATH = r"E:\_se4nchoi\BambooChatData\chat.db"
if "CLASSROOM_DB_PATH" not in os.environ:
    if os.path.exists(DEFAULT_DB_PATH):
        os.environ["CLASSROOM_DB_PATH"] = DEFAULT_DB_PATH
    else:
        # Fallback to local data directory
        local_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "classroom.db"))
        os.environ["CLASSROOM_DB_PATH"] = local_db

import uvicorn


def main():
    parser = argparse.ArgumentParser(description="Start Intel7 Piazza-Lite Forum Server")
    parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8100, help="Bind port (default: 8100)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")

    args = parser.parse_args()

    db_path = os.environ.get("CLASSROOM_DB_PATH")
    print("=" * 60)
    print("  Starting Intel7 Piazza-Lite Application")
    print(f"  - Database: {db_path}")
    print(f"  - Server:   http://{args.host}:{args.port}")
    print(f"  - Web UI:   http://127.0.0.1:{args.port}/")
    print(f"  - API Docs: http://127.0.0.1:{args.port}/docs")
    print("=" * 60)

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
