"""Piazza-Lite application package."""

def main() -> None:
    """CLI entrypoint to run Piazza-Lite server."""
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8100, reload=False)


if __name__ == "__main__":
    main()
