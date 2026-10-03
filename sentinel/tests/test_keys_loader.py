from api.core.config import Settings
from api.core.keys_loader import apply_auth_key_map


def test_apply_auth_key_map_merges_dev_token_and_jwt():
    settings = Settings(
        sentinel_admin_tokens="env-token",
        admin_jwt_secret="",
        database_url="",
    )
    apply_auth_key_map(
        settings,
        {
            "ADMIN_DEV_TOKEN": "db-dev-token",
            "ADMIN_JWT_SECRET": "jwt-secret-from-db-32chars!!",
            "SENTINEL_ADMIN_TOKENS": "extra-a,extra-b",
        },
    )
    assert "env-token" in settings.admin_token_set
    assert "db-dev-token" in settings.admin_token_set
    assert "extra-a" in settings.admin_token_set
    assert "extra-b" in settings.admin_token_set
    assert settings.admin_jwt_secret == "jwt-secret-from-db-32chars!!"


def test_apply_auth_key_map_ignores_placeholders():
    settings = Settings(
        sentinel_admin_tokens="keep-me",
        admin_jwt_secret="already-set",
        database_url="",
    )
    apply_auth_key_map(
        settings,
        {
            "ADMIN_DEV_TOKEN": "REPLACE_ME",
            "ADMIN_JWT_SECRET": "CHANGE_ME_GENERATE_RANDOM_32_CHARS",
        },
    )
    assert settings.admin_token_set == {"keep-me"}
    assert settings.admin_jwt_secret == "already-set"
