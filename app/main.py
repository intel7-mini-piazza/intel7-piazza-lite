"""FastAPI application entrypoint for Piazza-Lite forum backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("piazza-lite")


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

# Mount API routes
app.include_router(router)
