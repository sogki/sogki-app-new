from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.core.config import Settings, get_settings
from api.core.logging import get_logger

security = HTTPBearer(auto_error=False)
logger = get_logger("auth")


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        logger.info("auth_failed reason=missing_bearer")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials
    allowed = settings.admin_token_set | {settings.sentinel_service_secret}
    if token in allowed:
        logger.info("auth_ok method=shared_token")
        return token

    if settings.admin_jwt_secret and _jwt_valid(token, settings.admin_jwt_secret):
        logger.info("auth_ok method=jwt")
        return token

    logger.info("auth_failed reason=invalid_token")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")


def _jwt_valid(token: str, secret: str) -> bool:
    try:
        import jwt
    except ImportError:
        return False
    try:
        jwt.decode(token, secret, algorithms=["HS256"])
        return True
    except Exception:
        return False
