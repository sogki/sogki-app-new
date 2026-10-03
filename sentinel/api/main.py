from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Allow `uvicorn api.main:app` from the sentinel/ directory.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.core.config import get_settings
from api.core.database import init_db
from api.core.keys_loader import load_auth_keys_from_db
from api.core.logging import configure_logging, get_logger
from api.routes.api import router as api_router
from api.routes.tools import router as tools_router

configure_logging()
logger = get_logger("main")
settings = get_settings()

app = FastAPI(
    title="Sentinel (Citadel)",
    description="Private passive security assessment API — single-user lab tool. Deploy codename: citadel.",
    version=settings.app_version,
    docs_url=None,
    redoc_url=None,
)

# Admin UI origins only — not a public anonymous API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.sentinel_cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router)
app.include_router(tools_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    load_auth_keys_from_db(settings)
    logger.info(
        "sentinel_started codename=%s version=%s",
        settings.deploy_codename,
        settings.app_version,
    )


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "sentinel",
        "codename": settings.deploy_codename,
        "version": settings.app_version,
    }
