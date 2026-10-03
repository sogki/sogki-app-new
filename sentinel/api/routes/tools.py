from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.core.auth import require_admin
from api.core.database import get_db
from api.core.logging import get_logger
from api.services import tools as tool_service

router = APIRouter(prefix="/api/tools", dependencies=[Depends(require_admin)])
logger = get_logger("tools")


class ToolRequest(BaseModel):
    target_id: str = Field(min_length=1)
    url: str | None = None


class DiffRequest(BaseModel):
    scan_a: str = Field(min_length=1)
    scan_b: str = Field(min_length=1)


def _run(name: str, fn, body: ToolRequest, db: Session) -> dict:
    try:
        result = fn(db, target_id=body.target_id, url=body.url)
        logger.info("%s ok target_id=%s", name, body.target_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/headers")
def headers_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_headers", tool_service.tool_headers, body, db)


@router.post("/tls")
def tls_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_tls", tool_service.tool_tls, body, db)


@router.post("/redirects")
def redirects_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_redirects", tool_service.tool_redirects, body, db)


@router.post("/disclosure")
def disclosure_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_disclosure", tool_service.tool_disclosure, body, db)


@router.post("/dns")
def dns_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_dns", tool_service.tool_dns, body, db)


@router.post("/email-auth")
def email_auth_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_email_auth", tool_service.tool_email_auth, body, db)


@router.post("/csp")
def csp_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_csp", tool_service.tool_csp, body, db)


@router.post("/cookies")
def cookies_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_cookies", tool_service.tool_cookies, body, db)


@router.post("/methods")
def methods_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_methods", tool_service.tool_methods, body, db)


@router.post("/assets")
def assets_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_assets", tool_service.tool_assets, body, db)


@router.post("/hsts-preload")
def hsts_lab(body: ToolRequest, db: Session = Depends(get_db)) -> dict:
    return _run("tool_hsts_preload", tool_service.tool_hsts_preload, body, db)


@router.post("/diff")
def diff_lab(body: DiffRequest, db: Session = Depends(get_db)) -> dict:
    try:
        result = tool_service.tool_diff(db, scan_a=body.scan_a, scan_b=body.scan_b)
        logger.info("tool_diff ok")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
