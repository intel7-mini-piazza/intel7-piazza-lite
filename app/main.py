"""FastAPI application entrypoint for Piazza-Lite forum backend."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("piazza-lite")

# Resolve frontend directory relative to application file
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan handler."""
    logger.info("Initializing Piazza-Lite backend service...")
    try:
        init_db()
        logger.info("Database verified and Piazza-Lite tables initialized successfully.")
    except Exception as e:
        logger.error(f"FATAL: Database initialization failed: {e}")
        raise

    if not os.path.isdir(FRONTEND_DIR):
        error_msg = f"FATAL: Frontend directory not found at '{FRONTEND_DIR}'."
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    yield
    logger.info("Shutting down Piazza-Lite backend service.")


app = FastAPI(
    title="Intel7 Piazza-Lite API",
    description="Classroom Q&A Forum Backend sharing user accounts with BambooChat.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local and classroom LAN clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount API routes FIRST so /api/* and /docs are never shadowed
app.include_router(router)

# 2. Mount static frontend handling at "/" for index.html, ask.html, question.html, css/, js/
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory '{FRONTEND_DIR}' does not exist at module load time.")
