"""Load Sentinel auth secrets from Supabase public.keys when DATABASE_URL is set."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import bindparam, create_engine, text

from api.core.logging import get_logger

if TYPE_CHECKING:
    from api.core.config import Settings

logger = get_logger("keys_loader")

AUTH_KEY_NAMES = (
    "ADMIN_DEV_TOKEN",
    "ADMIN_JWT_SECRET",
    "SENTINEL_ADMIN_TOKENS",
)

_PLACEHOLDER_SECRETS = frozenset(
    {
        "",
        "REPLACE_ME",
        "CHANGE_ME_GENERATE_RANDOM_32_CHARS",
        "change-me-to-a-long-random-string",
        "dev-admin-token",
    }
)


def apply_auth_key_map(settings: Settings, key_map: dict[str, str]) -> None:
    """Merge a key→value map into settings (used by DB loader and tests)."""
    tokens: list[str] = []
    if settings.sentinel_admin_tokens.strip():
        tokens.extend(
            t.strip() for t in settings.sentinel_admin_tokens.split(",") if t.strip()
        )

    if key_map.get("SENTINEL_ADMIN_TOKENS"):
        tokens.extend(
            t.strip()
            for t in key_map["SENTINEL_ADMIN_TOKENS"].split(",")
            if t.strip()
        )

    dev = key_map.get("ADMIN_DEV_TOKEN")
    if dev and dev not in _PLACEHOLDER_SECRETS and dev not in tokens:
        tokens.append(dev)

    seen: set[str] = set()
    unique_tokens: list[str] = []
    for t in tokens:
        if t in seen or t in _PLACEHOLDER_SECRETS:
            continue
        seen.add(t)
        unique_tokens.append(t)

    # Keep env defaults if DB had nothing useful
    if unique_tokens:
        settings.sentinel_admin_tokens = ",".join(unique_tokens)

    jwt_secret = key_map.get("ADMIN_JWT_SECRET", "")
    if jwt_secret and jwt_secret not in _PLACEHOLDER_SECRETS:
        settings.admin_jwt_secret = jwt_secret


def load_auth_keys_from_db(settings: Settings) -> None:
    """Merge private auth keys from `keys` into settings in-place.

    No-op when DATABASE_URL is empty (SQLite / offline). Env values remain
    as fallbacks; DB values override when present and non-empty.
    """
    db_url = settings.database_url.strip()
    if not db_url:
        return

    engine = create_engine(db_url, pool_pre_ping=True)
    try:
        stmt = text("SELECT key, value FROM keys WHERE key IN :names").bindparams(
            bindparam("names", expanding=True)
        )
        with engine.connect() as conn:
            rows = conn.execute(stmt, {"names": list(AUTH_KEY_NAMES)}).mappings().all()
    except Exception as exc:
        logger.info("keys_load_failed error=%s", type(exc).__name__)
        return
    finally:
        engine.dispose()

    key_map = {
        str(row["key"]): str(row["value"]).strip()
        for row in rows
        if row.get("value") is not None and str(row["value"]).strip()
    }
    if not key_map:
        logger.info("keys_load_empty")
        return

    apply_auth_key_map(settings, key_map)
    logger.info(
        "keys_loaded tokens=%s jwt=%s",
        len(settings.admin_token_set),
        "yes" if settings.admin_jwt_secret else "no",
    )
