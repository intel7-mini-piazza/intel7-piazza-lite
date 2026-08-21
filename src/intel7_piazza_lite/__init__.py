"""Bamboo-Stack (대나무지식인) application package."""

def main() -> None:
    """CLI entrypoint to run Bamboo-Stack (대나무지식인) server."""
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8100, reload=False)


if __name__ == "__main__":
    main()
